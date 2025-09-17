import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { LineupService } from '../lineup-service';
import { TeamLoaderService } from '../team-loader.service';
import { KnownTeamConfig, TEAM_PLACEHOLDER } from '../_config/known-teams';
import { Lineup } from '../_interfaces/lineupInterface';

@Component({
  selector: 'app-input-for-lineup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './input-for-lineup.html',
  styleUrls: ['./input-for-lineup.scss'],
})
export class InputForLineupComponent {
  private router = inject(Router);
  private lineupService = inject(LineupService);
  private teamLoader = inject(TeamLoaderService);
  loadingTeamId = this.teamLoader.loadingTeamId;
  private teamLogos = signal<Record<string, string>>({});
  visibleTeams = computed(() =>
    this.teamLoader.knownTeams.filter((team) => !team.hidden)
  );

  constructor() {
    void this.prefetchTeamLogos();
  }

  /** Datei geladen -> parse + weiterreichen */
  async onFilePicked(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text) as Lineup;
      // optional: Schema-Check wie in LineupComponent
      this.teamLoader.setSelectedTeam(null);
      this.lineupService.setLineup(json);
      await this.router.navigate(['/generator']);
    } catch (e) {
      alert('Datei konnte nicht gelesen/geparst werden.');
      console.error(e);
    } finally {
      input.value = ''; // wieder gleiche Datei wählbar
    }
  }

  /** 👉 Shortcut: bekanntes Team laden & Generator öffnen */
  async loadKnownTeam(item: KnownTeamConfig) {
    try {
      this.teamLoader.setSelectedTeam(item.id);
      const lineup = await this.teamLoader.loadTeam(item.id);
      this.lineupService.setLineup(lineup);
      await this.router.navigate(['/generator'], {
        queryParams: { team: item.id },
      });
    } catch (error) {
      console.error('Team konnte nicht geladen werden:', error);
      alert('Team konnte nicht geladen werden. Bitte versuch es erneut.');
    }
  }

  teamPreview(team: KnownTeamConfig): string {
    return (
      this.teamLogos()[team.id] ??
      (team.source === 'inline'
        ? team.lineup.teamLogo ?? team.preview ?? TEAM_PLACEHOLDER
        : team.preview ?? TEAM_PLACEHOLDER)
    );
  }

  selectedTeamQuery() {
    const id = this.teamLoader.selectedTeamId();
    return id ? { team: id } : {};
  }

  loadDemo() {
    void this.loadDemoTeam();
  }

  goCreateNew() {
    // leere Auswahl -> nur Mainpage öffnen
    this.lineupService.setLineup({
      teamName: undefined,
      teamLogo: undefined,
      players: [],
    });
    this.router.navigateByUrl('/kader');
    this.teamLoader.setSelectedTeam(null);
  }

  scrollToPresets() {
    const el = document.getElementById('presetSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  private async prefetchTeamLogos() {
    const entries = await Promise.all(
      this.teamLoader.knownTeams.map(async (team) => {
        try {
          const logo = await this.teamLoader.getPreview(team.id);
          return [team.id, logo] as const;
        } catch (error) {
          console.error('Teamlogo konnte nicht geladen werden:', error);
          return [team.id, team.preview ?? TEAM_PLACEHOLDER] as const;
        }
      })
    );

    const map: Record<string, string> = {};
    for (const [id, logo] of entries) map[id] = logo;
    this.teamLogos.set(map);
  }

  private async loadDemoTeam() {
    try {
      const lineup = await this.teamLoader.loadTeam('demo');
      this.lineupService.setLineup(lineup);
      await this.router.navigate(['/generator'], {
        queryParams: { team: 'demo' },
      });
    } catch (error) {
      console.error('Demo-Team konnte nicht geladen werden:', error);
      alert('Demo-Team konnte nicht geladen werden.');
    }
  }
}
