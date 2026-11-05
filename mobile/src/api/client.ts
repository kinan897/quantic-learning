import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { useAuth } from '@/store/auth';

import type { AuthResponse } from './types';

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

/** Turn FastAPI's error body into one readable sentence. */
function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    // Validation errors: [{ loc: [...], msg: "..." }]
    const first = detail[0] as { loc?: string[]; msg?: string };
    const field = first.loc?.at(-1);
    const msg = (first.msg ?? 'Invalid value').replace(/^Value error, /, '');
    if (field === 'email') return 'Enter a valid email address.';
    if (field === 'password') return 'Your password needs at least 8 characters.';
    return msg;
  }
  return `Something went wrong (${status}). Please try again.`;
}

async function request<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("Can't reach Quantic Learning. Check your connection and try again.", null);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(errorMessage(body, response.status), response.status);
  return body as T;
}

// Only one refresh at a time. Refresh tokens are single-use, so two parallel refreshes
// would look like token theft to the server and sign the student out.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const { refreshToken, setSession, clearSession } = useAuth.getState();
    if (!refreshToken) return false;
    try {
      setSession(
        await request<AuthResponse>(
          '/auth/refresh',
          { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) },
          null,
        ),
      );
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) clearSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

type FetchOptions = { auth?: boolean };

/**
 * Call the API. Signed-in requests carry the access token. When it has expired (401), the
 * session is refreshed once and the request retried.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  { auth = true }: FetchOptions = {},
): Promise<T> {
  const send = () => request<T>(path, init, auth ? useAuth.getState().accessToken : null);
  try {
    return await send();
  } catch (error) {
    if (auth && error instanceof ApiError && error.status === 401 && (await refreshSession())) {
      return send();
    }
    throw error;
  }
}
