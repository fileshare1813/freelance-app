const Project = require('../models/Project');
const User = require('../models/User');
const Proposal = require('../models/Proposal');

const getGraphData = async (role, userId) => {
  const now = new Date();
  const months = [];
  const labels = [];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d);
    labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
  }

  if (role === 'admin') {
    const projectData = await Promise.all(months.map(async (m, idx) => {
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      return Project.countDocuments({ createdAt: { $gte: start, $lte: end } });
    }));

    const revenueData = await Promise.all(months.map(async (m) => {
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      const projects = await Project.find({ 
        status: 'completed', 
        completedAt: { $gte: start, $lte: end } 
      });
      return projects.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    }));

    const userGrowth = await Promise.all(months.map(async (m) => {
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      return User.countDocuments({ createdAt: { $gte: start, $lte: end } });
    }));

    return { labels, projectData, revenueData, userGrowth, role: 'admin' };

  } else if (role === 'client') {
    const projectData = await Promise.all(months.map(async (m) => {
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      return Project.countDocuments({ client: userId, createdAt: { $gte: start, $lte: end } });
    }));

    const spentData = await Promise.all(months.map(async (m) => {
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      const projects = await Project.find({ 
        client: userId, status: 'completed',
        completedAt: { $gte: start, $lte: end }
      });
      return projects.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    }));

    return { labels, projectData, revenueData: spentData, role: 'client' };

  } else if (role === 'freelancer') {
    const earningsData = await Promise.all(months.map(async (m) => {
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      const projects = await Project.find({ 
        hiredFreelancer: userId, status: 'completed',
        completedAt: { $gte: start, $lte: end }
      });
      return projects.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    }));

    const projectData = await Promise.all(months.map(async (m) => {
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      return Proposal.countDocuments({ 
        freelancer: userId, status: 'accepted',
        createdAt: { $gte: start, $lte: end }
      });
    }));

    return { labels, projectData, revenueData: earningsData, role: 'freelancer' };
  }
};

module.exports = { getGraphData };