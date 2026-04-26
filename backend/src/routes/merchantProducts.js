const express = require('express');
const router = express.Router();
const { getPriceHistory, setPriceEntry, deletePriceEntry } = require('../controllers/merchantProductsController');
const { authenticate } = require('../middleware/auth');
const { adminOrAbove } = require('../middleware/roles');

router.get('/history/:merchantId/:productId', authenticate, adminOrAbove, getPriceHistory);
router.post('/',    authenticate, adminOrAbove, setPriceEntry);
router.delete('/:id', authenticate, adminOrAbove, deletePriceEntry);

module.exports = router;
