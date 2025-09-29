import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { renderMarkdownToHtml } from '../shared/markdown-renderer';
import { resolvePublicAssetUrl } from '../shared/asset-url';

const MARKDOWN_SRC = 'media/impressum.md';

@Component({
  selector: 'app-impressum-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './impressum.html',
  styleUrl: './impressum.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImpressumPage implements OnInit {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  loading = signal(true);
  error = signal<string | null>(null);
  html = signal<SafeHtml | null>(null);

  ngOnInit(): void {
    void this.loadMarkdown();
  }

  async reload() {
    await this.loadMarkdown();
  }

  private async loadMarkdown() {
    this.error.set(null);
    this.loading.set(true);
    try {
      const markdownUrl = this.appendCacheBuster(
        resolvePublicAssetUrl(MARKDOWN_SRC)
      );
      const markdown = await firstValueFrom(
        this.http.get(markdownUrl, {
          responseType: 'text',
          headers: { 'Cache-Control': 'no-cache' },
        })
      );
      const rendered = renderMarkdownToHtml(markdown ?? '');
      this.html.set(this.sanitizer.bypassSecurityTrustHtml(rendered));
      this.loading.set(false);
    } catch (err) {
      console.error('Impressum konnte nicht geladen werden', err);
      this.error.set(
        'Impressum konnte nicht geladen werden. Bitte prüfen Sie die Datei unter /media/impressum.md.'
      );
      this.loading.set(false);
    }
  }

  private appendCacheBuster(url: string) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}ts=${Date.now()}`;
  }
}
