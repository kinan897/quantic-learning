import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProgress, useSignOut } from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth';
import { usePreferences, type ThemeMode } from '@/store/preferences';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekdayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return WEEKDAY[new Date(y, m - 1, d).getDay()];
}

export default function ProfileScreen() {
  const theme = useTheme();
  const user = useAuth((s) => s.user);
  const courseId = usePreferences((s) => s.activeCourseId);
  const { data: progress, error, refetch } = useProgress(courseId);
  const signOut = useSignOut();

  const confirmSignOut = () => {
    const message = "You'll need your email and password to sign back in.";
    if (Platform.OS === 'web') {
      if (window.confirm(message)) signOut.mutate();
      return;
    }
    Alert.alert('Sign out?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut.mutate() },
    ]);
  };

  let stats;
  if (error) {
    stats = <ErrorState message={error.message} onRetry={() => void refetch()} />;
  } else if (!progress) {
    stats = <LoadingState />;
  } else {
    const records = Object.values(progress.lessons);
    const avgAccuracy = records.length
      ? Math.round((records.reduce((sum, r) => sum + r.best_accuracy, 0) / records.length) * 100)
      : null;
    const maxDayXp = Math.max(10, ...progress.week.map((d) => d.xp));
    const weekXp = progress.week.reduce((sum, d) => sum + d.xp, 0);

    stats = (
      <>
        <View style={styles.grid}>
          <StatCard icon="flash" tone="xp" value={progress.total_xp} label="Total XP" />
          <StatCard icon="flame" tone="streak" value={progress.streak} label="Day streak" />
          <StatCard icon="checkmark-done" tone="accent" value={records.length} label="Lessons done" />
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
            {progress.week.map(({ date, xp }) => {
              const isToday = date === progress.today;
              return (
                <View key={date} style={styles.barColumn}>
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
                  <Text
                    variant="caption"
                    tone={isToday ? 'primary' : 'secondary'}
                    style={isToday && styles.bold}>
                    {weekdayOf(date)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </>
    );
  }

  const initial = user?.display_name?.trim()[0]?.toUpperCase();

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              {initial ? (
                <Text variant="display" style={{ color: theme.onPrimary }}>
                  {initial}
                </Text>
              ) : (
                <Ionicons name="person" size={36} color={theme.onPrimary} />
              )}
            </View>
            <View style={styles.flex}>
              <Text variant="title">{user?.display_name ?? 'Guest learner'}</Text>
              <Text tone="secondary">{user?.email ?? 'Playing as a guest'}</Text>
            </View>
          </View>

          {user?.is_guest && (
            <View style={[styles.card, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
              <View style={styles.saveTitle}>
                <Ionicons name="cloud-upload-outline" size={22} color={theme.primary} />
                <Text variant="heading">Save your progress</Text>
              </View>
              <Text tone="secondary">
                Create a free account to keep your XP and streak, and pick up on any device.
              </Text>
              <Button title="Create account" onPress={() => router.push('/auth/sign-up')} />
              <Button
                title="I already have an account"
                variant="ghost"
                onPress={() => router.push('/auth/sign-in')}
              />
            </View>
          )}

          {stats}

          <AppearancePicker />

          {user && !user.is_guest && (
            <Button
              title="Sign out"
              variant="ghost"
              icon="log-out-outline"
              loading={signOut.isPending}
              onPress={confirmSignOut}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'dark', label: 'Dark', icon: 'moon' },
  { mode: 'light', label: 'Light', icon: 'sunny' },
  { mode: 'system', label: 'Match phone', icon: 'phone-portrait-outline' },
];

/** Dark by default (like the website); light or "match my phone" are optional. */
function AppearancePicker() {
  const theme = useTheme();
  const mode = usePreferences((s) => s.themeMode);
  const setThemeMode = usePreferences((s) => s.setThemeMode);
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text variant="heading">Appearance</Text>
      <View style={[styles.segment, { backgroundColor: theme.surfaceAlt }]} accessibilityRole="radiogroup">
        {THEME_OPTIONS.map((option) => {
          const selected = option.mode === mode;
          return (
            <Pressable
              key={option.mode}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setThemeMode(option.mode)}
              style={[styles.segmentItem, selected && { backgroundColor: theme.accent }]}>
              <Ionicons name={option.icon} size={16} color={selected ? theme.onAccent : theme.textSecondary} />
              <Text variant="label" style={[styles.segmentText, { color: selected ? theme.onAccent : theme.text }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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
  saveTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
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
  barTrack: {
    flex: 1,
    width: '70%',
    borderRadius: Radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: Radius.sm },
  segment: { flexDirection: 'row', borderRadius: Radius.pill, padding: 4, gap: 4 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.pill,
  },
  segmentText: { fontSize: 13 },
});
