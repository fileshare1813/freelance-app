const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const Notification = require('../models/Notification');

router.get('/', isLoggedIn, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name googleAvatar avatar').sort({ createdAt: -1 }).limit(50);
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.render('shared/notifications', { title: 'Notifications - FreelanceHub', notifications });
  } catch (err) {
    req.flash('error', 'Failed to load notifications');
    res.redirect('/');
  }
});

router.post('/mark-read/:id', isLoggedIn, async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { read: true });
  res.json({ success: true });
});

router.post('/mark-all-read', isLoggedIn, async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id }, { read: true });
  res.json({ success: true });
});

router.get('/api', isLoggedIn, async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate('sender', 'name googleAvatar avatar').sort({ createdAt: -1 }).limit(10);
  res.json(notifications);
});

module.exports = router;