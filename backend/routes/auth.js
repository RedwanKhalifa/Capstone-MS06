import express from 'express';
import {
  getGoogleSession,
  handleGoogleCallback,
  startGoogleAuth,
} from '../controllers/authController.js';

const router = express.Router();

router.get('/google/start', startGoogleAuth);
router.get('/google/callback', handleGoogleCallback);
router.get('/google/session/:authSessionId', getGoogleSession);

export default router;
