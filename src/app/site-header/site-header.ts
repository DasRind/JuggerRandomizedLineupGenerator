import {
  AfterViewInit,
  Component,
  EffectRef,
  OnDestroy,
  computed,
  effect,
  inject,
  ElementRef,
  ViewChild,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TeamLoaderService } from '../team-loader.service';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './site-header.html',
  styleUrls: ['./site-header.scss'],
})
export class SiteHeader implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private teamLoader = inject(TeamLoaderService);
  @ViewChild('root', { static: true }) headerEl!: ElementRef<HTMLElement>;
  private resizeObs: ResizeObserver | null = null;
  private resizeFallback: (() => void) | null = null;
  private themeEffect: EffectRef | null = null;
  private readonly themeKey = 'jr-theme-mode';

  theme = signal<'light' | 'dark'>(this.detectInitialTheme());

  constructor() {
    if (typeof document !== 'undefined') {
      this.applyTheme(this.theme());
    }

    if (!this.themeEffect) {
      this.themeEffect = effect(() => {
        this.applyTheme(this.theme());
      });
    }
  }

  teamQuery = computed(() => {
    const id = this.teamLoader.selectedTeamId();
    return id ? { team: id } : {};
  });

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.applyTheme(next);
    this.persistTheme(next);
  }

  async goToTeams(event: Event) {
    event.preventDefault();
    if (this.router.url.startsWith('/input')) {
      this.scrollToTeams();
      return;
    }
    const query = this.teamQuery();
    const extras = Object.keys(query).length ? { queryParams: query } : undefined;
    await this.router.navigate(['/input'], extras);
    setTimeout(() => this.scrollToTeams(), 60);
  }

  private scrollToTeams() {
    const el = document.getElementById('presetSection');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngAfterViewInit(): void {
    if (typeof document === 'undefined') return;
    const header = this.headerEl?.nativeElement;
    if (!header) return;

    const update = () => {
      if (typeof document === 'undefined') return;
      const h = header.offsetHeight;
      document.documentElement.style.setProperty(
        '--site-header-h',
        `${h}px`
      );
    };

    update();

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      this.resizeObs = new ResizeObserver(() => update());
      this.resizeObs.observe(header);
    } else if (typeof window !== 'undefined') {
      const win = window as Window & typeof globalThis;
      const handler = () => update();
      win.addEventListener('resize', handler);
      this.resizeFallback = () => win.removeEventListener('resize', handler);
    }

  }

  ngOnDestroy(): void {
    if (this.resizeObs) {
      this.resizeObs.disconnect();
      this.resizeObs = null;
    }
    if (this.resizeFallback) {
      this.resizeFallback();
      this.resizeFallback = null;
    }
    if (typeof document !== 'undefined') {
      document.documentElement.style.removeProperty('--site-header-h');
    }
    if (this.themeEffect) {
      this.themeEffect.destroy();
      this.themeEffect = null;
    }
  }

  private detectInitialTheme(): 'light' | 'dark' {
    if (typeof document === 'undefined') return 'light';

    try {
      const stored = localStorage.getItem(this.themeKey);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch (err) {
      console.warn('Theme preference unavailable', err);
    }

    if (typeof window !== 'undefined') {
      try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } catch (err) {
        console.warn('Theme matchMedia unavailable', err);
      }
    }

    return 'light';
  }

  private applyTheme(mode: 'light' | 'dark') {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('theme-dark', mode === 'dark');
    root.classList.toggle('theme-light', mode === 'light');
    root.setAttribute('data-theme', mode);
  }

  private persistTheme(mode: 'light' | 'dark') {
    if (typeof document === 'undefined') return;
    try {
      localStorage.setItem(this.themeKey, mode);
    } catch (err) {
      console.warn('Theme preference could not be saved', err);
    }
  }
}
