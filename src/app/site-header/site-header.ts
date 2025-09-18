import {
  AfterViewInit,
  Component,
  OnDestroy,
  computed,
  inject,
  ElementRef,
  ViewChild,
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

  teamQuery = computed(() => {
    const id = this.teamLoader.selectedTeamId();
    return id ? { team: id } : {};
  });

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
  }
}
