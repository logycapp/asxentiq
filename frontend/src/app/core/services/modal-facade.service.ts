import { Injectable, Type, inject } from '@angular/core';

interface ModalRefLike<T> {
  componentInstance: T;
  result: Promise<unknown>;
  close: (result?: unknown) => void;
  dismiss: (reason?: unknown) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ModalFacadeService {
  open<T>(_content: Type<T>): ModalRefLike<T> {
    const componentInstance = {} as T;
    const ref: ModalRefLike<T> = {
      componentInstance,
      result: Promise.resolve(undefined),
      close: () => {},
      dismiss: () => {}
    };
    return ref;
  }
}
