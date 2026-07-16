import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-right-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-right-menu.component.html',
  styleUrl: './dashboard-right-menu.component.css'
})
export class DashboardRightMenuComponent {
  @Input() open = false;
  @Input() userName = 'Usuario';
  @Input() userEmail = '';
  @Input() userPhotoUrl = '';
  @Output() close = new EventEmitter<void>();

  get userInitial(): string {
    return this.userName.charAt(0).toUpperCase();
  }
}
