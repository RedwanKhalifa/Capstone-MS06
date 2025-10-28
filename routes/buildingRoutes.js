const express = require('express');
const router = express.Router();
const { getBuildings, getFloors, getFloor } = require('../controllers/buildingController');

router.get('/', getBuildings);
router.get('/:id/floors', getFloors);
router.get('/floors/:id', getFloor);

module.exports = router;
