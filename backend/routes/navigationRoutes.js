const express = require('express');
const router = express.Router();
const { navigate, findNearby } = require('../controllers/navigationController');

router.post('/', navigate);
router.get('/nearby', findNearby);

module.exports = router;
