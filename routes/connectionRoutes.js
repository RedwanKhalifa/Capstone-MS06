const express = require('express');
const router = express.Router();
const { getConnections } = require('../controllers/connectionController');

router.get('/', getConnections);
module.exports = router;
