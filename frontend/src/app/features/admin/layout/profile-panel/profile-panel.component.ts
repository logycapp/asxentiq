import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-panel.component.html',
  styleUrl: './profile-panel.component.css'
})
export class ProfilePanelComponent {
  @Input() open = false;
  @Input() userName = 'Shaun Park';
  @Input() userEmail = 'shaun@mail.com';
  @Input() userPhotoUrl = '';
  @Input() companyLogoUrl = '';
  @Input() showAdminAccess = false;
  @Output() close = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  get userInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : '?';
  }
}
