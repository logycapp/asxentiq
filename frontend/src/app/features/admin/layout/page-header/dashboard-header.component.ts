import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.css'
})
export class DashboardHeaderComponent {
  @Input() title = 'Dashboard Overview';
  @Input() subtitle = '';
  @Input() rangeLabel = 'Oct 01, 2023 - Oct 31, 2023';
}
