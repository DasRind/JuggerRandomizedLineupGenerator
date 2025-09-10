import { Injectable, signal } from '@angular/core';
import { Lineup } from './_interfaces/lineupInterface';

export type LineupData = unknown;

const STORAGE_KEY = 'randomizer.lineup';

@Injectable({ providedIn: 'root' })
export class LineupService {
  private readonly _lineup = signal<Lineup | null>(null);

  /** Aktueller Wert (kompatibel zu deinem alten Code) */
  get snapshot(): Lineup | null {
    return this._lineup();
  }

  /** Signal zum Reagieren in Komponenten */
  lineup = this._lineup;

  /** Setzt/ersetzt das Lineup (ruft Re-Renders aus) */
  setLineup(next: Lineup | null) {
    this._lineup.set(next);
  }
}
