const express = require('express');
const router = express.Router();
const {
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  toggleLock,
  archiveWarehouse,
} = require('../controllers/warehousesController');
const { authenticate }  = require('../middleware/auth');
const { adminOrAbove }  = require('../middleware/roles');

router.get('/',               authenticate,              listWarehouses);
router.get('/:id',            authenticate,              getWarehouse);
router.post('/',              authenticate, adminOrAbove, createWarehouse);
router.put('/:id',            authenticate, adminOrAbove, updateWarehouse);
router.put('/:id/lock',       authenticate, adminOrAbove, toggleLock);
router.put('/:id/archive',    authenticate, adminOrAbove, archiveWarehouse);

module.exports = router;
