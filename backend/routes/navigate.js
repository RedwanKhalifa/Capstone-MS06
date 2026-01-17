
import express from 'express';
import { getRoute } from '../controllers/navigateController.js';
const router=express.Router();
router.post('/', getRoute);
export default router;
