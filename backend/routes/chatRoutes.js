const express = require('express');
const { handleChatRequest } = require('../controllers/chatController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const conversations = require('../controllers/conversationController');

const router = express.Router();

router.post('/', authenticate, requirePermission('USE_AI'), handleChatRequest);
router.get('/conversations', authenticate, requirePermission('USE_AI'), conversations.list);
router.post('/conversations', authenticate, requirePermission('USE_AI'), conversations.create);
router.get('/conversations/:conversationId', authenticate, requirePermission('USE_AI'), conversations.get);
router.patch('/conversations/:conversationId', authenticate, requirePermission('USE_AI'), conversations.rename);
router.delete('/conversations/:conversationId', authenticate, requirePermission('USE_AI'), conversations.remove);
router.post('/conversations/:conversationId/messages', authenticate, requirePermission('USE_AI'), conversations.sendMessage);

module.exports = router;
