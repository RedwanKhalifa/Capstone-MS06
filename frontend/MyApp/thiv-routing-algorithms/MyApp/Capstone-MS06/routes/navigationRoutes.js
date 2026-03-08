// routes/navigationRoutes.js
const express = require('express');
const router = express.Router();

// Example endpoint
router.get('/', (req, res) => {
  res.json({ message: 'Navigation API works!' });
});

module.exports = router;
