import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT) as Document;

  @ViewChild('landingRoot', { static: true }) landingRoot!: ElementRef<HTMLElement>;
  @ViewChild('cover', { static: true }) cover!: ElementRef<HTMLElement>;
  @ViewChild('cta', { static: true }) cta!: ElementRef<HTMLElement>;
  @ViewChild('sideStats', { static: true }) sideStats!: ElementRef<HTMLElement>;

  private previousTitle = '';
  private previousDescription = '';
  private canonicalLink?: HTMLLinkElement;
  private jsonLdScript?: HTMLScriptElement;
  private revealObserver?: IntersectionObserver;
  private heroObserver?: IntersectionObserver;
  private ctaObserver?: IntersectionObserver;

  ngOnInit(): void {
    this.previousTitle = this.title.getTitle();
    this.previousDescription = this.getMetaDescription();
    this.applySeo();
  }

  ngAfterViewInit(): void {
    this.bindRevealAnimations();
    this.bindSideStats();
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    this.heroObserver?.disconnect();
    this.ctaObserver?.disconnect();

    if (this.canonicalLink?.parentNode) {
      this.canonicalLink.parentNode.removeChild(this.canonicalLink);
    }

    if (this.jsonLdScript?.parentNode) {
      this.jsonLdScript.parentNode.removeChild(this.jsonLdScript);
    }

    this.title.setTitle(this.previousTitle || 'Asxentiq');

    if (this.previousDescription) {
      this.meta.updateTag({ name: 'description', content: this.previousDescription });
    }
  }

  private applySeo(): void {
    const siteUrl = this.document.location.origin.replace(/\/$/, '');
    const pageTitle = 'Asxentiq | Capacitación y gestión digital en SST';
    const pageDescription = 'Asxentiq es la plataforma web principal de la empresa para capacitación, auditoría, analítica y gestión digital en SST.';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: pageDescription });
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: pageDescription });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: `${siteUrl}/` });
    this.meta.updateTag({ property: 'og:site_name', content: 'Asxentiq' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: pageDescription });

    this.canonicalLink = this.renderer.createElement('link');
    this.renderer.setAttribute(this.canonicalLink, 'rel', 'canonical');
    this.renderer.setAttribute(this.canonicalLink, 'href', `${siteUrl}/`);
    this.renderer.appendChild(this.document.head, this.canonicalLink);

    this.jsonLdScript = this.renderer.createElement('script');
    this.renderer.setAttribute(this.jsonLdScript, 'type', 'application/ld+json');
    this.jsonLdScript!.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: 'Asxentiq',
          alternateName: 'Asxentiq SAS',
          url: `${siteUrl}/`,
          logo: `${siteUrl}/assets/landing/brand-mark.png`,
          description: pageDescription,
          email: 'comercial@asxentiq.com',
          telephone: '+57 311 826 9330'
        },
        {
          '@type': 'WebSite',
          name: 'Asxentiq',
          url: `${siteUrl}/`
        }
      ]
    });
    this.renderer.appendChild(this.document.head, this.jsonLdScript);
  }

  private getMetaDescription(): string {
    return this.document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
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
