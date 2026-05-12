const canViewProject = (user, project) => {
  if (user.role === 'admin') return true;
  if (user.role === 'client') return project.client.toString() === user._id.toString();
  if (user.role === 'freelancer') return project.isPublic || 
    (project.hiredFreelancer && project.hiredFreelancer.toString() === user._id.toString());
  return false;
};

const canEditProject = (user, project) => {
  if (user.role === 'admin') return true;
  return user.role === 'client' && project.client.toString() === user._id.toString();
};

module.exports = { canViewProject, canEditProject };