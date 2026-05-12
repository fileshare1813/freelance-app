// ===== OTP INPUT HANDLER =====
(function () {
  const boxes = document.querySelectorAll('.otp-box');
  const hidden = document.getElementById('otpHidden');
  const form = document.getElementById('otpForm');
  const verifyBtn = document.getElementById('verifyBtn');

  if (!boxes.length) return;

  // ===== AUTO-FOCUS NEXT BOX =====
  boxes.forEach((box, idx) => {
    box.setAttribute('inputmode', 'numeric');
    box.setAttribute('pattern', '[0-9]*');
    box.setAttribute('autocomplete', 'one-time-code');

    box.addEventListener('input', (e) => {
      // Allow only digits
      box.value = box.value.replace(/\D/g, '').slice(0, 1);

      if (box.value) {
        box.classList.add('filled');
        // Move to next
        if (idx < boxes.length - 1) {
          boxes[idx + 1].focus();
        }
      } else {
        box.classList.remove('filled');
      }

      syncHidden();
      checkComplete();
    });

    // Handle backspace
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!box.value && idx > 0) {
          boxes[idx - 1].value = '';
          boxes[idx - 1].classList.remove('filled');
          boxes[idx - 1].focus();
          syncHidden();
          checkComplete();
        }
      }
      // Arrow navigation
      if (e.key === 'ArrowLeft' && idx > 0) boxes[idx - 1].focus();
      if (e.key === 'ArrowRight' && idx < boxes.length - 1) boxes[idx + 1].focus();
    });

    // Handle paste (e.g. from SMS auto-fill)
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, boxes.length);

      if (pasted) {
        [...pasted].forEach((char, i) => {
          if (boxes[i]) {
            boxes[i].value = char;
            boxes[i].classList.add('filled');
          }
        });
        const nextEmpty = [...boxes].findIndex(b => !b.value);
        if (nextEmpty !== -1) boxes[nextEmpty].focus();
        else boxes[boxes.length - 1].focus();

        syncHidden();
        checkComplete();
      }
    });

    // Handle click to re-enter
    box.addEventListener('click', () => box.select());
  });

  // ===== SYNC HIDDEN INPUT =====
  function syncHidden() {
    if (hidden) {
      hidden.value = [...boxes].map(b => b.value).join('');
    }
  }

  // ===== CHECK IF ALL FILLED =====
  function checkComplete() {
    const all = [...boxes].every(b => b.value !== '');
    if (verifyBtn) {
      verifyBtn.disabled = !all;
      verifyBtn.style.opacity = all ? '1' : '0.6';
    }
    if (all && form) {
      // Small delay so user can see all filled before submit
      setTimeout(() => form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })), 300);
    }
  }

  // ===== FORM SUBMIT VALIDATION =====
  if (form) {
    form.addEventListener('submit', (e) => {
      syncHidden();
      const otp = hidden?.value || '';
      if (otp.length < 5 || /\D/.test(otp)) {
        e.preventDefault();
        boxes.forEach(b => {
          b.style.borderColor = '#ef4444';
          b.style.background = '#fef2f2';
        });
        setTimeout(() => {
          boxes.forEach(b => {
            b.style.borderColor = '';
            b.style.background = '';
          });
        }, 1500);
      }
    });
  }

  // ===== RESEND COUNTDOWN TIMER =====
  let seconds = 60;
  const timerEl = document.getElementById('timer');
  const timerText = document.getElementById('timerText');
  const resendForm = document.getElementById('resendForm');

  if (timerEl) {
    const interval = setInterval(() => {
      seconds--;
      timerEl.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(interval);
        if (timerText) timerText.style.display = 'none';
        if (resendForm) resendForm.style.display = 'block';
      }
    }, 1000);
  }

  // Initial state
  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.style.opacity = '0.6';
  }

  // Focus first box
  if (boxes[0]) boxes[0].focus();
})();