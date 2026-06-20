import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, finalize, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LoadingService } from '../../core/services/loading.service';
import { MenuItem, MenuService } from '../../core/services/menu.service';
import { LayoutNavbarComponent } from './layout-navbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, LayoutNavbarComponent],
  templateUrl: './layout.component.html'
})
export class LayoutComponent implements OnInit, OnDestroy {
  private readonly mobileBreakpoint = 992;
  private readonly authService = inject(AuthService);
  readonly loadingService = inject(LoadingService);
  private readonly menuService = inject(MenuService);
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();
  private readonly handleResize = (): void => this.updateViewportMode();
  private readonly expandedMenuRoutes = new Set<string>();

  pageHeading = 'Dashboard';
  isNavbarCollapsed = true;
  isMobileView = false;
  menuLoading = true;
  menuItems: MenuItem[] = [];
  menuError = '';

  ngOnInit(): void {
    this.updateViewportMode();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize);
    }

    this.updatePageHeading();
    this.loadMenu();

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => {
          this.updatePageHeading();
          this.closeNavbar();
        })
    );
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
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
    return this.menuItems.filter((item) => item.route !== '/admin');
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
          },
          error: () => {
            this.menuItems = [];
            this.menuError = 'No fue posible cargar el menu.';
          }
        })
    );
  }
}
