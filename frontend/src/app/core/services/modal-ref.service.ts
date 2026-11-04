import { Injectable } from '@angular/core';

/**
 * Lightweight replacement for NgbActiveModal.
 * Provides close/dismiss methods for modal components.
 */
@Injectable()
export class ModalRef {
  private _closed = false;

  get closed(): boolean {
    return this._closed;
  }

  close(result?: unknown): void {
    this._closed = true;
  }

  dismiss(reason?: unknown): void {
    this._closed = true;
  }
}