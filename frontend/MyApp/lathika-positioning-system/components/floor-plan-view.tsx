import React, { useMemo, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import type { FingerprintPoint } from '@/context/fingerprint-store';

type FloorPlanViewProps = {
  imageSource: ImageSourcePropType;
  points: FingerprintPoint[];
  activePointId?: string | null;
  onPress?: (imageX: number, imageY: number, imageWidth: number, imageHeight: number) => void;
};

type LayoutSize = { width: number; height: number };

const DEFAULT_LAYOUT: LayoutSize = { width: 0, height: 0 };

export default function FloorPlanView({ imageSource, points, activePointId, onPress }: FloorPlanViewProps) {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);

  const imageInfo = useMemo(() => {
    const resolved = Image.resolveAssetSource(imageSource);
    return { width: resolved.width, height: resolved.height };
  }, [imageSource]);

  const fit = useMemo(() => {
    if (!layout.width || !layout.height) {
      return { scale: 1, offsetX: 0, offsetY: 0, width: 0, height: 0 };
    }
    const scale = Math.min(layout.width / imageInfo.width, layout.height / imageInfo.height);
    const width = imageInfo.width * scale;
    const height = imageInfo.height * scale;
    const offsetX = (layout.width - width) / 2;
    const offsetY = (layout.height - height) / 2;
    return { scale, offsetX, offsetY, width, height };
  }, [imageInfo.height, imageInfo.width, layout.height, layout.width]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setLayout({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (!onPress) {
      return;
    }
    const { locationX, locationY } = event.nativeEvent;
    const imageX = (locationX - fit.offsetX) / fit.scale;
    const imageY = (locationY - fit.offsetY) / fit.scale;
    const withinX = imageX >= 0 && imageX <= imageInfo.width;
    const withinY = imageY >= 0 && imageY <= imageInfo.height;
    if (!withinX || !withinY) {
      return;
    }
    onPress(imageX, imageY, imageInfo.width, imageInfo.height);
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Pressable style={styles.pressable} onPress={handlePress}>
        <Image source={imageSource} resizeMode="contain" style={styles.image} />
        {layout.width > 0 && (
          <Svg width={layout.width} height={layout.height} style={styles.overlay}>
            {points.map((point) => {
              const displayX = fit.offsetX + point.xPx * fit.scale;
              const displayY = fit.offsetY + point.yPx * fit.scale;
              const isActive = point.id === activePointId;
              return (
                <React.Fragment key={point.id}>
                  <Circle
                    cx={displayX}
                    cy={displayY}
                    r={isActive ? 10 : 7}
                    fill={isActive ? '#1D4ED8' : '#10B981'}
                    stroke="#0F172A"
                    strokeWidth={isActive ? 2 : 1}
                  />
                  <SvgText
                    x={displayX + 10}
                    y={displayY - 10}
                    fill="#111827"
                    fontSize={12}
                    fontWeight="600"
                  >
                    {point.label}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  pressable: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
