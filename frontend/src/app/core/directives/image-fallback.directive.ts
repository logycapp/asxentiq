import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appImageFallback]',
  standalone: true,
})
export class ImageFallbackDirective {
  @Input('appImageFallback') fallback!: string;

  private applied = false;

  constructor(private el: ElementRef<HTMLImageElement>) {}

  @HostListener('error')
  onError(): void {
    if (this.applied || !this.fallback) {
      return;
    }
    this.applied = true;
    this.el.nativeElement.src = this.fallback;
  }
}
