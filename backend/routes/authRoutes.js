const express = require('express');
const router = express.Router();
const { verify, getMe } = require('../controllers/authController');
const firebaseAuth = require('../middleware/firebaseAuth');

router.post('/verify', verify);
router.get('/me', firebaseAuth, getMe);

module.exports = router;
