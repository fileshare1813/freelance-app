const Report = require('../models/Report');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

exports.getProjectReports = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('client', 'name')
      .populate('hiredFreelancer', 'name');

    if (!project) {
      req.flash('error', 'Project not found');
      return res.redirect('/');
    }

    // Access check
    const isClient = project.client._id.toString() === req.user._id.toString();
    const isFreelancer = project.hiredFreelancer &&
      project.hiredFreelancer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isClient && !isFreelancer && !isAdmin) {
      req.flash('error', 'Access denied');
      return res.redirect('/');
    }

    const { dateFrom, dateTo, sort = '-createdAt' } = req.query;
    let query = { project: req.params.projectId };
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    const reports = await Report.find(query)
      .populate('freelancer', 'name googleAvatar avatar')
      .sort(sort);

    // Mark as seen if client
    if (isClient) {
      await Report.updateMany({ project: project._id, clientSeen: false }, { clientSeen: true });
    }

    res.render('shared/reports', {
      title: `Reports - ${project.title}`,
      reports,
      project,
      filters: req.query
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load reports');
    res.redirect('/');
  }
};

exports.submitReport = async (req, res) => {
  try {
    const { projectId, hoursWorked, tasksCompleted, tasksPlanned, blockers, progressPercentage, notes } = req.body;

    const project = await Project.findOne({ _id: projectId, hiredFreelancer: req.user._id });
    if (!project) {
      req.flash('error', 'Project not found or you are not assigned');
      return res.redirect('/freelancer/submit-report');
    }

    const tasksCompArr = typeof tasksCompleted === 'string'
      ? tasksCompleted.split('\n').map(t => t.trim()).filter(Boolean)
      : (tasksCompleted || []);

    const tasksPlanArr = typeof tasksPlanned === 'string'
      ? tasksPlanned.split('\n').map(t => t.trim()).filter(Boolean)
      : (tasksPlanned || []);

    await Report.create({
      project: projectId,
      freelancer: req.user._id,
      client: project.client,
      hoursWorked: Number(hoursWorked),
      tasksCompleted: tasksCompArr,
      tasksPlanned: tasksPlanArr,
      blockers: blockers || '',
      progressPercentage: Number(progressPercentage) || 0,
      notes: notes || ''
    });

    // Notify client
    const notif = await Notification.create({
      recipient: project.client,
      sender: req.user._id,
      type: 'report',
      message: `${req.user.name} submitted a daily report for "${project.title}"`,
      link: `/reports/project/${projectId}`
    });

    try {
      const pop = await notif.populate('sender', 'name googleAvatar');
      getIO().to(`user_${project.client}`).emit('newNotification', pop);
    } catch (e) {}

    req.flash('success', 'Daily report sent to client!');
    res.redirect('/freelancer/my-proposals');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to submit report');
    res.redirect('/freelancer/submit-report');
  }
};