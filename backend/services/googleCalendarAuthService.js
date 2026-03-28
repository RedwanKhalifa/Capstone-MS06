import crypto from 'node:crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_CALENDAR_LIST_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
const GOOGLE_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars';
const DEFAULT_CALLBACK_URL = 'http://localhost:8000/auth/google/callback';
const REQUIRED_HOSTED_DOMAIN = 'torontomu.ca';
const DEFAULT_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
];

const pendingAuthSessions = new Map();
const completedAuthSessions = new Map();

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getCallbackUrl() {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || DEFAULT_CALLBACK_URL;
}

function buildErrorRedirect(redirectUri, message) {
  const target = new URL(redirectUri);
  target.searchParams.set('status', 'error');
  target.searchParams.set('message', message);
  return target.toString();
}

function buildSuccessRedirect(redirectUri, authSessionId) {
  const target = new URL(redirectUri);
  target.searchParams.set('status', 'success');
  target.searchParams.set('authSession', authSessionId);
  return target.toString();
}

function isAllowedRedirectUri(value) {
  if (!value) return false;
  return /^(https?:\/\/|exp:\/\/|myapp:\/\/)/i.test(value);
}

function parseCourseCode(event) {
  const joined = [event.summary, event.description, event.location].filter(Boolean).join(' ');
  const match = joined.match(/\b([A-Z]{2,4}\d{3,4}[A-Z]?)\b/);
  return match?.[1] ?? 'CLASS';
}

function parseRoom(event) {
  const joined = [event.location, event.summary, event.description].filter(Boolean).join(' ');
  const roomMatch =
    joined.match(/\b([A-Z]{2,4}\s?\d{2,4}[A-Z]?)\b/) ||
    joined.match(/\b([A-Z]{3}\d{3})\b/);
  return roomMatch?.[1]?.replace(/\s+/g, '') ?? 'TBA';
}

function parseBuildingCode(room) {
  const buildingMatch = room.match(/^[A-Z]{3,4}/);
  return buildingMatch?.[0] ?? 'TMU';
}

function normalizeCalendar(calendar) {
  return {
    id: calendar.id,
    name: calendar.summary,
    provider: 'Google',
    color: calendar.backgroundColor || '#2c3ea3',
    selected: calendar.selected !== false,
  };
}

function normalizeEvent(event, calendarLookup) {
  const room = parseRoom(event);
  const courseCode = parseCourseCode(event);
  const calendarName = calendarLookup.get(event.organizer?.email) ?? calendarLookup.get(event.calendarId) ?? 'Google Calendar';
  const startIso = event.start?.dateTime ?? event.start?.date;
  const endIso = event.end?.dateTime ?? event.end?.date;

  if (!startIso || !endIso) return null;

  return {
    id: event.id,
    title: event.summary || courseCode,
    courseCode,
    room,
    buildingCode: parseBuildingCode(room),
    startIso,
    endIso,
    calendarId: event.calendarId,
    sourceLabel: calendarName,
  };
}

async function exchangeCodeForTokens(code) {
  const body = new URLSearchParams({
    code,
    client_id: getRequiredEnv('GOOGLE_CLIENT_ID'),
    client_secret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
    redirect_uri: getCallbackUrl(),
    grant_type: 'authorization_code',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return response.json();
}

async function fetchGoogleJson(url, accessToken) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google API request failed: ${text}`);
  }

  return response.json();
}

async function fetchCalendarSession(accessToken) {
  const [profile, calendarListResponse] = await Promise.all([
    fetchGoogleJson(GOOGLE_USERINFO_URL, accessToken),
    fetchGoogleJson(GOOGLE_CALENDAR_LIST_URL, accessToken),
  ]);

  if (typeof profile.email !== 'string' || !profile.email.toLowerCase().endsWith(`@${REQUIRED_HOSTED_DOMAIN}`)) {
    throw new Error(`Only ${REQUIRED_HOSTED_DOMAIN} Google Workspace accounts are allowed.`);
  }

  const calendars = (calendarListResponse.items ?? [])
    .filter((calendar) => calendar.accessRole && calendar.hidden !== true)
    .slice(0, 10)
    .map(normalizeCalendar);

  const calendarLookup = new Map(calendars.map((calendar) => [calendar.id, calendar.name]));
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 1);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30);

  const eventRequests = calendars
    .filter((calendar) => calendar.selected)
    .map(async (calendar) => {
      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: '50',
      });
      const payload = await fetchGoogleJson(
        `${GOOGLE_EVENTS_URL}/${encodeURIComponent(calendar.id)}/events?${params.toString()}`,
        accessToken
      );

      return (payload.items ?? []).map((event) => ({ ...event, calendarId: calendar.id }));
    });

  const events = (await Promise.all(eventRequests))
    .flat()
    .map((event) => normalizeEvent(event, calendarLookup))
    .filter((event) => event && event.room !== 'TBA');

  return {
    studentAccount: {
      fullName: profile.name || profile.email,
      schoolEmail: profile.email,
      providerLabel: 'Google Workspace',
    },
    connectedCalendars: calendars,
    calendarEvents: events,
  };
}

export function createGoogleAuthUrl(redirectUri) {
  if (!isAllowedRedirectUri(redirectUri)) {
    throw new Error('Invalid redirect_uri provided.');
  }

  const authSessionId = crypto.randomUUID();
  pendingAuthSessions.set(authSessionId, {
    id: authSessionId,
    redirectUri,
    createdAt: Date.now(),
  });

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', getRequiredEnv('GOOGLE_CLIENT_ID'));
  url.searchParams.set('redirect_uri', getCallbackUrl());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', DEFAULT_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', authSessionId);
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('hd', REQUIRED_HOSTED_DOMAIN);

  return url.toString();
}

export async function completeGoogleAuth({ code, state, error }) {
  const pending = pendingAuthSessions.get(state);
  if (!pending) {
    throw new Error('Unknown or expired auth session.');
  }

  pendingAuthSessions.delete(state);

  if (error) {
    return buildErrorRedirect(pending.redirectUri, error);
  }

  const tokens = await exchangeCodeForTokens(code);
  const session = await fetchCalendarSession(tokens.access_token);

  completedAuthSessions.set(state, {
    ...session,
    createdAt: Date.now(),
  });

  return buildSuccessRedirect(pending.redirectUri, state);
}

export function getCompletedGoogleSession(authSessionId) {
  const session = completedAuthSessions.get(authSessionId);
  if (!session) {
    throw new Error('Auth session not found.');
  }
  return session;
}
