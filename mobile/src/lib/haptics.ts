import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Haptic feedback that silently does nothing where unsupported (web). */
export const haptics = {
  success() {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  error() {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
  tap() {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  },
};
