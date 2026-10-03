const express = require('express');
const { createUser } = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.use(authenticate, requirePermission('MANAGE_USERS'));
router.post('/', createUser);

module.exports = router;
