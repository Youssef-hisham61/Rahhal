const express = require('express');
const router = express.Router();
const {
  getOnline, listUsers, createUser, getUser, updateUser,
  deactivateUser, activateUser, resetPassword, reassignWarehouse,
} = require('../controllers/users');
const { authenticate } = require('../middleware/auth');
const { adminOrAbove } = require('../middleware/roles');

router.get('/online', authenticate, adminOrAbove, getOnline);

router.get('/',    authenticate, adminOrAbove, listUsers);
router.post('/',   authenticate, adminOrAbove, createUser);
router.get('/:id', authenticate, adminOrAbove, getUser);

router.patch('/:id',                   authenticate, adminOrAbove, updateUser);
router.patch('/:id/deactivate',        authenticate, adminOrAbove, deactivateUser);
router.patch('/:id/activate',          authenticate, adminOrAbove, activateUser);
router.patch('/:id/password',          authenticate, adminOrAbove, resetPassword);
router.patch('/:id/warehouse',         authenticate, adminOrAbove, reassignWarehouse);

module.exports = router;
