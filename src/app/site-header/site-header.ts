import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TeamLoaderService } from '../team-loader.service';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './site-header.html',
  styleUrls: ['./site-header.scss'],
})
export class SiteHeader {
  private router = inject(Router);
  private teamLoader = inject(TeamLoaderService);

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
}
