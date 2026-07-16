import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { MenuItem } from '../../../../core/services/menu.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar-menu.component.html',
  styleUrl: './sidebar-menu.component.css'
})
export class AdminSidebarComponent implements OnInit, OnChanges, OnDestroy {
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();
  private readonly storageKey = 'asxentiq_sidebar_open_submenu';

  @Input() isSidebarCollapsed = false;
  @Input() sidebarBrandLogo = 'assets/template/logos/logo_principal/logo_dark.png';
  @Input() menuItems: MenuItem[] = [];
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleSubmenu = new EventEmitter<{ id: string; button: HTMLElement }>();

  openSubmenuId: string | null = null;

  private iconMap: Record<string, string> = {
    'grid': 'dashboard',
    'gauge-high': 'dashboard',
    'dashboard': 'dashboard',
    'people': 'group',
    'users': 'group',
    'shield-check': 'shield',
    'shield-lock': 'shield',
    'cap': 'school',
    'graduation-cap': 'school',
    'trainings': 'school',
    'notes': 'description',
    'kanban': 'view_column',
    'calendar': 'calendar_month',
    'chat': 'chat',
    'mailbox': 'mail',
    'monitoring': 'monitoring',
    'database': 'database',
    'description': 'description',
    'user-gear': 'settings',
    'screwdriver-wrench': 'build',
  };

  mapIcon(icon: string | null | undefined): string {
    if (!icon) return 'circle';
    return this.iconMap[icon] || icon;
  }

  onToggleSubmenu(id: string, button: HTMLElement): void {
    if (this.openSubmenuId === id) {
      this.openSubmenuId = null;
      this.clearOpenSubmenu();
    } else {
      this.openSubmenuId = id;
      this.saveOpenSubmenu(id);
    }
    this.toggleSubmenu.emit({ id, button });
  }

  isSubmenuOpen(id: string): boolean {
    return this.openSubmenuId === id;
  }

  ngOnInit(): void {
    this.restoreOpenSubmenu();

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => {
          this.syncOpenSubmenuWithRoute();
        })
    );

    this.syncOpenSubmenuWithRoute();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['menuItems']) {
      this.syncOpenSubmenuWithRoute();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  submenuId(item: MenuItem): string {
    return 'submenu-' + item.route.replace(/\//g, '-').replace(/^-/, '');
  }

  trackByRoute(_: number, item: MenuItem): string {
    return item.route;
  }

  trackByChildRoute(_: number, child: MenuItem): string {
    return child.route;
  }

  private restoreOpenSubmenu(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(this.storageKey);
    if (stored) {
      this.openSubmenuId = stored;
    }
  }

  private syncOpenSubmenuWithRoute(): void {
    const routeSubmenuId = this.findSubmenuForCurrentRoute();
    if (routeSubmenuId) {
      this.openSubmenuId = routeSubmenuId;
      this.saveOpenSubmenu(routeSubmenuId);
      return;
    }

    if (!this.openSubmenuId) {
      this.restoreOpenSubmenu();
    }
  }

  private findSubmenuForCurrentRoute(): string | null {
    const currentUrl = this.router.url.split('?')[0].split('#')[0].replace(/\/$/, '');

    for (const item of this.menuItems) {
      if (!item.children?.length) {
        continue;
      }

      const matchesChild = item.children.some((child) => {
        const childRoute = child.route.replace(/\/$/, '');
        return child.exact
          ? currentUrl === childRoute
          : currentUrl === childRoute || currentUrl.startsWith(`${childRoute}/`);
      });

      if (matchesChild) {
        return this.submenuId(item);
      }
    }

    return null;
  }

  private saveOpenSubmenu(id: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.storageKey, id);
  }

  private clearOpenSubmenu(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(this.storageKey);
  }
}
