import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type {
  CalendarClassEvent,
  ConnectedCalendar,
  StudentAccount,
} from '@/context/app-state';

WebBrowser.maybeCompleteAuthSession();

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

export type CalendarAuthSession = {
  studentAccount: StudentAccount;
  connectedCalendars: ConnectedCalendar[];
  calendarEvents: CalendarClassEvent[];
};

type AuthResultPayload = {
  status: 'success' | 'error';
  authSessionId?: string;
  message?: string;
};

function parseAuthResult(url: string): AuthResultPayload {
  const parsed = Linking.parse(url);
  const rawStatus = parsed.queryParams?.status;
  const rawSession = parsed.queryParams?.authSession;
  const rawMessage = parsed.queryParams?.message;

  return {
    status: rawStatus === 'success' ? 'success' : 'error',
    authSessionId: typeof rawSession === 'string' ? rawSession : undefined,
    message: typeof rawMessage === 'string' ? rawMessage : undefined,
  };
}

async function fetchCalendarSession(authSessionId: string): Promise<CalendarAuthSession> {
  const response = await fetch(`${BASE_URL}/auth/google/session/${encodeURIComponent(authSessionId)}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? 'Failed to load Google calendar session.');
  }
  return response.json();
}

export async function signInWithGoogleCalendar(): Promise<CalendarAuthSession> {
  const redirectUri = Linking.createURL('/calendar-connect');
  const authUrl = `${BASE_URL}/auth/google/start?redirect_uri=${encodeURIComponent(redirectUri)}`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== 'success' || !result.url) {
    throw new Error('Sign-in was cancelled before completion.');
  }

  const parsed = parseAuthResult(result.url);
  if (parsed.status !== 'success' || !parsed.authSessionId) {
    throw new Error(parsed.message ?? 'Google sign-in failed.');
  }

  return fetchCalendarSession(parsed.authSessionId);
}
