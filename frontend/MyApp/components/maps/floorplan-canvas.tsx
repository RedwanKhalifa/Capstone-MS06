import React, { useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';

import type { AnchorPoint } from '@/types/fingerprint';

type NormalizedPoint = { xNorm: number; yNorm: number };

type Props = {
  imageSource: any;
  points: AnchorPoint[];
  liveDot?: NormalizedPoint | null;
  selectedPointId?: string | null;
  route?: NormalizedPoint[];
  canAddPoint?: boolean;
  onAddPoint?: (xNorm: number, yNorm: number) => void;
  dragPointId?: string | null;
  onDragPoint?: (pointId: string, xNorm: number, yNorm: number) => void;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function FloorplanCanvas({
  imageSource,
  points,
  route,
  selectedPointId,
  liveDot,
  canAddPoint = false,
  onAddPoint,
  dragPointId,
  onDragPoint,
}: Props) {
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  React.useEffect(() => {
    // Some platforms (web) do not support Image.resolveAssetSource.
    // Use Image.getSize when possible to infer aspect ratio.
    if (Image.resolveAssetSource) {
      const asset = Image.resolveAssetSource(imageSource);
      setImageSize({ width: asset.width, height: asset.height });
      return;
    }

    const uri =
      typeof imageSource === 'string'
        ? imageSource
        : typeof imageSource === 'object' && imageSource?.uri
        ? imageSource.uri
        : null;

    if (!uri) return;

    Image.getSize(
      uri,
      (width, height) => setImageSize({ width, height }),
      () => {},
    );
  }, [imageSource]);

  const imageRatio = imageSize.width / imageSize.height;
  const viewRatio = size.w / size.h;
  const baseW = viewRatio > imageRatio ? size.h * imageRatio : size.w;
  const baseH = viewRatio > imageRatio ? size.h : size.w / imageRatio;

  const mapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const markerStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 / scale.value }] }));

  const panMap = Gesture.Pan()
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startTx.value + e.translationX;
      ty.value = startTy.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(0.7, Math.min(5, startScale.value * e.scale));
    });

  const toNorm = (x: number, y: number) => {
    const localX = (x - size.w / 2 - tx.value) / scale.value + baseW / 2;
    const localY = (y - size.h / 2 - ty.value) / scale.value + baseH / 2;
    return { xNorm: clamp(localX / baseW), yNorm: clamp(localY / baseH) };
  };

  const tapAdd = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e, success) => {
      if (!success || !canAddPoint || !onAddPoint) return;
      const p = toNorm(e.x, e.y);
      onAddPoint(p.xNorm, p.yNorm);
    });

  const dragPoint = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      if (!dragPointId || !onDragPoint) return;
      const p = toNorm(e.x, e.y);
      onDragPoint(dragPointId, p.xNorm, p.yNorm);
    });

  const gesture = dragPointId && onDragPoint
    ? Gesture.Simultaneous(pinch, dragPoint)
    : canAddPoint
      ? Gesture.Simultaneous(panMap, pinch, tapAdd)
      : Gesture.Simultaneous(panMap, pinch);

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <View style={styles.root} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={styles.fill}>
          <Animated.View
            style={[
              styles.mapLayer,
              { width: baseW, height: baseH, marginLeft: -baseW / 2, marginTop: -baseH / 2 },
              mapStyle,
            ]}>
            <Image source={imageSource} style={{ width: baseW, height: baseH }} resizeMode="contain" />
            {route && route.length > 1 ? (
              <Svg width={baseW} height={baseH} style={StyleSheet.absoluteFill}>
                <Polyline
                  points={route.map((pt) => `${pt.xNorm * baseW},${pt.yNorm * baseH}`).join(' ')}
                  fill="none"
                  stroke="#2c3ea3"
                  strokeWidth={3}
                />
                <Circle
                  cx={route[0].xNorm * baseW}
                  cy={route[0].yNorm * baseH}
                  r={5}
                  fill="#1d4ed8"
                />
                <Circle
                  cx={route[route.length - 1].xNorm * baseW}
                  cy={route[route.length - 1].yNorm * baseH}
                  r={5}
                  fill="#f3d400"
                />
              </Svg>
            ) : null}
            {points.map((p) => (
              <View key={p.id} style={[styles.markerSlot, { left: p.xNorm * baseW - 9, top: p.yNorm * baseH - 9 }]}>
                <Animated.View style={[styles.marker, p.id === selectedPointId && styles.markerSelected, markerStyle]} />
              </View>
            ))}
            {liveDot ? (
              <View style={[styles.markerSlot, { left: liveDot.xNorm * baseW - 10, top: liveDot.yNorm * baseH - 10 }]}>
                <Animated.View style={[styles.liveDot, markerStyle]} />
              </View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  fill: { ...StyleSheet.absoluteFillObject },
  mapLayer: { position: 'absolute', left: '50%', top: '50%' },
  markerSlot: { position: 'absolute' },
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerSelected: { backgroundColor: '#16a34a' },
  liveDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
});
