const express = require('express');
const router = express.Router();
const { listProducts, searchProducts, getProduct, createProduct, updateProduct, archiveProduct } = require('../controllers/productsController');
const { authenticate } = require('../middleware/auth');
const { adminOrAbove } = require('../middleware/roles');

// /search must come before /:id so Express doesn't treat "search" as an id
router.get('/search',        authenticate,              searchProducts);
router.get('/',              authenticate,              listProducts);
router.get('/:id',           authenticate,              getProduct);
router.post('/',             authenticate, adminOrAbove, createProduct);
router.put('/:id',           authenticate, adminOrAbove, updateProduct);
router.put('/:id/archive',   authenticate, adminOrAbove, archiveProduct);

module.exports = router;
