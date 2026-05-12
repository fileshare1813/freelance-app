const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name googleAvatar avatar role')
      .populate({ path: 'lastMessage', select: 'content createdAt sender' })
      .sort({ updatedAt: -1 });

    const convWithOther = conversations.map(conv => {
      const other = conv.participants.find(
        p => p._id.toString() !== req.user._id.toString()
      );
      return { ...conv.toObject(), otherUser: other };
    });

    res.render('shared/chat', {
      title: 'Messages - FreelanceHub',
      conversations: convWithOther,
      activeConversation: null,
      messages: [],
      otherUser: null,
      initMsg: null
    });
  } catch (err) {
    console.error('getConversations error:', err);
    req.flash('error', 'Failed to load messages');
    res.redirect('/');
  }
};

exports.getConversation = async (req, res) => {
  try {
    // Get all conversations for sidebar
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name googleAvatar avatar role')
      .populate({ path: 'lastMessage', select: 'content createdAt sender' })
      .sort({ updatedAt: -1 });

    const convWithOther = conversations.map(conv => {
      const other = conv.participants.find(
        p => p._id.toString() !== req.user._id.toString()
      );
      return { ...conv.toObject(), otherUser: other };
    });

    // Get the active conversation
    const activeConversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    }).populate('participants', 'name googleAvatar avatar role');

    if (!activeConversation) {
      req.flash('error', 'Conversation not found');
      return res.redirect('/messages');
    }

    // Get messages
    const messages = await Message.find({ conversation: activeConversation._id })
      .populate('sender', 'name googleAvatar avatar role')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { conversation: activeConversation._id, sender: { $ne: req.user._id }, read: false },
      { read: true }
    );

    // Get other user
    const otherUser = activeConversation.participants.find(
      p => p._id.toString() !== req.user._id.toString()
    );

    res.render('shared/chat', {
      title: `Chat with ${otherUser?.name || 'User'} - FreelanceHub`,
      conversations: convWithOther,
      activeConversation,
      messages,
      otherUser,
      initMsg: req.query.initMsg || null
    });
  } catch (err) {
    console.error('getConversation error:', err);
    req.flash('error', 'Failed to load conversation');
    res.redirect('/messages');
  }
};

exports.startConversation = async (req, res) => {
  try {
    const { userId, projectId } = req.body;

    if (!userId) {
      req.flash('error', 'User not specified');
      return res.redirect('/messages');
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, userId],
        relatedProject: projectId || undefined
      });
    }

    const redirectUrl = projectId
      ? `/messages/${conversation._id}?projectId=${projectId}`
      : `/messages/${conversation._id}`;

    res.redirect(redirectUrl);
  } catch (err) {
    console.error('startConversation error:', err);
    req.flash('error', 'Failed to start conversation');
    res.redirect('/messages');
  }
};