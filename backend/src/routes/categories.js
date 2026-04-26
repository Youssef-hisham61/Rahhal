const express = require('express');
const router = express.Router();
const { listCategories, createCategory, updateCategory, archiveCategory } = require('../controllers/categoriesController');
const { authenticate } = require('../middleware/auth');
const { adminOrAbove } = require('../middleware/roles');

router.get('/',              authenticate,              listCategories);
router.post('/',             authenticate, adminOrAbove, createCategory);
router.put('/:id',           authenticate, adminOrAbove, updateCategory);
router.put('/:id/archive',   authenticate, adminOrAbove, archiveCategory);

module.exports = router;
