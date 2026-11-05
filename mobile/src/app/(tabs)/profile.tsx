import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lastNDays, localDateKey } from '@/lib/dates';
import { useCurrentStreak, useProgress } from '@/store/progress';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProfileScreen() {
  const theme = useTheme();
  const totalXp = useProgress((s) => s.totalXp);
  const lessons = useProgress((s) => s.lessons);
  const xpByDay = useProgress((s) => s.xpByDay);
  const resetProgress = useProgress((s) => s.resetProgress);
  const streak = useCurrentStreak();

  const completed = Object.keys(lessons).length;
  const records = Object.values(lessons);
  const avgAccuracy = records.length
    ? Math.round((records.reduce((sum, r) => sum + r.bestAccuracy, 0) / records.length) * 100)
    : null;

  const days = lastNDays(7);
  const today = localDateKey();
  const maxDayXp = Math.max(10, ...days.map((d) => xpByDay[d] ?? 0));
  const weekXp = days.reduce((sum, d) => sum + (xpByDay[d] ?? 0), 0);

  const confirmReset = () => {
    const message = 'This erases your XP, streak and lesson progress on this device.';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) resetProgress();
      return;
    }
    Alert.alert('Reset progress?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetProgress },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Ionicons name="person" size={36} color={theme.onPrimary} />
            </View>
            <View style={styles.flex}>
              <Text variant="title">Your progress</Text>
              <Text tone="secondary">Sign-in and syncing across devices arrive in the next update.</Text>
            </View>
          </View>

          <View style={styles.grid}>
            <StatCard icon="flash" tone="xp" value={totalXp} label="Total XP" />
            <StatCard icon="flame" tone="streak" value={streak} label="Day streak" />
            <StatCard icon="checkmark-done" tone="accent" value={completed} label="Lessons done" />
            <StatCard
              icon="locate"
              tone="primary"
              value={avgAccuracy === null ? '—' : `${avgAccuracy}%`}
              label="Best accuracy (avg)"
            />
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Text variant="heading">This week</Text>
              <Text tone="xp" variant="bodyBold">
                {weekXp} XP
              </Text>
            </View>
            <View style={styles.chart} accessibilityLabel={`${weekXp} XP earned in the last 7 days`}>
              {days.map((day) => {
                const xp = xpByDay[day] ?? 0;
                const [y, m, d] = day.split('-').map(Number);
                const isToday = day === today;
                return (
                  <View key={day} style={styles.barColumn}>
                    <Text variant="caption" tone="secondary">
                      {xp || ''}
                    </Text>
                    <View style={[styles.barTrack, { backgroundColor: theme.surfaceAlt }]}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${(xp / maxDayXp) * 100}%`,
                            backgroundColor: isToday ? theme.primary : theme.accent,
                          },
                        ]}
                      />
                    </View>
                    <Text variant="caption" tone={isToday ? 'primary' : 'secondary'} style={isToday && styles.bold}>
                      {WEEKDAY[new Date(y, m - 1, d).getDay()]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Button title="Reset progress" variant="ghost" icon="trash-outline" onPress={confirmReset} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  tone,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'xp' | 'streak' | 'accent' | 'primary';
  value: string | number;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name={icon} size={24} color={theme[tone]} />
      <Text variant="title">{value}</Text>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.two },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.one,
  },
  card: { padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.three },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chart: { flexDirection: 'row', gap: Spacing.two, height: 160, alignItems: 'flex-end' },
  barColumn: { flex: 1, alignItems: 'center', gap: Spacing.one, height: '100%' },
  barTrack: { flex: 1, width: '70%', borderRadius: Radius.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: Radius.sm },
});
