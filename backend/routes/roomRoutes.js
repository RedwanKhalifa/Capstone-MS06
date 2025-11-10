const express = require('express');
const router = express.Router();
const {
  listRooms,
  getRoom,
  getRoomByCode,
} = require('../controllers/roomController');

router.get('/', listRooms);
router.get('/code/:code', getRoomByCode);
router.get('/:id', getRoom);

module.exports = router;
