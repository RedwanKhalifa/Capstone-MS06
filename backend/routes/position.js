
import express from 'express';
import { computePosition } from '../controllers/positionController.js';
const router = express.Router();

router.post('/', computePosition);

export default router;
