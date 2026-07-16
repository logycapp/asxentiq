import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, HostBinding, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, finalize, Subscription, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import { MenuItem, MenuService } from '../../core/services/menu.service';
import { LayoutNavbarComponent } from './layout-navbar.component';
import { AdminSidebarComponent } from '../admin/layout/sidebar-menu/sidebar-menu.component';
import { TopHeaderComponent } from '../admin/layout/top-header/top-header.component';
import { ProfilePanelComponent } from '../admin/layout/profile-panel/profile-panel.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LayoutNavbarComponent,
    AdminSidebarComponent,
    TopHeaderComponent,
    ProfilePanelComponent,
    ModalShellComponent
  ],
  templateUrl: './layout.component.html',
  styleUrls: []
})
export class LayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly mobileBreakpoint = 992;
  private readonly authService = inject(AuthService);
  readonly loadingService = inject(LoadingService);
  private readonly menuService = inject(MenuService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;
  private readonly subscriptions = new Subscription();
  private readonly handleResize = (): void => this.updateViewportMode();
  private readonly expandedMenuRoutes = new Set<string>();
  private floatingSubmenuListenersBound = false;

  @HostBinding('class.layout-shell--dashboard')
  isDashboardRoute = false;

  // Dashboard shell state
  isSidebarCollapsed = false;
  profilePanelOpen = false;
  themeToggleIcon = 'light_mode';
  clockLabel = '00:00:00 UTC';
  sidebarBrandLogo = 'assets/template/logos/logo_principal/logo_dark.png';
  dashboardMenuItems: MenuItem[] = [];

  pageHeading = 'Dashboard';
  isNavbarCollapsed = true;
  isMobileView = false;
  menuLoading = true;
  menuItems: MenuItem[] = [];
  menuError = '';
  searchDialogOpen = false;
  searchTerm = '';

  private clockTimerId: ReturnType<typeof window.setInterval> | null = null;

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.add('dashboard-page', 'bg-primary-container', 'text-on-surface', 'font-body-md', 'overflow-hidden', 'antialiased');
    }

    this.applySavedTheme();
    this.applySavedSidebarState();
    this.updateViewportMode();
    this.updateRouteMode();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize);
    }

    this.updatePageHeading();
    this.loadMenu();
    this.updateClock();

    this.clockTimerId = window.setInterval(() => {
      this.updateClock();
    }, 1000);

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => {
          this.updatePageHeading();
          this.updateRouteMode();
          this.closeNavbar();
        })
    );
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
    }

    if (this.clockTimerId !== null) {
      window.clearInterval(this.clockTimerId);
      this.clockTimerId = null;
    }

    if (typeof document !== 'undefined') {
      document.body.classList.remove('dashboard-page', 'bg-primary-container', 'text-on-surface', 'font-body-md', 'overflow-hidden', 'antialiased');
    }

    this.subscriptions.unsubscribe();
  }

  get userName(): string {
    return this.authService.getCurrentUser()?.name ?? 'Usuario';
  }

  get userEmail(): string {
    return this.authService.getCurrentUser()?.email ?? '';
  }

  get userPhotoUrl(): string {
    const user = this.authService.getCurrentUser();
    return user?.avatar_photo_url ?? user?.profile_photo_url ?? '';
  }

  get menuLayout(): 'top' | 'left' {
    return this.authService.getCurrentUser()?.menu_layout === 'left' ? 'left' : 'top';
  }

  get visibleMenuItems(): MenuItem[] {
    return this.menuItems
      .filter((item) => item.route !== '/admin')
      .sort((a, b) => a.order - b.order);
  }

  get hasAdminAccess(): boolean {
    return this.menuItems.some((item) => item.route === '/admin');
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }

  trackByRoute(_: number, item: MenuItem): string {
    return item.route;
  }

  hasChildren(item: MenuItem): boolean {
    return !!item.children?.length;
  }

  isMenuGroupExpanded(route: string): boolean {
    return this.expandedMenuRoutes.has(route);
  }

  isMenuRouteActive(route: string, exact = false): boolean {
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    const normalizedRoute = route.replace(/\/$/, '');
    const normalizedCurrent = currentUrl.replace(/\/$/, '');

    if (exact) {
      return normalizedCurrent === normalizedRoute;
    }

    return normalizedCurrent === normalizedRoute || normalizedCurrent.startsWith(`${normalizedRoute}/`);
  }

  hasExpandedMenu(): boolean {
    return this.expandedMenuRoutes.size > 0;
  }

  toggleMenuGroup(route: string): void {
    if (this.expandedMenuRoutes.has(route)) {
      this.expandedMenuRoutes.delete(route);
    } else {
      this.expandedMenuRoutes.add(route);
    }
  }

  menuIconClass(item: MenuItem): string {
    const iconByRoute: Record<string, string> = {
      '/dashboard': 'fa-solid fa-gauge-high',
      '/admin': 'fa-solid fa-screwdriver-wrench',
      '/profile': 'fa-solid fa-user-gear',
      '/roles': 'fa-solid fa-shield-halved',
      '/test': 'fa-solid fa-vial-circle-check',
      '/users': 'fa-solid fa-users',
      '/trainings': 'fa-solid fa-graduation-cap'
    };

    const normalizedRoute = item.route.replace(/\/$/, '');
    return iconByRoute[normalizedRoute] || this.menuIconClassByLabel(item.label, item.icon);
  }

  private menuIconClassByLabel(label: string, icon?: string | null): string {
    if (icon) {
      switch (icon) {
        case 'grid':
          return 'fa-solid fa-gauge-high';
        case 'people':
          return 'fa-solid fa-users';
        case 'shield-check':
          return 'fa-solid fa-shield-halved';
        case 'shield-lock':
          return 'fa-solid fa-screwdriver-wrench';
        case 'cap':
          return 'fa-solid fa-graduation-cap';
        default:
          break;
      }
    }

    const normalizedLabel = label.toLowerCase();
    if (normalizedLabel.includes('dashboard')) return 'fa-solid fa-gauge-high';
    if (normalizedLabel.includes('administr')) return 'fa-solid fa-screwdriver-wrench';
    if (normalizedLabel.includes('perfil')) return 'fa-solid fa-user-gear';
    if (normalizedLabel.includes('rol')) return 'fa-solid fa-shield-halved';
    if (normalizedLabel.includes('usuario')) return 'fa-solid fa-users';
    if (normalizedLabel.includes('capacit')) return 'fa-solid fa-graduation-cap';
    if (normalizedLabel.includes('prueba')) return 'fa-solid fa-vial-circle-check';

    return 'fa-regular fa-circle';
  }

  toggleNavbar(): void {
    this.isNavbarCollapsed = !this.isNavbarCollapsed;
  }

  openSearchDialog(): void {
    this.searchDialogOpen = true;
  }

  closeSearchDialog(): void {
    this.searchDialogOpen = false;
  }

  closeNavbar(): void {
    this.isNavbarCollapsed = true;
    this.expandedMenuRoutes.clear();
  }

  closeSidebarMenus(): void {
    this.expandedMenuRoutes.clear();
  }

  logout(): void {
    this.loadingService.track(this.authService.logout()).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/login']);
      }
    });
  }

  private updatePageHeading(): void {
    let route = this.router.routerState.snapshot.root;

    while (route.firstChild) {
      route = route.firstChild;
    }

    this.pageHeading = typeof route.data['pageTitle'] === 'string' ? route.data['pageTitle'] : 'Dashboard';
  }

  private updateRouteMode(): void {
    const currentUrl = this.router.url.split('?')[0].split('#')[0].replace(/\/$/, '');
    // All authenticated routes use the dashboard shell
    this.isDashboardRoute = true;
  }

  private updateViewportMode(): void {
    if (typeof window === 'undefined') {
      this.isMobileView = false;
      return;
    }

    this.isMobileView = window.innerWidth < this.mobileBreakpoint;

    if (!this.isMobileView) {
      this.closeNavbar();
    }
  }

  ngAfterViewInit(): void {
    this.bindFloatingSubmenuListeners();
  }

  toggleDashboardSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    const fp = document.getElementById('floating-popover');
    fp?.classList.remove('active');
    if (this.isSidebarCollapsed) {
      document.querySelectorAll('.submenu').forEach((s) => s.classList.remove('open'));
      document.querySelectorAll('.expand-icon').forEach((i) => i.classList.remove('rotated'));
    }

    // Persist sidebar state to localStorage immediately
    this.persistSidebarState();
  }

  private persistSidebarState(): void {
    // Save to localStorage immediately so it survives reloads
    const user = this.authService.getCurrentUser();
    if (user) {
      user.sidebar_collapsed = this.isSidebarCollapsed;
      localStorage.setItem('asxentiq_user', JSON.stringify(user));
    }

    // Also persist to backend (fire and forget)
    this.http.post(`${this.apiUrl}/theme`, { sidebar_collapsed: this.isSidebarCollapsed ? 1 : 0 }).subscribe();
  }

  toggleSubmenu(id: string, button: HTMLElement): void {
    const sidebar = document.getElementById('sidebar');
    if (sidebar?.classList.contains('sidebar-collapsed')) return;

    const submenu = document.getElementById(id);
    const icon = button.querySelector('.expand-icon');
    if (!submenu || !icon) return;

    const isOpen = submenu.classList.contains('open');
    submenu.classList.toggle('open');
    icon.classList.toggle('rotated');
  }

  toggleMobileSidebar(): void {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    if (sidebar?.classList.contains('sidebar-open')) {
      sidebar.classList.remove('sidebar-open');
      overlay?.classList.remove('active');
      document.body.style.overflow = '';
    } else {
      sidebar?.classList.add('sidebar-open');
      overlay?.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeMobileSidebar(): void {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    sidebar?.classList.remove('sidebar-open');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  }

  openProfilePanel(): void {
    this.profilePanelOpen = true;
  }

  closeProfilePanel(): void {
    this.profilePanelOpen = false;
  }

  toggleTheme(): void {
    if (typeof document === 'undefined') return;

    const htmlElement = document.documentElement;
    const isDark = htmlElement.classList.toggle('dark');
    htmlElement.classList.toggle('light', !isDark);
    this.themeToggleIcon = isDark ? 'light_mode' : 'dark_mode';
    this.sidebarBrandLogo = isDark
      ? 'assets/template/logos/logo_principal/logo_dark.png'
      : 'assets/template/logos/logo_principal/logo_light.png';

    // Save theme preference to backend
    const mode = isDark ? 'dark' : 'light';
    this.authService.me().pipe(
      tap((response) => {
        if (response.user) {
          response.user.theme_mode = mode;
          localStorage.setItem('asxentiq_user', JSON.stringify(response.user));
        }
      })
    ).subscribe();

    this.http.post(`${this.apiUrl}/theme`, { theme_mode: mode }).subscribe();
  }

  private applySavedSidebarState(): void {
    if (typeof document === 'undefined') return;

    const user = this.authService.getCurrentUser();
    const collapsed = user?.sidebar_collapsed === true || user?.sidebar_collapsed === 1;
    this.isSidebarCollapsed = collapsed;

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('sidebar-collapsed', collapsed);
    }
  }

  private applySavedTheme(): void {
    if (typeof document === 'undefined') return;

    const user = this.authService.getCurrentUser();
    const preferredMode = user?.theme_mode || 'dark';
    const htmlElement = document.documentElement;

    htmlElement.classList.toggle('dark', preferredMode === 'dark');
    htmlElement.classList.toggle('light', preferredMode === 'light');
    this.themeToggleIcon = preferredMode === 'dark' ? 'light_mode' : 'dark_mode';
    this.sidebarBrandLogo = preferredMode === 'dark'
      ? 'assets/template/logos/logo_principal/logo_dark.png'
      : 'assets/template/logos/logo_principal/logo_light.png';
  }

  private updateClock(): void {
    const now = new Date();
    this.clockLabel = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')} UTC`;
  }

  private loadMenu(): void {
    this.menuError = '';
    this.menuLoading = true;

    this.subscriptions.add(
      this.loadingService
        .track(this.menuService.list())
        .pipe(finalize(() => (this.menuLoading = false)))
        .subscribe({
          next: (items) => {
            this.menuItems = items;
            this.dashboardMenuItems = items;
            window.setTimeout(() => this.bindFloatingSubmenuListeners(), 0);
          },
          error: () => {
            this.menuItems = [];
            this.dashboardMenuItems = [];
            this.menuError = 'No fue posible cargar el menu.';
          }
        })
    );
  }

  private bindFloatingSubmenuListeners(): void {
    if (typeof document === 'undefined' || this.floatingSubmenuListenersBound) {
      return;
    }

    const holders = document.querySelectorAll('.has-submenu');
    if (!holders.length) {
      return;
    }

    holders.forEach((holder) => {
      holder.addEventListener('mouseenter', () => {
        const sidebar = document.getElementById('sidebar');
        const floatingPopover = document.getElementById('floating-popover');
        if (!sidebar?.classList.contains('sidebar-collapsed') || !floatingPopover) return;

        const submenuId = holder.getAttribute('data-submenu-id');
        const originalSubmenu = submenuId ? document.getElementById(submenuId) : null;
        if (!originalSubmenu) return;

        const floatingPopoverContent = document.getElementById('floating-popover-content');
        if (!floatingPopoverContent) return;

        floatingPopoverContent.innerHTML = '';
        const title = holder.querySelector('.sidebar-text')?.textContent || '';
        const titleEl = document.createElement('div');
        titleEl.className = 'px-4 py-2 text-[10px] font-bold sidebar-floating-submenu-title uppercase tracking-wider border-b border-white/5 mb-1';
        titleEl.textContent = title;
        floatingPopoverContent.appendChild(titleEl);

        originalSubmenu.querySelectorAll('a').forEach((link) => {
          const newLink = link.cloneNode(true) as HTMLAnchorElement;
          newLink.className = 'flex items-center gap-md py-2.5 px-4 sidebar-floating-submenu-link hover:text-primary hover:bg-white/5 font-label-sm transition-all rounded';
          floatingPopoverContent.appendChild(newLink);
        });

        const rect = holder.getBoundingClientRect();
        floatingPopover.style.top = `${rect.top}px`;
        floatingPopover.classList.add('active');
      });

      holder.addEventListener('mouseleave', () => {
        window.setTimeout(() => {
          const fp = document.getElementById('floating-popover');
          if (fp && !fp.matches(':hover')) fp.classList.remove('active');
        }, 50);
      });
    });

    const fp = document.getElementById('floating-popover');
    fp?.addEventListener('mouseleave', () => fp.classList.remove('active'));

    this.floatingSubmenuListenersBound = true;
  }
}
