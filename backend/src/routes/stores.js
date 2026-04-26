const express = require('express');
const router = express.Router();
const { publicStores, listStores, createStore, getStore, updateStore, archiveStore } = require('../controllers/stores');
const { authenticate } = require('../middleware/auth');
const { ownerOnly, adminOrAbove } = require('../middleware/roles');

router.get('/public', publicStores);
router.get('/',        authenticate, adminOrAbove, listStores);
router.post('/',       authenticate, ownerOnly,    createStore);
router.get('/:id',     authenticate, adminOrAbove, getStore);
router.patch('/:id',         authenticate, ownerOnly, updateStore);
router.patch('/:id/archive', authenticate, ownerOnly, archiveStore);

module.exports = router;
