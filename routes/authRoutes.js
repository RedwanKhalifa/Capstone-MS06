const express = require('express');
const router = express.Router();

// placeholder route for now
router.post('/verify', (req, res) => {
  res.json({ message: 'Auth verification placeholder working' });
});

router.get('/me', (req, res) => {
  res.json({ user: { name: 'Test User', role: 'student' } });
});

module.exports = router;
