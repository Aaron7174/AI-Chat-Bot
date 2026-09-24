const express = require('express');
const { handleChatRequest } = require('../controllers/chatController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.post('/', authenticate, requirePermission('USE_AI'), handleChatRequest);

module.exports = router;
