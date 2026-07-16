declare module 'bootstrap' {
  export class Tooltip {
    constructor(element: Element, options?: {
      trigger?: string;
      placement?: string;
      container?: string;
    });
    dispose(): void;
  }
}
