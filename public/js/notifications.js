// ===== REALTIME NOTIFICATIONS via Socket.io =====
(function () {
  if (typeof io === 'undefined' || typeof USER_ID === 'undefined') return;

  const socket = window._mainSocket || (window._mainSocket = io({
    reconnectionAttempts: 3,
    reconnectionDelay: 2000,
    timeout: 5000
  }));

  // Join personal room
  socket.emit('join', USER_ID);

  // ===== RECEIVE NOTIFICATION =====
  socket.on('newNotification', (notif) => {
    incrementBadge();
    showToast(notif);
    prependToDropdown(notif);
  });

  // ===== INCREMENT BADGE COUNT =====
  function incrementBadge() {
    const badge = document.getElementById('notifCount');
    if (!badge) return;
    const current = parseInt(badge.textContent) || 0;
    badge.textContent = current + 1;
    badge.classList.remove('hidden');
    badge.style.animation = 'none';
    requestAnimationFrame(() => {
      badge.style.animation = 'badgePop 0.3s ease';
    });
  }

  // ===== TOAST NOTIFICATION =====
  function showToast(notif) {
    const icons = {
      message: 'fa-comment', proposal: 'fa-paper-plane', hired: 'fa-handshake',
      project_update: 'fa-briefcase', report: 'fa-file-alt', review: 'fa-star',
      payment: 'fa-rupee-sign', system: 'fa-info-circle'
    };
    const icon = icons[notif.type] || 'fa-bell';
    const avatarSrc = notif.sender?.googleAvatar ||
      (notif.sender?._id ? `/avatar/${notif.sender._id}` : '/images/default-avatar.png');

    const toast = document.createElement('div');
    toast.className = 'notif-toast';
    toast.innerHTML = `
      <div class="notif-toast-left">
        <img src="${avatarSrc}" class="notif-toast-avatar"
          onerror="this.src='/images/default-avatar.png'">
        <div class="notif-toast-icon notif-icon-${notif.type}">
          <i class="fas ${icon}"></i>
        </div>
      </div>
      <div class="notif-toast-body">
        <div class="notif-toast-sender">${notif.sender?.name || 'FreelanceHub'}</div>
        <div class="notif-toast-msg">${notif.message}</div>
      </div>
      ${notif.link ? `<a href="${notif.link}" class="notif-toast-link"><i class="fas fa-arrow-right"></i></a>` : ''}
      <button class="notif-toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    // Inject toast styles if not already present
    if (!document.getElementById('toastStyles')) {
      const style = document.createElement('style');
      style.id = 'toastStyles';
      style.textContent = `
        .notif-toast-container { position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column-reverse; gap:10px; }
        .notif-toast { display:flex; align-items:center; gap:12px; background:#fff; border:1px solid #e2e8f0; border-left:4px solid #6c63ff; border-radius:12px; padding:14px 16px; min-width:300px; max-width:380px; box-shadow:0 8px 24px rgba(0,0,0,0.12); animation:toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1); }
        .notif-toast-left { position:relative; flex-shrink:0; }
        .notif-toast-avatar { width:38px; height:38px; border-radius:50%; object-fit:cover; }
        .notif-toast-icon { position:absolute; bottom:-2px; right:-4px; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.6rem; border:2px solid #fff; background:#6c63ff; color:#fff; }
        .notif-toast-body { flex:1; min-width:0; }
        .notif-toast-sender { font-weight:700; font-size:0.85rem; color:#1a1a2e; }
        .notif-toast-msg { font-size:0.82rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .notif-toast-link { color:#6c63ff; font-size:0.85rem; flex-shrink:0; }
        .notif-toast-close { background:none; border:none; cursor:pointer; color:#94a3b8; font-size:1.1rem; line-height:1; flex-shrink:0; padding:0 2px; }
        .notif-toast-close:hover { color:#374151; }
        @keyframes toastIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes badgePop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
      `;
      document.head.appendChild(style);
    }

    let container = document.querySelector('.notif-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notif-toast-container';
      document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // ===== PREPEND TO DROPDOWN =====
  function prependToDropdown(notif) {
    const list = document.getElementById('notifList');
    if (!list || !list.classList.contains('open')) return;

    const avatarSrc = notif.sender?.googleAvatar ||
      (notif.sender?._id ? `/avatar/${notif.sender._id}` : '/images/default-avatar.png');

    const item = document.createElement('div');
    item.className = 'notif-item unread';
    item.innerHTML = `
      <img src="${avatarSrc}" class="notif-item-avatar" onerror="this.src='/images/default-avatar.png'">
      <div class="notif-item-body">
        <div class="notif-item-msg">${notif.message}</div>
        <div class="notif-item-time">Just now</div>
      </div>
    `;
    if (notif.link) item.style.cursor = 'pointer';
    item.addEventListener('click', () => { if (notif.link) window.location = notif.link; });

    // Remove "no notifications" placeholder
    const loading = list.querySelector('.notif-loading');
    if (loading) loading.remove();

    list.insertBefore(item, list.firstChild);
  }

})();