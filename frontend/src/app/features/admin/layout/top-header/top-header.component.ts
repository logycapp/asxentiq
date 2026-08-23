import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ImageFallbackDirective } from '../../../../core/directives/image-fallback.directive';

@Component({
  selector: 'app-top-header',
  standalone: true,
  imports: [CommonModule, ImageFallbackDirective],
  templateUrl: './top-header.component.html',
  styleUrl: './top-header.component.css'
})
export class TopHeaderComponent {
  @Input() themeToggleIcon = 'light_mode';
  @Input() clockLabel = '00:00:00 UTC';
  @Input() userPhotoUrl = '';
  @Input() userName = 'Usuario';
  @Output() toggleTheme = new EventEmitter<void>();
  @Output() openProfilePanel = new EventEmitter<void>();
}
