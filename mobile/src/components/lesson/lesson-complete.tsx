import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Reward } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth';

type Props = { reward: Reward; elapsedMs: number; onDone: () => void };

export function LessonComplete({ reward, elapsedMs, onDone }: Props) {
  const theme = useTheme();
  const isGuest = useAuth((s) => s.user?.is_guest ?? false);
  const perfect = reward.accuracy === 1;
  const seconds = Math.round(elapsedMs / 1000);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={styles.hero}>
          <Animated.View
            entering={ZoomIn.springify().damping(12)}
            style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name={perfect ? 'trophy' : 'sparkles'} size={64} color={theme.primary} />
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(150)} style={styles.heroText}>
            <Text variant="display" style={styles.center}>
              {perfect ? 'Flawless!' : 'Lesson complete!'}
            </Text>
            <Text tone="secondary" style={styles.center}>
              {perfect
                ? 'Every question right on the first try.'
                : 'You worked through every question until it clicked.'}
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.delay(300)} style={styles.stats}>
          <Stat icon="flash" tone="xp" value={`+${reward.xp_earned}`} label="XP earned" />
          <Stat icon="locate" tone="accent" value={`${Math.round(reward.accuracy * 100)}%`} label="First-try accuracy" />
          <Stat icon="time-outline" tone="primary" value={time} label="Time" />
        </Animated.View>

        {reward.perfect_bonus > 0 && (
          <Text tone="xp" variant="bodyBold" style={styles.center}>
            Includes +{reward.perfect_bonus} XP perfect-lesson bonus
          </Text>
        )}
        {reward.streak_extended && (
          <Animated.View
            entering={FadeInUp.delay(450)}
            style={[styles.streak, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="flame" size={26} color={theme.streak} />
            <Text variant="bodyBold">
              {reward.streak === 1 ? 'Streak started! Come back tomorrow.' : `${reward.streak} day streak!`}
            </Text>
          </Animated.View>
        )}

        <Button title="Continue" onPress={onDone} style={styles.button} />
        {isGuest && (
          <Button
            title="Save my progress"
            variant="ghost"
            icon="cloud-upload-outline"
            onPress={() => router.replace('/auth/sign-up')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({
  icon,
  tone,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'xp' | 'accent' | 'primary';
  value: string;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name={icon} size={22} color={theme[tone]} />
      <Text variant="title" style={{ color: theme[tone] }}>
        {value}
      </Text>
      <Text variant="caption" tone="secondary" style={styles.center}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', gap: Spacing.four },
  heroText: { gap: Spacing.two },
  badge: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  button: { marginTop: Spacing.two },
});
