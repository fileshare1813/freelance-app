const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name googleAvatar avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.render('shared/notifications', { title: 'Notifications - FreelanceHub', notifications });
  } catch (err) {
    req.flash('error', 'Failed to load notifications');
    res.redirect('/');
  }
};

exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAPI = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name googleAvatar avatar')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(notifications);
  } catch (err) {
    res.status(500).json([]);
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};