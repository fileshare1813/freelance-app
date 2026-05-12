const User = require('../models/User');
const Project = require('../models/Project');
const Review = require('../models/Review');

exports.getOwnProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    let projects = [];
    if (user.role === 'client') {
      projects = await Project.find({ client: user._id })
        .sort({ createdAt: -1 }).limit(6).lean();
    } else if (user.role === 'freelancer') {
      projects = await Project.find({ hiredFreelancer: user._id })
        .sort({ createdAt: -1 }).limit(6).lean();
    }
    const reviews = await Review.find({ reviewee: user._id })
      .populate('reviewer', 'name googleAvatar avatar')
      .sort({ createdAt: -1 }).limit(5).lean();

    res.render('shared/profile', {
      title: 'My Profile - FreelanceHub',
      profileUser: user,
      projects,
      reviews,
      isOwn: true
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load profile');
    res.redirect('/');
  }
};

exports.getProfileById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/');
    }
    let projects = [];
    if (user.role === 'client') {
      projects = await Project.find({ client: user._id, status: 'completed' })
        .sort({ completedAt: -1 }).limit(6).lean();
    } else if (user.role === 'freelancer') {
      projects = await Project.find({ hiredFreelancer: user._id, status: 'completed' })
        .sort({ completedAt: -1 }).limit(6).lean();
    }
    const reviews = await Review.find({ reviewee: user._id })
      .populate('reviewer', 'name googleAvatar avatar')
      .sort({ createdAt: -1 }).limit(5).lean();

    const isOwn = req.user && req.user._id.toString() === user._id.toString();

    res.render('shared/profile', {
      title: `${user.name}'s Profile - FreelanceHub`,
      profileUser: user,
      projects,
      reviews,
      isOwn
    });
  } catch (err) {
    req.flash('error', 'Failed to load profile');
    res.redirect('/');
  }
};

exports.getAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('avatar avatarContentType');
    if (user && user.avatar) {
      res.set('Content-Type', user.avatarContentType || 'image/jpeg');
      return res.send(user.avatar);
    }
    res.redirect('/images/default-avatar.png');
  } catch (e) {
    res.redirect('/images/default-avatar.png');
  }
};