// ===== CLIENT-SIDE FILTER & SEARCH HELPERS =====

(function () {

  // ===== LIVE SEARCH (filters a list without page reload) =====
  function initLiveSearch(inputSelector, cardSelector, fields) {
    const input = document.querySelector(inputSelector);
    if (!input) return;

    input.addEventListener('input', function () {
      const term = this.value.toLowerCase().trim();
      const cards = document.querySelectorAll(cardSelector);

      cards.forEach(card => {
        if (!term) {
          card.style.display = '';
          return;
        }
        const text = fields
          .map(f => card.dataset[f] || card.querySelector(f)?.textContent || '')
          .join(' ')
          .toLowerCase();

        card.style.display = text.includes(term) ? '' : 'none';
      });

      updateResultCount(cardSelector);
    });
  }

  // ===== RESULT COUNT =====
  function updateResultCount(cardSelector) {
    const counter = document.getElementById('resultCount');
    if (!counter) return;
    const visible = document.querySelectorAll(`${cardSelector}:not([style*="display: none"])`).length;
    counter.textContent = visible;
  }

  // ===== TAG FILTER (click a tag to filter by it) =====
  function initTagFilter(tagSelector, cardSelector, tagDataAttr) {
    const tags = document.querySelectorAll(tagSelector);
    tags.forEach(tag => {
      tag.addEventListener('click', function () {
        const activeTag = document.querySelector(`${tagSelector}.tag-active`);
        if (activeTag === this) {
          // Deactivate
          this.classList.remove('tag-active');
          document.querySelectorAll(cardSelector).forEach(c => c.style.display = '');
          return;
        }
        if (activeTag) activeTag.classList.remove('tag-active');
        this.classList.add('tag-active');

        const filterVal = this.dataset.filter || this.textContent.trim().toLowerCase();
        document.querySelectorAll(cardSelector).forEach(card => {
          const val = card.dataset[tagDataAttr] || '';
          card.style.display = val.toLowerCase().includes(filterVal) ? '' : 'none';
        });
        updateResultCount(cardSelector);
      });
    });
  }

  // ===== SORT CARDS IN-PAGE =====
  function initClientSort(selectSelector, containerSelector, cardSelector) {
    const select = document.querySelector(selectSelector);
    if (!select) return;
    select.addEventListener('change', function () {
      const container = document.querySelector(containerSelector);
      if (!container) return;
      const cards = Array.from(container.querySelectorAll(cardSelector));
      const [field, dir] = this.value.split(':');

      cards.sort((a, b) => {
        const aVal = a.dataset[field] || a.querySelector(`[data-sort="${field}"]`)?.textContent || '';
        const bVal = b.dataset[field] || b.querySelector(`[data-sort="${field}"]`)?.textContent || '';
        const aNum = parseFloat(aVal.replace(/[^0-9.]/g, ''));
        const bNum = parseFloat(bVal.replace(/[^0-9.]/g, ''));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return dir === 'asc' ? aNum - bNum : bNum - aNum;
        }
        return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });

      cards.forEach(c => container.appendChild(c));
    });
  }

  // ===== BUDGET RANGE SLIDER SYNC =====
  function initRangeSync(rangeId, displayId, prefix) {
    const range = document.getElementById(rangeId);
    const display = document.getElementById(displayId);
    if (!range || !display) return;
    range.addEventListener('input', () => {
      display.textContent = (prefix || '') + Number(range.value).toLocaleString('en-IN');
    });
  }

  // ===== AUTO-SUBMIT FILTER FORM ON SELECT CHANGE =====
  function initAutoSubmitFilters(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('select').forEach(sel => {
      sel.addEventListener('change', () => form.submit());
    });
  }

  // ===== SKILL CHIPS INPUT (add/remove tags) =====
  function initSkillChipsInput(inputId, containerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    if (!input || !container) return;

    function renderChips() {
      const skills = input.value.split(',').map(s => s.trim()).filter(Boolean);
      container.innerHTML = skills.map((sk, i) => `
        <span class="skill-tag-pill">
          ${sk}
          <button type="button" onclick="removeSkillAt(${i}, '${inputId}', '${containerId}')" class="skill-tag-remove">×</button>
        </span>
      `).join('');
    }

    window.removeSkillAt = function (idx, inId, conId) {
      const inp = document.getElementById(inId);
      const con = document.getElementById(conId);
      if (!inp) return;
      const skills = inp.value.split(',').map(s => s.trim()).filter(Boolean);
      skills.splice(idx, 1);
      inp.value = skills.join(', ');
      if (con) initSkillChipsInput(inId, conId);
    };

    input.addEventListener('input', renderChips);
    renderChips();
  }

  // ===== EXPOSE TO GLOBAL SCOPE =====
  window.FilterHelpers = {
    initLiveSearch,
    initTagFilter,
    initClientSort,
    initRangeSync,
    initAutoSubmitFilters,
    initSkillChipsInput,
    updateResultCount
  };

  // ===== AUTO-INIT from data attributes =====
  document.addEventListener('DOMContentLoaded', () => {
    // Auto-submit filter forms that have data-auto-submit
    document.querySelectorAll('form[data-auto-submit]').forEach(form => {
      form.querySelectorAll('select').forEach(sel => {
        sel.addEventListener('change', () => form.submit());
      });
    });

    // Debounce search inputs in filter forms
    document.querySelectorAll('input[data-debounce-submit]').forEach(input => {
      let timer;
      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          input.closest('form')?.submit();
        }, 500);
      });
    });
  });

})();