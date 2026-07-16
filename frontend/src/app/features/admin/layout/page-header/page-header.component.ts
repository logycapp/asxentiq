import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.css'
})
export class PageHeaderComponent {
  @Input() title = 'Dashboard Overview';
  @Input() subtitle = '';
  @Input() rangeLabel = 'Oct 01, 2023 - Oct 31, 2023';
  @Input() showDateFilter = true;
}
