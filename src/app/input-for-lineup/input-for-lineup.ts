import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { LineupService } from '../lineup-service';
import { Lineup } from '../_interfaces/lineupInterface';

// kleines neutrales Platzhalter-Avatar (gleichen Stil wie in Lineup)
const PLACEHOLDER_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="100%" height="100%" rx="12" fill="#ffffff" stroke="#1f2a37" stroke-width="4"/>
    <circle cx="80" cy="68" r="26" fill="none" stroke="#1f2a37" stroke-width="4"/>
    <path d="M36 130c10-22 34-26 44-26s34 4 44 26" fill="none" stroke="#1f2a37" stroke-width="4" stroke-linecap="round"/>
  </svg>`);

/**
 * 👉 Hier hinterlegst du beliebig viele bekannte Teams.
 * Du kannst diese Liste jederzeit erweitern/anpassen.
 */
const KNOWN_TEAMS: Array<{ label: string; lineup: Lineup }> = [];

@Component({
  selector: 'app-input-for-lineup',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './input-for-lineup.html',
  styleUrls: ['./input-for-lineup.scss'],
})
export class InputForLineupComponent {
  private router = inject(Router);
  private lineupService = inject(LineupService);

  constructor() {
    this.knownTeams.length = 0; // reset
    this.addDefaultLineup();
    // automatisch laden bei App-Start
    (async () => {
      try {
        const resp = await fetch('knownTeams/Jungle_Diff_Kader.randomizer');
        // oder 'Jungle_Diff_Kader.randomizer' wenn im public/ liegt
        const json = await resp.json();
        KNOWN_TEAMS.push({
          label: 'Jungle Diff',
          lineup: json as Lineup,
        });
      } catch (e) {
        console.error('Kader-Datei konnte nicht geladen werden:', e);
      }
    })();
  }

  addDefaultLineup() {
    this.knownTeams.push({
      label: 'Demo – 5 Spieler (ohne Kette)',
      lineup: {
        teamName: 'Demo Five',
        players: [
          {
            name: 'Quickie',
            profilePicture: PLACEHOLDER_AVATAR,
            quick: ['Laufen'],
            spars: [],
            chains: [],
          },
          {
            name: 'P1',
            profilePicture: PLACEHOLDER_AVATAR,
            quick: [],
            spars: ['LP'],
            chains: [],
          },
          {
            name: 'P2',
            profilePicture: PLACEHOLDER_AVATAR,
            quick: [],
            spars: ['Schild'],
            chains: [],
          },
          {
            name: 'P3',
            profilePicture: PLACEHOLDER_AVATAR,
            quick: [],
            spars: ['Stab'],
            chains: [],
          },
          {
            name: 'P4',
            profilePicture: PLACEHOLDER_AVATAR,
            quick: [],
            spars: ['Q-Tip'],
            chains: [],
          },
        ],
      },
    });
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
      this.lineupService.setLineup(json);
      this.router.navigateByUrl('/mainpage');
    } catch (e) {
      alert('Datei konnte nicht gelesen/geparst werden.');
      console.error(e);
    } finally {
      input.value = ''; // wieder gleiche Datei wählbar
    }
  }

  /** 👉 Shortcut: bekanntes Team laden & zur Mainpage */
  loadKnownTeam(item: { label: string; lineup: Lineup }) {
    this.lineupService.setLineup(item.lineup);
    this.router.navigateByUrl('/mainpage');
  }

  get knownTeams() {
    return KNOWN_TEAMS;
  }

  goCreateNew() {
    // leere Auswahl -> nur Mainpage öffnen
    this.lineupService.setLineup({ teamName: undefined, players: [] });
    this.router.navigateByUrl('/mainpage');
  }
}
