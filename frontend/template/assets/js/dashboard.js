// Dashboard interactions
const floatingPopover = document.getElementById('floating-popover');
const floatingPopoverContent = document.getElementById('floating-popover-content');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');
const sidebarToggle = document.getElementById('sidebar-toggle');
const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
const mobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');
const toggleIcon = document.getElementById('toggle-icon');
const collapsedLogo = document.querySelector('.sidebar-collapsed-logo');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const htmlElement = document.documentElement;
const sidebarBrandLogo = document.getElementById('sidebar-brand-logo');
const profileTrigger = document.getElementById('sidebar-profile-trigger');
const profilePanel = document.getElementById('profile-panel');

function updateSidebarBrandLogo() {
  if (!sidebarBrandLogo) return;
  sidebarBrandLogo.src = htmlElement.classList.contains('light')
    ? 'logos/logo_principal/logo_light_v2.png'
    : 'logos/logo_principal/logo_dark.png';
}

function handleFloatingSubmenu() {
  document.querySelectorAll('.has-submenu').forEach((holder) => {
    holder.addEventListener('mouseenter', () => {
      if (!sidebar.classList.contains('sidebar-collapsed')) return;

      const submenuId = holder.getAttribute('data-submenu-id');
      const originalSubmenu = document.getElementById(submenuId);
      if (!originalSubmenu) return;

      floatingPopoverContent.innerHTML = '';

      const title = holder.querySelector('.sidebar-text')?.innerText || '';
      const titleEl = document.createElement('div');
      titleEl.className =
        'px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-white/5 mb-1';
      titleEl.innerText = title;
      floatingPopoverContent.appendChild(titleEl);

      originalSubmenu.querySelectorAll('a').forEach((link) => {
        const newLink = link.cloneNode(true);
        newLink.className =
          'flex items-center gap-md py-2.5 px-4 text-on-surface-variant hover:text-primary hover:bg-white/5 font-label-sm transition-all rounded';
        floatingPopoverContent.appendChild(newLink);
      });

      const rect = holder.getBoundingClientRect();
      floatingPopover.style.top = `${rect.top}px`;
      floatingPopover.classList.add('active');
    });

    holder.addEventListener('mouseleave', () => {
      setTimeout(() => {
        if (!floatingPopover.matches(':hover')) {
          floatingPopover.classList.remove('active');
        }
      }, 50);
    });
  });

  floatingPopover.addEventListener('mouseleave', () => {
    floatingPopover.classList.remove('active');
  });
}

function toggleSubmenu(id, btn) {
  if (sidebar.classList.contains('sidebar-collapsed')) return;

  const submenu = document.getElementById(id);
  const icon = btn.querySelector('.expand-icon');
  const isOpen = submenu.classList.contains('open');

  if (!isOpen) {
    submenu.classList.add('open');
    icon.classList.add('rotated');
  } else {
    submenu.classList.remove('open');
    icon.classList.remove('rotated');
  }
}

function isMobileViewport() {
  return window.innerWidth <= 900;
}

function openMobileSidebar() {
  sidebar.classList.add('sidebar-open');
  mobileSidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  sidebar.classList.remove('sidebar-open');
  mobileSidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

function openProfilePanel() {
  if (!profilePanel) return;
  profilePanel.classList.remove('translate-x-full', 'invisible', 'opacity-0');
}

function closeProfilePanel() {
  if (!profilePanel) return;
  profilePanel.classList.add('translate-x-full', 'invisible', 'opacity-0');
}

handleFloatingSubmenu();
updateSidebarBrandLogo();

sidebarToggle?.addEventListener('click', () => {
  if (isMobileViewport()) {
    closeMobileSidebar();
    return;
  }

  const isCollapsed = sidebar.classList.toggle('sidebar-collapsed');
  mainContent.classList.toggle('main-content-collapsed');

  floatingPopover.classList.remove('active');
  toggleIcon.textContent = isCollapsed ? 'dock_to_right' : 'dock_to_left';

  if (collapsedLogo) {
    if (isCollapsed) {
      collapsedLogo.classList.remove('hidden');
      document.querySelectorAll('.submenu').forEach((s) => s.classList.remove('open'));
      document.querySelectorAll('.expand-icon').forEach((i) => i.classList.remove('rotated'));
    } else {
      collapsedLogo.classList.add('hidden');
    }
  }
});

mobileSidebarToggle?.addEventListener('click', () => {
  if (sidebar.classList.contains('sidebar-open')) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
});

mobileSidebarOverlay?.addEventListener('click', closeMobileSidebar);

profileTrigger?.addEventListener('click', openProfilePanel);

document.querySelector('#profile-panel button')?.addEventListener('click', closeProfilePanel);

document.querySelectorAll('#sidebar-nav a, #sidebar-nav button').forEach((item) => {
  item.addEventListener('click', () => {
    if (isMobileViewport()) closeMobileSidebar();
  });
});

window.addEventListener('resize', () => {
  if (!isMobileViewport()) {
    closeMobileSidebar();
  }
});

themeToggle?.addEventListener('click', () => {
  const isDark = htmlElement.classList.toggle('dark');
  htmlElement.classList.toggle('light', !isDark);
  themeToggleIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
  updateSidebarBrandLogo();
});

function updateClock() {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  const clockEl = document.getElementById('terminal-clock');
  if (clockEl) clockEl.textContent = `${hours}:${minutes}:${seconds} UTC`;
}

setInterval(updateClock, 1000);
updateClock();

function initSearchableSelects() {
  document.querySelectorAll('[data-searchable-select], [data-time-picker]').forEach((root) => {
    const trigger = root.querySelector('.searchable-select-trigger');
    const label = root.querySelector('.searchable-select-label');
    const hidden = root.querySelector('input[type="hidden"]');
    const search = root.querySelector('.searchable-select-search');
    const panel = root.querySelector('.searchable-select-panel');
    const options = Array.from(root.querySelectorAll('.searchable-select-option'));

    if (!trigger || !label || !hidden || !search || !panel || !options.length) return;

    const setOpen = (open) => {
      root.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', String(open));
      if (open) {
        window.requestAnimationFrame(() => search.focus());
      }
    };

    const filterOptions = (term) => {
      const query = term.trim().toLowerCase();
      options.forEach((option) => {
        const value = option.dataset.value?.toLowerCase() || '';
        option.hidden = Boolean(query && !value.includes(query));
      });
    };

    const selectValue = (value) => {
      hidden.value = value;
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
      label.textContent = value;
      search.value = '';
      filterOptions('');
      setOpen(false);
    };

    trigger.addEventListener('click', () => {
      setOpen(!root.classList.contains('open'));
    });

    search.addEventListener('input', (event) => {
      filterOptions(event.target.value);
    });

    options.forEach((option) => {
      option.addEventListener('click', () => {
        selectValue(option.dataset.value || option.textContent.trim());
      });
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    });

    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) {
        setOpen(false);
      }
    });
  });
}

function initMonthPickers() {
  const months = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];

  const pad2 = (value) => String(value).padStart(2, '0');

  document.querySelectorAll('[data-month-picker]').forEach((root) => {
    const trigger = root.querySelector('.month-picker-trigger');
    const label = root.querySelector('.month-picker-label');
    const hidden = root.querySelector('input[type="hidden"]');
    const yearLabel = root.querySelector('[data-month-year]');
    const monthsGrid = root.querySelector('[data-month-months]');
    const prevBtn = root.querySelector('[data-month-prev]');
    const nextBtn = root.querySelector('[data-month-next]');

    if (!trigger || !label || !hidden || !yearLabel || !monthsGrid || !prevBtn || !nextBtn) return;

    const state = {
      selectedMonth: null,
      selectedYear: null,
      viewYear: new Date().getFullYear(),
    };

    const setOpen = (open) => {
      root.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', String(open));
    };

    const updateLabel = () => {
      if (state.selectedMonth !== null && state.selectedYear !== null) {
        label.textContent = `${months[state.selectedMonth]} ${state.selectedYear}`;
        hidden.value = `${state.selectedYear}-${pad2(state.selectedMonth + 1)}`;
      } else {
        label.textContent = 'Selecciona un mes';
        hidden.value = '';
      }

      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const selectMonth = (monthIndex) => {
      state.selectedMonth = monthIndex;
      state.selectedYear = state.viewYear;
      renderMonths();
      updateLabel();
    };

    function renderMonths() {
      yearLabel.textContent = String(state.viewYear);
      monthsGrid.innerHTML = '';

      months.forEach((monthName, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'month-picker-month';
        button.textContent = monthName;
        if (state.selectedMonth === index && state.selectedYear === state.viewYear) {
          button.classList.add('is-selected');
        }
        button.addEventListener('click', () => selectMonth(index));
        monthsGrid.appendChild(button);
      });
    }

    prevBtn.addEventListener('click', () => {
      state.viewYear -= 1;
      renderMonths();
    });

    nextBtn.addEventListener('click', () => {
      state.viewYear += 1;
      renderMonths();
    });

    trigger.addEventListener('click', () => {
      const shouldOpen = !root.classList.contains('open');
      if (shouldOpen) renderMonths();
      setOpen(shouldOpen);
    });

    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) {
        setOpen(false);
      }
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    });

    const initialValue = hidden.value;
    if (initialValue && /^\d{4}-\d{2}$/.test(initialValue)) {
      const [year, month] = initialValue.split('-').map(Number);
      state.selectedYear = year;
      state.selectedMonth = month - 1;
      state.viewYear = year;
    } else {
      state.viewYear = new Date().getFullYear();
    }

    renderMonths();
    updateLabel();
  });
}
function initDateTimePickers() {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const weekDays = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];

  const pad2 = (value) => String(value).padStart(2, '0');

  const formatDisplayDate = (date) => {
    if (!date) return '';
    const day = pad2(date.getDate());
    const month = pad2(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const buildValue = (date, time) => {
    if (!date || !time) return '';
    const datePart = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    return `${datePart}T${time}`;
  };

  document.querySelectorAll('[data-datetime-picker]').forEach((root) => {
    const trigger = root.querySelector('.datetime-picker-trigger');
    const label = root.querySelector('.datetime-picker-label');
    const hidden = root.querySelector('input[type="hidden"]');
    const panel = root.querySelector('.datetime-picker-panel');
    const monthLabel = root.querySelector('[data-datetime-month]');
    const daysGrid = root.querySelector('[data-datetime-days]');
    const timesGrid = root.querySelector('[data-datetime-times]');
    const timeLabel = root.querySelector('[data-datetime-time-label]');
    const prevBtn = root.querySelector('[data-datetime-prev]');
    const nextBtn = root.querySelector('[data-datetime-next]');

    if (!trigger || !label || !hidden || !panel || !monthLabel || !daysGrid || !timesGrid || !timeLabel || !prevBtn || !nextBtn) {
      return;
    }

    const timeSlots = [];
    for (let hour = 8; hour <= 17; hour += 1) {
      timeSlots.push(`${pad2(hour)}:00`);
      timeSlots.push(`${pad2(hour)}:30`);
    }
    timeSlots.push('18:00');

    const state = {
      selectedDate: null,
      selectedTime: null,
      viewDate: new Date(),
    };

    const setOpen = (open) => {
      root.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', String(open));
    };

    const updateLabel = () => {
      if (state.selectedWeek) {
        label.textContent = `Semana ${pad2(state.selectedWeek.week)} - ${state.selectedWeek.year}`;
        hidden.value = getWeekValue(state.selectedWeek);
      } else {
        label.textContent = 'Selecciona una semana';
        hidden.value = '';
      }

      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const selectWeek = (weekInfo) => {
      state.selectedWeek = weekInfo;
      renderWeeks();
      updateLabel();
    };

    const buildWeekRows = () => {
      const year = state.viewDate.getFullYear();
      const month = state.viewDate.getMonth();
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      const start = getMonday(first);
      const end = getMonday(last);
      const rows = [];
      const cursor = new Date(start);

      while (cursor <= end) {
        const weekInfo = getISOWeekInfo(cursor);
        const rangeStart = new Date(cursor);
        const rangeEnd = new Date(cursor);
        rangeEnd.setDate(rangeEnd.getDate() + 6);
        rows.push({ weekInfo, rangeStart, rangeEnd });
        cursor.setDate(cursor.getDate() + 7);
      }

      return rows;
    };

    function renderWeeks() {
      const month = state.viewDate.getMonth();
      const year = state.viewDate.getFullYear();
      monthLabel.textContent = `${months[month]} ${year}`;
      weeksGrid.innerHTML = '';

      buildWeekRows().forEach(({ weekInfo, rangeStart, rangeEnd }) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'week-picker-week';
        row.dataset.week = getWeekValue(weekInfo);

        if (state.selectedWeek && state.selectedWeek.week === weekInfo.week && state.selectedWeek.year === weekInfo.year) {
          row.classList.add('is-selected');
        }

        const weekNumber = document.createElement('span');
        weekNumber.className = 'week-number';
        weekNumber.textContent = `S${pad2(weekInfo.week)}`;
        row.appendChild(weekNumber);

        const range = document.createElement('span');
        range.className = 'week-range';
        range.textContent = formatRange(rangeStart, rangeEnd);
        row.appendChild(range);

        row.addEventListener('click', () => selectWeek(weekInfo));
        weeksGrid.appendChild(row);
      });
    }

    prevBtn.addEventListener('click', () => {
      state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1);
      renderWeeks();
    });

    nextBtn.addEventListener('click', () => {
      state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1);
      renderWeeks();
    });

    trigger.addEventListener('click', () => {
      const shouldOpen = !root.classList.contains('open');
      if (shouldOpen) renderWeeks();
      setOpen(shouldOpen);
    });

    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) {
        setOpen(false);
      }
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    });

    const initialValue = hidden.value;
    if (initialValue && /^\d{4}-W\d{2}$/.test(initialValue)) {
      const [weekYear, weekPart] = initialValue.split('-W');
      const week = Number(weekPart);
      state.selectedWeek = { year: Number(weekYear), week };
      state.viewDate = new Date(Number(weekYear), 0, 1);
    } else {
      state.viewDate = new Date();
    }

    renderWeeks();
    updateLabel();
  });
}

function initDatePickers() {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const weekDays = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];

  const pad2 = (value) => String(value).padStart(2, '0');

  const formatDisplayDate = (date) => {
    if (!date) return '';
    const day = pad2(date.getDate());
    const month = pad2(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  document.querySelectorAll('[data-date-picker]').forEach((root) => {
    const trigger = root.querySelector('.date-picker-trigger');
    const label = root.querySelector('.date-picker-label');
    const hidden = root.querySelector('input[type="hidden"]');
    const monthLabel = root.querySelector('[data-date-month]');
    const daysGrid = root.querySelector('[data-date-days]');
    const prevBtn = root.querySelector('[data-date-prev]');
    const nextBtn = root.querySelector('[data-date-next]');

    if (!trigger || !label || !hidden || !monthLabel || !daysGrid || !prevBtn || !nextBtn) return;

    const state = {
      selectedDate: null,
      viewDate: new Date(),
    };

    const setOpen = (open) => {
      root.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', String(open));
    };

    const updateLabel = () => {
      label.textContent = state.selectedDate ? formatDisplayDate(state.selectedDate) : 'Selecciona una fecha';
      hidden.value = state.selectedDate
        ? `${state.selectedDate.getFullYear()}-${pad2(state.selectedDate.getMonth() + 1)}-${pad2(state.selectedDate.getDate())}`
        : '';
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const selectDate = (date) => {
      state.selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      state.viewDate = new Date(date.getFullYear(), date.getMonth(), 1);
      renderCalendar();
      updateLabel();
    };

    function renderCalendar() {
      const year = state.viewDate.getFullYear();
      const month = state.viewDate.getMonth();
      monthLabel.textContent = `${months[month]} ${year}`;
      daysGrid.innerHTML = '';

      weekDays.forEach((day) => {
        const header = document.createElement('span');
        header.textContent = day;
        daysGrid.appendChild(header);
      });

      const firstDay = new Date(year, month, 1);
      const startOffset = (firstDay.getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const prevMonthDays = new Date(year, month, 0).getDate();

      for (let i = startOffset - 1; i >= 0; i -= 1) {
        const day = prevMonthDays - i;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'date-picker-day is-muted';
        button.textContent = String(day);
        button.disabled = true;
        daysGrid.appendChild(button);
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'date-picker-day';
        button.textContent = String(day);

        const currentDate = new Date(year, month, day);
        if (
          state.selectedDate &&
          currentDate.getFullYear() === state.selectedDate.getFullYear() &&
          currentDate.getMonth() === state.selectedDate.getMonth() &&
          currentDate.getDate() === state.selectedDate.getDate()
        ) {
          button.classList.add('is-selected');
        }

        button.addEventListener('click', () => selectDate(currentDate));
        daysGrid.appendChild(button);
      }

      const totalCells = daysGrid.children.length;
      const trailingCells = (7 - (totalCells % 7)) % 7;
      for (let i = 1; i <= trailingCells; i += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'date-picker-day is-muted';
        button.textContent = String(i);
        button.disabled = true;
        daysGrid.appendChild(button);
      }
    }

    prevBtn.addEventListener('click', () => {
      state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1);
      renderCalendar();
    });

    nextBtn.addEventListener('click', () => {
      state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1);
      renderCalendar();
    });

    trigger.addEventListener('click', () => {
      const shouldOpen = !root.classList.contains('open');
      if (shouldOpen) renderCalendar();
      setOpen(shouldOpen);
    });

    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) {
        setOpen(false);
      }
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    });

    const initialValue = hidden.value;
    if (initialValue && /^\d{4}-\d{2}-\d{2}$/.test(initialValue)) {
      const [year, month, day] = initialValue.split('-').map(Number);
      state.selectedDate = new Date(year, month - 1, day);
      state.viewDate = new Date(year, month - 1, 1);
    } else {
      state.viewDate = new Date();
    }

    renderCalendar();
    updateLabel();
  });
}

initSearchableSelects();
initMonthPickers();
initWeekPickers();
initDatePickers();
initDateTimePickers();
document.querySelectorAll('.glass-card').forEach((card) => {
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-2px)';
    card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0px)';
  });
});















