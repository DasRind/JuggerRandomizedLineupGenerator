import { Injectable, signal } from '@angular/core';
import { Lineup } from './_interfaces/lineupInterface';
import {
  KNOWN_TEAMS,
  KnownTeamConfig,
  TEAM_PLACEHOLDER,
  cloneLineup,
  findKnownTeam,
} from './_config/known-teams';

@Injectable({ providedIn: 'root' })
export class TeamLoaderService {
  private readonly cache = new Map<string, Lineup>();
  private readonly pendingLoads = new Map<string, Promise<void>>();
  private readonly loadingId = signal<string | null>(null);
  private readonly selectedId = signal<string | null>(null);

  readonly loadingTeamId = this.loadingId.asReadonly();
  readonly selectedTeamId = this.selectedId.asReadonly();

  readonly knownTeams = KNOWN_TEAMS;

  async loadTeam(teamId: string): Promise<Lineup> {
    const meta = findKnownTeam(teamId);
    if (!meta) {
      throw new Error(`Unbekanntes Team: ${teamId}`);
    }

    if (this.cache.has(meta.id)) {
      this.selectedId.set(meta.id);
      return cloneLineup(this.cache.get(meta.id)!);
    }

    this.loadingId.set(meta.id);
    try {
      await this.fetchAndCache(meta);
      this.selectedId.set(meta.id);
      return cloneLineup(this.cache.get(meta.id)!);
    } finally {
      this.loadingId.set(null);
    }
  }

  setSelectedTeam(id: string | null) {
    this.selectedId.set(id);
  }

  async getPreview(teamId: string): Promise<string> {
    const meta = findKnownTeam(teamId);
    if (!meta) return TEAM_PLACEHOLDER;

    if (!this.cache.has(meta.id)) {
      try {
        await this.fetchAndCache(meta);
      } catch (error) {
        console.error('Preview konnte nicht geladen werden:', error);
        return meta.preview ?? TEAM_PLACEHOLDER;
      }
    }

    return this.cache.get(meta.id)?.teamLogo ?? meta.preview ?? TEAM_PLACEHOLDER;
  }

  private async fetchAndCache(meta: KnownTeamConfig): Promise<void> {
    if (this.cache.has(meta.id)) return;

    const pending = this.pendingLoads.get(meta.id);
    if (pending) {
      await pending;
      return;
    }

    const loadPromise = (async () => {
      let lineup: Lineup;
      if (meta.source === 'inline') {
        lineup = cloneLineup(meta.lineup);
      } else {
        const response = await fetch(meta.file, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Laden fehlgeschlagen (${response.status})`);
        }
        const json = (await response.json()) as Lineup;
        lineup = cloneLineup(json);
      }

      this.cache.set(meta.id, {
        ...lineup,
        teamLogo: lineup.teamLogo ?? meta.preview ?? TEAM_PLACEHOLDER,
      });
    })()
      .finally(() => {
        this.pendingLoads.delete(meta.id);
      });

    this.pendingLoads.set(meta.id, loadPromise);
    await loadPromise;
  }
}
