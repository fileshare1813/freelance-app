const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

router.get('/', isLoggedIn, messageController.getConversations);
router.get('/:id', isLoggedIn, messageController.getConversation);
router.post('/start', isLoggedIn, messageController.startConversation);

module.exports = router;