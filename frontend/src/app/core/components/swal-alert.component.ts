import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertPosition } from 'sweetalert2';

type AlertTone = 'success' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-swal-alert',
  standalone: true,
  template: ''
})
export class SwalAlertComponent implements OnChanges {
  @Input() message = '';
  @Input() type: AlertTone = 'success';
  @Input() title = '';
  @Input() timer = 3200;
  @Input() position: SweetAlertPosition = 'top-end';
  @Input() showCloseButton = true;
  @Output() closed = new EventEmitter<void>();

  private lastShownMessage = '';
  private showing = false;

  ngOnChanges(): void {
    if (!this.message || this.message === this.lastShownMessage || this.showing) {
      return;
    }

    this.lastShownMessage = this.message;
    void this.fireToast(this.message, this.type);
  }

  private async fireToast(message: string, type: AlertTone): Promise<void> {
    this.showing = true;

    const config = this.getToastConfig(type);
    const result = await Swal.fire({
      toast: true,
      position: this.position,
      showConfirmButton: false,
      showCloseButton: this.showCloseButton,
      timer: this.timer,
      timerProgressBar: true,
      icon: config.icon,
      title: this.title || undefined,
      text: message,
      background: config.background,
      color: config.color,
      iconColor: config.iconColor,
      customClass: {
        popup: `asxentiq-toast asxentiq-toast-${type}`
      }
    });

    this.showing = false;
    this.closed.emit();

    if (result.dismiss === Swal.DismissReason.timer || result.dismiss === Swal.DismissReason.close) {
      this.lastShownMessage = '';
    }
  }

  private getToastConfig(type: AlertTone): {
    icon: SweetAlertIcon;
    background: string;
    color: string;
    iconColor: string;
  } {
    switch (type) {
      case 'danger':
        return {
          icon: 'error',
          background: 'linear-gradient(135deg, rgba(220, 53, 69, 0.96) 0%, rgba(176, 28, 46, 0.96) 100%)',
          color: '#ffffff',
          iconColor: '#ffffff'
        };
      case 'warning':
        return {
          icon: 'warning',
          background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.96) 0%, rgba(245, 158, 11, 0.96) 100%)',
          color: '#111827',
          iconColor: '#111827'
        };
      case 'info':
        return {
          icon: 'info',
          background: 'linear-gradient(135deg, rgba(13, 202, 240, 0.96) 0%, rgba(59, 130, 246, 0.96) 100%)',
          color: '#ffffff',
          iconColor: '#ffffff'
        };
      case 'success':
      default:
        return {
          icon: 'success',
          background: 'linear-gradient(135deg, rgba(25, 135, 84, 0.96) 0%, rgba(16, 185, 129, 0.96) 100%)',
          color: '#ffffff',
          iconColor: '#ffffff'
        };
    }
  }
}
