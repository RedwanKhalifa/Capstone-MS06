const express = require('express');
const router = express.Router();

// Temporary test route
router.get('/', (req, res) => {
  res.json([
    { id: 1, name: 'Room A' },
    { id: 2, name: 'Room B' },
  ]);
});

module.exports = router;
