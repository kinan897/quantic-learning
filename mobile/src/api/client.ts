import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 8000;

/**
 * Where the backend lives.
 *
 * 1. `EXPO_PUBLIC_API_URL` wins if set (staging/production builds).
 * 2. On web, use the same host the page was served from.
 * 3. On a phone running Expo Go, use the dev machine's LAN IP. Expo already knows it,
 *    because that's where the app's JavaScript was downloaded from.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (devHost) return `http://${devHost}:${API_PORT}`;

  // Android emulators reach the host machine through this special address.
  return Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("Can't reach Quantic Learning. Check your connection and try again.", null);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { detail?: unknown }) => (typeof body.detail === 'string' ? body.detail : null))
      .catch(() => null);
    throw new ApiError(detail ?? `Request failed (${response.status})`, response.status);
  }
  return (await response.json()) as T;
}
