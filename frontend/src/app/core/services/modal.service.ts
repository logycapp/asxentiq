import { Injectable, Type, ViewContainerRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private containerRef: ViewContainerRef | null = null;

  registerContainer(ref: ViewContainerRef): void {
    this.containerRef = ref;
  }

  open<T>(component: Type<T>): void {
    if (!this.containerRef) return;

    this.containerRef.clear();
    this.containerRef.createComponent(component);
  }

  close(): void {
    this.containerRef?.clear();
  }
}