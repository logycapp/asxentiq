import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { MenuItem } from '../../core/services/menu.service';

@Component({
  selector: 'app-layout-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './layout-navbar.component.html',
  styleUrls: []
})
export class LayoutNavbarComponent {
  @Input() userName = 'Usuario';
  @Input() userEmail = '';
  @Input() userPhotoUrl = '';
  @Input() isCollapsed = true;
  @Input() menuItems: MenuItem[] = [];
  @Input() showAdminAccess = false;
  @Input() menuLoading = false;
  @Input() menuError = '';
  @Input() showBrand = true;
  @Input() showMenu = true;
  @Input() showToggle = true;
  @Input() showProfile = true;

  @Output() toggleRequested = new EventEmitter<void>();
  @Output() closeRequested = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();

  get userInitial(): string {
    return this.userName.charAt(0).toUpperCase();
  }

  requestToggle(): void {
    this.toggleRequested.emit();
  }

  requestClose(): void {
    this.closeRequested.emit();
  }

  requestLogout(): void {
    this.logoutRequested.emit();
  }

  trackByRoute(_: number, item: MenuItem): string {
    return item.route;
  }

  hasChildren(item: MenuItem): boolean {
    return !!(item.children && item.children.length > 0);
  }
}
