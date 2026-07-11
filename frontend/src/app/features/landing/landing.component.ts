import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements AfterViewInit {
  @ViewChild('mount', { static: true }) mount!: ElementRef<HTMLDivElement>;

  async ngAfterViewInit(): Promise<void> {
    const response = await fetch('/assets/web.html');
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    this.injectHeadAssets(doc);
    this.applyDocumentFrame();
    this.mount.nativeElement.innerHTML = this.extractBodyMarkup(doc);
    this.bindRevealAnimations();
    this.bindSideStats();
  }

  private applyDocumentFrame(): void {
    document.documentElement.style.background =
      'linear-gradient(160deg, var(--pc-navy-900) 0%, var(--pc-navy-950) 100%)';
    document.body.style.background =
      'radial-gradient(1100px 700px at 78% 30%, rgba(46, 134, 235, .10), transparent 60%), radial-gradient(900px 600px at 90% 85%, rgba(43, 196, 138, .07), transparent 55%), linear-gradient(160deg, var(--pc-navy-900) 0%, var(--pc-navy-950) 100%)';
    document.body.style.color = 'var(--navy)';
    document.body.style.margin = '0';
    document.body.style.overflowX = 'hidden';
    document.body.style.fontFamily = "'IBM Plex Sans', system-ui, sans-serif";
  }

  private injectHeadAssets(doc: Document): void {
    const head = doc.head;
    const styleEl = head.querySelector('style');
    const fontLink = head.querySelector('link[href*="fonts.googleapis.com"]');

    if (fontLink && !document.querySelector('link[href*="fonts.googleapis.com"]')) {
      document.head.appendChild(fontLink.cloneNode(true));
    }

    if (styleEl && !document.getElementById('web-html-styles')) {
      const clonedStyle = document.createElement('style');
      clonedStyle.id = 'web-html-styles';
      clonedStyle.textContent = styleEl.textContent;
      document.head.appendChild(clonedStyle);
    }
  }

  private extractBodyMarkup(doc: Document): string {
    const body = doc.body.cloneNode(true) as HTMLBodyElement;
    body.querySelectorAll('script').forEach((script) => script.remove());
    return body.innerHTML;
  }

  private bindRevealAnimations(): void {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) {
      return;
    }

    const revealObs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          revealObs.unobserve(entry.target);
        }
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach((el) => revealObs.observe(el));
  }

  private bindSideStats(): void {
    const sidePanel = document.getElementById('sideStats');
    const hero = document.querySelector('.cover');
    const cta = document.querySelector('.cta');

    if (!sidePanel || !hero) {
      return;
    }

    let pastHero = false;
    let inCta = false;

    const updatePanel = () => {
      sidePanel.classList.toggle('visible', pastHero && !inCta);
    };

    const heroObs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        updatePanel();
      }
    }, { threshold: 0 });
    heroObs.observe(hero);

    if (cta) {
      const ctaObs = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          inCta = entry.isIntersecting;
          updatePanel();
        }
      }, { threshold: 0.1 });
      ctaObs.observe(cta);
    }
  }
}
