import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LineupService } from '../lineup-service';
import { Lineup, Player } from '../_interfaces/lineupInterface';
import { NgClass, NgStyle, NgTemplateOutlet } from '@angular/common';
import { TeamLoaderService } from '../team-loader.service';
import { TEAM_PLACEHOLDER, findKnownTeam } from '../_config/known-teams';

type Mode = 'withChain' | 'noChain' | 'maybe';
type Role = 'Quick' | 'Kette' | 'Pompfe';
type Slot = { role: Role; player: Player; kindLabel: string };

type HistoryItem = {
  mode: Mode;
  time: number;
  top: { name: string; label: string }[]; // Positionen 1–4 in Reihenfolge
  quick: { name: string; label: string }; // Quick unten
};

type GameRecord = {
  id: string;
  opponent: string;
  closed: boolean;
  history: HistoryItem[];
  playCounts: Record<string, number>; // Einsätze in diesem Spiel
};

const TEAM_SIZE = 5;

@Component({
  selector: 'app-generator',
  standalone: true,
  imports: [ReactiveFormsModule, NgStyle, NgTemplateOutlet, NgClass, RouterModule],
  templateUrl: './generator.html',
  styleUrls: ['./generator.scss'],
})
export class GeneratorComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private store = inject(LineupService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teamLoader = inject(TeamLoaderService);

  private teamLoadToken: symbol | null = null;

  // Optionen
  form = this.fb.nonNullable.group({
    mode: 'withChain' as Mode,
    equalize: true,
  });

  // Signatur wie bei ngFor: (index, item)
  trackTop = (idx: number, s: Slot) =>
    `${this.animRunId()}|${idx}|${s.player.name}|${s.kindLabel}`;

  trackByQuick = () =>
    `quick|${this.animRunId()}|${this.quickSlot()?.player.name ?? ''}`;

  // Spiele-Verwaltung
  games = signal<GameRecord[]>([]);
  currentGameIndex = signal<number>(-1);
  opponentCtrl: FormControl<string> = this.fb.nonNullable.control('');

  // Aktuelle Ausgabe
  topRow = signal<Slot[]>([]);
  quickSlot = signal<Slot | null>(null);
  error = signal<string | null>(null);
  teamLoading = signal(false);
  teamError = signal<string | null>(null);
  currentTeamId = signal<string | null>(null);
  teamLabel = computed(() => {
    const id = this.currentTeamId();
    if (id) {
      const known = findKnownTeam(id);
      if (known) return known.label;
    }
    const lineup = this.store.lineup();
    return lineup?.teamName ?? null;
  });
  playerCount = computed(() => this.store.lineup()?.players?.length ?? 0);
  teamLogo = computed(() => this.store.lineup()?.teamLogo ?? TEAM_PLACEHOLDER);
  teamQuery = computed(() => {
    const id = this.currentTeamId();
    return id ? { team: id } : {};
  });
  ingameMode = signal(false);
  constructor() {
    // erstes Spiel anlegen
    this.createNewGame();

    // Gegnername in aktuelles Spiel schreiben
    this.opponentCtrl.valueChanges.subscribe((name) => {
      const gi = this.currentGameIndex();
      if (gi < 0) return;
      this.games.update((arr) => {
        const copy = [...arr];
        copy[gi] = { ...copy[gi], opponent: name };
        return copy;
      });
    });

    this.route.queryParamMap.subscribe((params) => {
      const teamId = params.get('team');
      void this.applyTeamFromParam(teamId);
    });
  }

  tagClass(role: Role | null | undefined): string {
    switch (role) {
      case 'Quick':
        return 'tag--quick';
      case 'Kette':
        return 'tag--chain';
      case 'Pompfe':
        return 'tag--spar';
      default:
        return '';
    }
  }

  cardClass(role: Role | null | undefined): Record<string, boolean> {
    return {
      'slot-card--quick': role === 'Quick',
      'slot-card--chain': role === 'Kette',
      'slot-card--spar': role === 'Pompfe',
    };
  }

  ngOnDestroy() {
    this.lockBodyScroll(false);
  }

  animGate = signal(false); // false = ausgeblendet (Reset), true = animieren
  bursting = signal(false); // Button-Burst-Effekt
  private burstTimer: any;

  // Slider-Thumb entfernt – Modus wird nur noch per Buttons gewählt

  private triggerAllAnimations() {
    // erst schließen (alles unsichtbar/ohne Animation) …
    this.animGate.set(false);

    // …dann im nächsten Frame öffnen => Animation startet für ALLE neu
    // (double rAF ist am robustesten über alle Browser)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.animGate.set(true);
      });
    });
  }

  /* ---------- Helper für Spiele ---------- */

  private createNewGame() {
    const id = 'g_' + Math.random().toString(36).slice(2, 9);
    const next: GameRecord = {
      id,
      opponent: '',
      closed: false,
      history: [],
      playCounts: {},
    };

    // 👉 neuestes Spiel nach oben
    this.games.update((g) => [next, ...g]);
    this.currentGameIndex.set(0);

    // Eingabefeld leeren/auf neues Spiel binden
    this.opponentCtrl.setValue('', { emitEvent: true });
  }

  private currentGame(): GameRecord | null {
    const gi = this.currentGameIndex();
    return gi >= 0 ? this.games()[gi] : null;
  }

  completeCurrentGame() {
    const gi = this.currentGameIndex();
    if (gi < 0) return;
    this.games.update((arr) => {
      const copy = [...arr];
      copy[gi] = { ...copy[gi], closed: true };
      return copy;
    });
    this.createNewGame();
  }

  exportGame(gi: number) {
    const game = this.games()[gi];
    if (!game) return;

    // Stats: Anteil je Spieler (Einsätze / Gesamt-Einsätze im Spiel)
    const totalPlays = game.history.length * TEAM_SIZE; // 5 Einsätze pro Aufstellung
    const stats = Object.entries(game.playCounts)
      .map(([name, plays]) => ({
        name,
        plays,
        percent: totalPlays ? Math.round((plays / totalPlays) * 1000) / 10 : 0, // 0.1%-Genauigkeit
      }))
      .sort((a, b) => b.plays - a.plays || a.name.localeCompare(b.name));

    const exportPayload = {
      opponent: game.opponent || null,
      closed: game.closed,
      createdAt: new Date().toISOString(),
      lineups: game.history, // chronologisch: neueste zuerst (so wie gespeichert)
      stats: {
        totalLineups: game.history.length,
        totalPlays,
        perPlayer: stats,
      },
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const filename = `spiel-gegen-${(game.opponent || 'unbekannt').replace(
      /[^\w\-]+/g,
      '_'
    )}-${formatNow()}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ---------- Öffentliche Helper fürs Template ---------- */

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString();
  }

  private async applyTeamFromParam(teamId: string | null) {
    const token = Symbol('team-load');
    this.teamLoadToken = token;

    if (!teamId) {
      this.teamLoader.setSelectedTeam(null);
      this.teamLoadToken = null;
      this.currentTeamId.set(null);
      this.teamLoading.set(false);
      this.teamError.set(null);
      return;
    }

    const known = findKnownTeam(teamId);
    if (!known) {
      this.teamLoader.setSelectedTeam(null);
      this.teamLoadToken = null;
      this.currentTeamId.set(null);
      this.teamLoading.set(false);
      this.teamError.set('Unbekanntes Team in der URL.');
      void this.router.navigate([], {
        queryParams: { team: null },
        queryParamsHandling: 'merge',
      });
      return;
    }

    const existing = this.store.lineup();
    if (existing && this.teamLoader.selectedTeamId() === teamId) {
      this.currentTeamId.set(teamId);
      this.teamLoader.setSelectedTeam(teamId);
      this.teamError.set(null);
      this.teamLoading.set(false);
      this.teamLoadToken = null;
      return;
    }

    if (this.currentTeamId() === teamId && this.store.lineup()) {
      this.teamError.set(null);
      this.teamLoadToken = null;
      this.teamLoader.setSelectedTeam(teamId);
      return;
    }

    this.teamError.set(null);
    this.teamLoading.set(true);
    this.currentTeamId.set(teamId);
    this.error.set(null);
    this.topRow.set([]);
    this.quickSlot.set(null);

    try {
      const lineup = await this.teamLoader.loadTeam(teamId);
      if (this.teamLoadToken !== token) return;
      this.store.setLineup(lineup);
    } catch (error) {
      if (this.teamLoadToken !== token) return;
      console.error('Team konnte nicht geladen werden:', error);
      this.teamError.set('Team konnte nicht geladen werden.');
      this.store.setLineup(null);
      this.teamLoader.setSelectedTeam(null);
    } finally {
      if (this.teamLoadToken === token) {
        this.teamLoading.set(false);
        this.teamLoadToken = null;
      }
    }
  }

  /* ---------- Generieren ---------- */

  async generate() {
    if (this.teamLoading()) return;

    // lustige Button-Animation (Burst)
    if (this.burstTimer) clearTimeout(this.burstTimer);
    this.bursting.set(false);
    requestAnimationFrame(() => {
      this.bursting.set(true);
    });
    this.burstTimer = setTimeout(() => this.bursting.set(false), 720);

    this.animGate.set(false);
    this.error.set(null);
    this.topRow.set([]);
    this.quickSlot.set(null);

    // immer aktuelles Spiel sichern
    const game = this.currentGame();
    if (!game || game.closed) {
      // falls kein offenes Spiel vorhanden -> neu und weiter
      this.createNewGame();
    }

    const mode = this.form.value.mode as Mode;
    const equalize = !!this.form.value.equalize;

    const state: Lineup | null = this.store.lineup();
    const all = [...(state?.players ?? [])];

    if (all.length < TEAM_SIZE) {
      return this.fail(
        `Es sind nur ${all.length} Spieler im Kader. Es werden 5 benötigt.`
      );
    }

    // helpers
    const rand = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const shuffle = <T>(arr: T[]) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const isQuick = (p: Player) => (p.quick?.length ?? 0) > 0;
    const isChain = (p: Player) => (p.chains?.length ?? 0) > 0;
    const isSparer = (p: Player) => (p.spars?.length ?? 0) > 0;

    // Wahl „fair“, wenn equalize aktiv: wähle zufällig aus Gruppe mit minimalen Einsätzen (pro Spiel!)
    const playCounts = this.currentGame()!.playCounts;
    const countOf = (name: string) => playCounts[name] ?? 0;
    const pickFair = <T extends Player>(arr: T[]): T => {
      if (!equalize) return rand(arr);
      let min = Infinity;
      for (const p of arr) min = Math.min(min, countOf(p.name));
      const bucket = arr.filter((p) => countOf(p.name) === min);
      return rand(bucket);
    };

    // 1) Quick wählen
    const quicks = all.filter(isQuick);
    if (!quicks.length) return this.fail('Es gibt keinen Quick (Läufer).');
    const quick = pickFair(quicks);
    const poolExQuick = all.filter((p) => p.name !== quick.name);

    // Feasibility-Funktionen (ohne Quick)
    const feasibleChains = (): Player[] => {
      const chains = poolExQuick.filter(isChain);
      return chains.filter((ch) => {
        const rest = poolExQuick.filter((p) => p.name !== ch.name);
        return rest.filter(isSparer).length >= 3;
      });
    };
    const canNoChain = (): boolean => poolExQuick.filter(isSparer).length >= 4;

    // „maybe“: neue Zufallspräferenz, aber machbare Variante wählen
    const preferWithChain = Math.random() < Math.random();
    let withChain: boolean;
    if (mode === 'withChain') withChain = true;
    else if (mode === 'noChain') withChain = false;
    else {
      const chainsOK = feasibleChains();
      const noChainOK = canNoChain();
      if (preferWithChain)
        withChain = chainsOK.length > 0 ? true : noChainOK ? false : true;
      else withChain = noChainOK ? false : chainsOK.length > 0 ? true : false;
      if (!withChain && !noChainOK && chainsOK.length === 0) {
        return this.fail(this.buildImpossibilityMsg(poolExQuick));
      }
    }
    if (withChain) {
      if (feasibleChains().length === 0) {
        if (canNoChain()) withChain = false;
        else return this.fail(this.buildImpossibilityMsg(poolExQuick));
      }
    } else {
      if (!canNoChain()) {
        if (feasibleChains().length > 0) withChain = true;
        else return this.fail(this.buildImpossibilityMsg(poolExQuick));
      }
    }

    // 2) Aufstellung bauen
    let pool = [...poolExQuick];
    const slots: Slot[] = [];

    if (withChain) {
      const chainsOK = feasibleChains();
      const chainPlayer = pickFair(chainsOK);
      pool = pool.filter((p) => p.name !== chainPlayer.name);
      const chainType = rand(chainPlayer.chains) ?? 'Normal';
      const chainLabel = this.formatChainLabel(chainType);
      slots.push({
        role: 'Kette',
        player: chainPlayer,
        kindLabel: chainLabel,
      });
    }

    const needPompfen = 4 - slots.length;
    const sparersPool = pool.filter(isSparer);
    if (sparersPool.length < needPompfen) {
      return this.fail(
        'Mit dem aktuellen Kader ist keine gültige 5er-Aufstellung möglich (zu wenige Pompfen-Spieler).'
      );
    }
    let remaining = [...sparersPool];
    for (let i = 0; i < needPompfen; i++) {
      const pick = pickFair(remaining);
      const kind =
        pick.spars && pick.spars.length
          ? rand(pick.spars) ?? 'Pompfe'
          : 'Pompfe';
      const pompLabel = this.formatPompLabel(kind);
      slots.push({ role: 'Pompfe', player: pick, kindLabel: pompLabel });
      remaining = remaining.filter((p) => p.name !== pick.name);
      pool = pool.filter((p) => p.name !== pick.name);
    }

    // 3) Reihenfolge oben zufällig
    const shuffledTop = shuffle(slots);
    this.topRow.set(shuffledTop);

    // 4) Quick mittig unten
    const quickSlot = {
      role: 'Quick',
      player: quick,
      kindLabel: 'Laufen',
    } as Slot;
    this.quickSlot.set(quickSlot);

    // 5) In aktuelles Spiel eintragen (Verlauf + Einsatzzähler)
    const item: HistoryItem = {
      mode: this.form.value.mode as Mode,
      time: Date.now(),
      top: shuffledTop.map((s) => ({
        name: s.player.name,
        label: s.kindLabel,
      })),
      quick: { name: quickSlot.player.name, label: quickSlot.kindLabel },
    };

    const gi = this.currentGameIndex();
    this.games.update((arr) => {
      const copy = [...arr];
      const g = copy[gi];

      // Verlauf neuestes zuerst
      const history = [item, ...g.history].slice(0, 100);

      // Zähler
      const counts = { ...g.playCounts };
      for (const s of shuffledTop)
        counts[s.player.name] = (counts[s.player.name] ?? 0) + 1;
      counts[quickSlot.player.name] = (counts[quickSlot.player.name] ?? 0) + 1;

      copy[gi] = { ...g, history, playCounts: counts };
      return copy;
    });
    // nach this.topRow.set(...) & this.quickSlot.set(...)
    this.animRunId.update((n) => n + 1); // 👉 triggert neue Zufallswerte pro Run
    await new Promise((resolve) => {
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        resolve(null);
      }, 50);
    });
    this.triggerAllAnimations();
  }

  async goToInput() {
    const query = this.teamQuery();
    const hasTeam = Object.keys(query).length > 0;

    if (this.router.url.startsWith('/input')) {
      this.scrollToTeams();
      return;
    }

    await this.router.navigate(
      ['/input'],
      hasTeam ? { queryParams: query } : undefined
    );
    setTimeout(() => this.scrollToTeams(), 80);
  }

  toggleIngame() {
    const next = !this.ingameMode();
    this.ingameMode.set(next);
    this.lockBodyScroll(next);
  }

  toggleEqualize() {
    const current = !!this.form.controls.equalize.value;
    this.form.controls.equalize.setValue(!current, { emitEvent: true });
  }

  setMode(mode: Mode) {
    if (this.form.controls.mode.value === mode) return;
    this.form.controls.mode.setValue(mode, { emitEvent: true });
  }

  private scrollToTeams() {
    if (typeof window === 'undefined') return;
    const el = document.getElementById('presetSection');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private lockBodyScroll(active: boolean) {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = active ? 'hidden' : '';
  }

  /* ---------- Fehlermeldungen ---------- */

  private buildImpossibilityMsg(poolExQuick: Player[]): string {
    const chains = poolExQuick.filter(
      (p) => (p.chains?.length ?? 0) > 0
    ).length;
    const sparersNoChain = poolExQuick.filter(
      (p) => (p.spars?.length ?? 0) > 0
    ).length;
    const anyChain = poolExQuick.find((p) => (p.chains?.length ?? 0) > 0);
    const sparersWithChain = anyChain
      ? poolExQuick.filter(
          (p) => p.name !== anyChain.name && (p.spars?.length ?? 0) > 0
        ).length
      : 0;

    return `Mit dem aktuellen Kader ist keine gültige 5er-Aufstellung möglich.
ohne Kette: benötigt 4 Pompfen-Spieler, vorhanden ${sparersNoChain}
mit Kette: benötigt 3 Pompfen-Spieler + 1 Kette, vorhanden ${sparersWithChain} Pompfen und ${chains} Ketten`;
  }

  private fail(msg: string) {
    this.error.set(msg);
    this.topRow.set([]);
    this.quickSlot.set(null);
  }

  animRunId = signal(0);

  // simple deterministische PRNG, damit die Animation je Run stabil ist
  private seedRand(seed: number) {
    let t = seed + 0x6d2b79f5;
    return () => {
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private formatPompLabel(kind: string | null | undefined): string {
    const trimmed = (kind ?? '').trim();
    if (!trimmed) return 'Pompfe';
    const paren = trimmed.match(/\(([^)]+)\)/);
    if (paren && paren[1].trim()) return paren[1].trim();
    if (/^pompfe$/i.test(trimmed)) return 'Pompfe';
    return trimmed;
  }

  private formatChainLabel(kind: string | null | undefined): string {
    const trimmed = (kind ?? '').trim();
    if (!trimmed || trimmed === 'Normal') return 'Kette';
    const paren = trimmed.match(/\(([^)]+)\)/);
    const value = paren && paren[1].trim() ? paren[1].trim() : trimmed;
    return `Kette (${value})`;
  }

  /** Styles (CSS-Variablen) pro Slot – leicht variiert je Run & Index */
  animStyle(kind: 'top' | 'quick', index: number) {
    const baseSeed = this.animRunId() * 97 + (kind === 'top' ? index : 999);
    const rnd = this.seedRand(baseSeed);

    // Zeiten
    const delay = 60 + Math.floor(rnd() * 220); // 60–280 ms
    const dur = 380 + Math.floor(rnd() * 220); // 380–600 ms

    // Streuung (ähnlich deiner HTML-Demo): ±10vw/±10vh, ±180°
    const sx = `${((rnd() * 2 - 1) * 10).toFixed(1)}vw`;
    const sy = `${((rnd() * 2 - 1) * 10).toFixed(1)}vh`;
    const sr = `${Math.round(rnd() * 360 - 180)}deg`;

    // (optional) falls du --rot/--bob/--amp noch woanders nutzt, bleiben sie erhalten
    const rot = (rnd() * 2 - 1) * 2.2; // -2.2° .. +2.2°
    const amp = 1 + Math.floor(rnd() * 3);
    const bob = 2.2 + rnd() * 1.0;

    // Bunte Hintergrund-Animation pro Karte (zufällige Farbe + Timing)
    const hue = Math.floor(rnd() * 360); // 0..359
    const bgDur = 12 + Math.floor(rnd() * 10); // 12–21 s
    const bgDelayMs = Math.floor(rnd() * 3000); // 0–3000 ms

    return {
      '--delay': `${delay}ms`,
      '--dur': `${dur}ms`,
      '--sx': sx,
      '--sy': sy,
      '--sr': sr,
      '--rot': `${rot}deg`,
      '--amp': `${amp}px`,
      '--bob': `${bob}s`,
      '--hue': `${hue}`,
      '--bg-dur': `${bgDur}s`,
      '--bg-delay': `${bgDelayMs}ms`,
    } as any;
  }
}

/* ---------- Utility ---------- */

function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes())
  );
}
