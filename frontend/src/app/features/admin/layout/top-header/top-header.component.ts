import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-top-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-header.component.html',
  styleUrl: './top-header.component.css'
})
export class TopHeaderComponent {
  @Input() themeToggleIcon = 'light_mode';
  @Input() clockLabel = '00:00:00 UTC';
  @Output() toggleTheme = new EventEmitter<void>();
  @Output() openProfilePanel = new EventEmitter<void>();
}