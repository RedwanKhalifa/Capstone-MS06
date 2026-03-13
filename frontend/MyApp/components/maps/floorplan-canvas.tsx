import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Image as RNImage, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import type { AnchorPoint } from '@/types/fingerprint';

const FOLLOW_ZOOM = 2.5;

type Props = {
  imageSource: any;
  points: AnchorPoint[];
  liveDot?: { xNorm: number; yNorm: number } | null;
  destinationDot?: { xNorm: number; yNorm: number } | null;
  selectedPointId?: string | null;
  canAddPoint?: boolean;
  onAddPoint?: (xNorm: number, yNorm: number) => void;
  dragPointId?: string | null;
  onDragPoint?: (pointId: string, xNorm: number, yNorm: number) => void;
  /** When true the camera smoothly tracks liveDot as it moves. */
  followDot?: boolean;
  /** Called when the user manually pans or pinches, breaking auto-follow. */
  onUserInteraction?: () => void;
  /** Increment to trigger an animated re-center on liveDot. */
  recenterTrigger?: number;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function FloorplanCanvas({
  imageSource,
  points,
  selectedPointId,
  liveDot,
  destinationDot,
  canAddPoint = false,
  onAddPoint,
  dragPointId,
  onDragPoint,
  followDot = false,
  onUserInteraction,
  recenterTrigger,
}: Props) {
  const [size, setSize] = useState({ w: 1, h: 1 });
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  const asset = RNImage.resolveAssetSource(imageSource);
  const imageRatio = asset.width / asset.height;
  const viewRatio = size.w / size.h;
  const baseW = viewRatio > imageRatio ? size.h * imageRatio : size.w;
  const baseH = viewRatio > imageRatio ? size.h : size.w / imageRatio;
  const maxScale = Math.max(1, Math.min(8, Math.min(asset.width / baseW, asset.height / baseH)));

  // ── Camera follow: animate to keep liveDot centered when followDot is on ──
  useEffect(() => {
    if (!liveDot || !followDot || size.w <= 1) return;
    const targetZoom = Math.min(maxScale, Math.max(FOLLOW_ZOOM, scale.value));
    const targetTx = -(liveDot.xNorm * baseW - baseW / 2) * targetZoom;
    const targetTy = -(liveDot.yNorm * baseH - baseH / 2) * targetZoom;
    scale.value = withTiming(targetZoom, { duration: 350 });
    tx.value = withTiming(targetTx, { duration: 350 });
    ty.value = withTiming(targetTy, { duration: 350 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveDot?.xNorm, liveDot?.yNorm, followDot, size.w]);

  // ── Recenter trigger: snap back to liveDot with a spring ──
  useEffect(() => {
    if (recenterTrigger == null || !liveDot || size.w <= 1) return;
    const targetZoom = Math.min(maxScale, Math.max(FOLLOW_ZOOM, scale.value));
    const targetTx = -(liveDot.xNorm * baseW - baseW / 2) * targetZoom;
    const targetTy = -(liveDot.yNorm * baseH - baseH / 2) * targetZoom;
    scale.value = withSpring(targetZoom, { damping: 18, stiffness: 160 });
    tx.value = withSpring(targetTx, { damping: 18, stiffness: 160 });
    ty.value = withSpring(targetTy, { damping: 18, stiffness: 160 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterTrigger]);

  const mapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const markerStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 / scale.value }] }));

  const notifyInteraction = () => { if (onUserInteraction) onUserInteraction(); };

  const panMap = Gesture.Pan()
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
      runOnJS(notifyInteraction)();
    })
    .onUpdate((e) => {
      tx.value = startTx.value + e.translationX;
      ty.value = startTy.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
      runOnJS(notifyInteraction)();
    })
    .onUpdate((e) => {
      scale.value = Math.max(0.7, Math.min(maxScale, startScale.value * e.scale));
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
            <ExpoImage
              source={imageSource}
              style={{ width: baseW, height: baseH }}
              contentFit="contain"
              contentPosition="center"
              allowDownscaling={false}
              transition={0}
            />
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
            {destinationDot ? (
              <View style={[styles.markerSlot, { left: destinationDot.xNorm * baseW - 14, top: destinationDot.yNorm * baseH - 14 }]}>
                <Animated.View style={[styles.destinationPin, markerStyle]}>
                  <View style={styles.destinationPinInner} />
                </Animated.View>
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
  destinationPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  destinationPinInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});
