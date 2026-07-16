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

document.querySelectorAll('.glass-card').forEach((card) => {
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-2px)';
    card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0px)';
  });
});




