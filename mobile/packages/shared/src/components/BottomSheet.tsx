import React, { useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  View,
  StyleSheet,
  ViewStyle,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS } from '../constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  initialSnapIndex?: number;
  showHandle?: boolean;
  closeOnBackdrop?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  snapPoints = [SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT * 0.85],
  initialSnapIndex = 0,
  showHandle = true,
  closeOnBackdrop = true,
  style,
  testID,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const currentSnapIndex = useRef(initialSnapIndex);

  const targetSnapPoint = snapPoints[initialSnapIndex] || snapPoints[0];

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        const minY = -(SCREEN_HEIGHT - snapPoints[snapPoints.length - 1]);
        const maxY = 0;
        const newY = gestureState.dy + (translateY as any)._value;
        const clampedY = Math.max(minY, Math.min(maxY, newY));
        translateY.setValue(clampedY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentY = (translateY as any)._value;
        const velocity = gestureState.vy;

        let targetIndex = currentSnapIndex.current;

        if (velocity < -0.5 || gestureState.dy < -50) {
          targetIndex = Math.min(currentSnapIndex.current + 1, snapPoints.length - 1);
        } else if (velocity > 0.5 || gestureState.dy > 50) {
          targetIndex = Math.max(currentSnapIndex.current - 1, 0);
          if (targetIndex === 0 && gestureState.dy > 100) {
            onClose();
            return;
          }
        }

        currentSnapIndex.current = targetIndex;
        const targetY = -(SCREEN_HEIGHT - snapPoints[targetIndex]);

        Animated.spring(translateY, {
          toValue: targetY,
          useNativeDriver: true,
          speed: 40,
          bounciness: 6,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      currentSnapIndex.current = initialSnapIndex;
      const targetY = -(SCREEN_HEIGHT - targetSnapPoint);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: targetY,
          useNativeDriver: true,
          speed: 40,
          bounciness: 6,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      testID={testID}
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={closeOnBackdrop ? onClose : undefined}
      >
        <Animated.View
          style={[styles.backdropFill, { opacity: backdropOpacity }]}
        />
      </Pressable>

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
          },
          style,
        ]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          {showHandle && (
            <View style={styles.handleRow}>
              <View
                style={[styles.handle, { backgroundColor: colors.textMuted }]}
              />
            </View>
          )}

          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  content: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING['2xl'],
    minHeight: 200,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});
