import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The website's progress bar: an electric-blue → sky gradient on a faint track. */
export function ProgressBar({ progress, height = 10 }: { progress: number; height?: number }) {
  const theme = useTheme();
  const value = useSharedValue(progress);

  useEffect(() => {
    value.set(withSpring(Math.min(Math.max(progress, 0), 1), { damping: 18, stiffness: 140 }));
  }, [progress, value]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${value.get() * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[styles.track, { height, backgroundColor: theme.surfaceAlt }]}>
      <Animated.View style={[styles.fill, fillStyle]}>
        <LinearGradient
          colors={[theme.primary, theme.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill, overflow: 'hidden' },
});
