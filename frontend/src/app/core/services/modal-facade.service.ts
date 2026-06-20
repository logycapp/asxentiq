import { Injectable, Type, inject } from '@angular/core';
import { NgbModal, NgbModalOptions, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Injectable({
  providedIn: 'root'
})
export class ModalFacadeService {
  private readonly modal = inject(NgbModal);
  private readonly defaultWindowClass = 'app-modal-window';

  open<T>(content: Type<T>, options: NgbModalOptions = {}): NgbModalRef {
    const windowClass = [this.defaultWindowClass, options.windowClass].filter(Boolean).join(' ');

    return this.modal.open(content, {
      centered: true,
      scrollable: true,
      size: 'xl',
      ...options,
      windowClass
    });
  }
}
