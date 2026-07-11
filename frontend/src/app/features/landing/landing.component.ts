import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('landingRoot', { static: true }) landingRoot!: ElementRef<HTMLElement>;
  @ViewChild('cover', { static: true }) cover!: ElementRef<HTMLElement>;
  @ViewChild('cta', { static: true }) cta!: ElementRef<HTMLElement>;
  @ViewChild('sideStats', { static: true }) sideStats!: ElementRef<HTMLElement>;

  private revealObserver?: IntersectionObserver;
  private heroObserver?: IntersectionObserver;
  private ctaObserver?: IntersectionObserver;

  ngAfterViewInit(): void {
    this.bindRevealAnimations();
    this.bindSideStats();
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    this.heroObserver?.disconnect();
    this.ctaObserver?.disconnect();
  }

  private bindRevealAnimations(): void {
    const revealEls = this.landingRoot.nativeElement.querySelectorAll<HTMLElement>('.reveal');

    if (!revealEls.length) {
      return;
    }

    this.revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          this.revealObserver?.unobserve(entry.target);
        }
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach((el) => this.revealObserver?.observe(el));
  }

  private bindSideStats(): void {
    const sidePanel = this.sideStats.nativeElement;
    const hero = this.cover.nativeElement;
    const cta = this.cta.nativeElement;
    let pastHero = false;
    let inCta = false;

    const updatePanel = (): void => {
      sidePanel.classList.toggle('visible', pastHero && !inCta);
    };

    this.heroObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        updatePanel();
      }
    }, { threshold: 0 });

    this.heroObserver.observe(hero);

    this.ctaObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        inCta = entry.isIntersecting;
        updatePanel();
      }
    }, { threshold: 0.1 });

    this.ctaObserver.observe(cta);
  }
}
