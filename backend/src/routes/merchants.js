const express = require('express');
const router = express.Router();
const { listMerchants, getMerchant, createMerchant, updateMerchant, archiveMerchant } = require('../controllers/merchantsController');
const { authenticate } = require('../middleware/auth');
const { adminOrAbove } = require('../middleware/roles');

router.get('/',            authenticate,              listMerchants);
router.get('/:id',         authenticate,              getMerchant);
router.post('/',           authenticate, adminOrAbove, createMerchant);
router.put('/:id',         authenticate, adminOrAbove, updateMerchant);
router.put('/:id/archive', authenticate, adminOrAbove, archiveMerchant);

module.exports = router;
