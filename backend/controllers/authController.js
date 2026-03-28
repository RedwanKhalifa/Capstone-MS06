import {
  completeGoogleAuth,
  createGoogleAuthUrl,
  getCompletedGoogleSession,
} from '../services/googleCalendarAuthService.js';

export function startGoogleAuth(req, res) {
  try {
    const redirectUri = req.query.redirect_uri;
    const authUrl = createGoogleAuthUrl(redirectUri);
    res.redirect(authUrl);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function handleGoogleCallback(req, res) {
  try {
    const redirectUrl = await completeGoogleAuth({
      code: req.query.code,
      state: req.query.state,
      error: req.query.error,
    });
    res.redirect(redirectUrl);
  } catch (error) {
    res.status(400).send(error.message);
  }
}

export function getGoogleSession(req, res) {
  try {
    const session = getCompletedGoogleSession(req.params.authSessionId);
    res.json(session);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}
