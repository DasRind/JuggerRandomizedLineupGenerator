import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
  effect,
  computed,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormArray,
  FormControl,
} from '@angular/forms';
import { Lineup, Player } from '../_interfaces/lineupInterface';
import { LineupService } from '../lineup-service';
import { RouterModule } from '@angular/router';
import { TEAM_PLACEHOLDER } from '../_config/known-teams';
import { TeamLoaderService } from '../team-loader.service';

/* ---------- Consts ---------- */

const PLACEHOLDER_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="100%" height="100%" rx="12" fill="#ffffff" stroke="#1f2a37" stroke-width="4"/>
    <circle cx="80" cy="68" r="26" fill="none" stroke="#1f2a37" stroke-width="4"/>
    <path d="M36 130c10-22 34-26 44-26s34 4 44 26" fill="none" stroke="#1f2a37" stroke-width="4" stroke-linecap="round"/>
  </svg>`);

type PlayerChip = {
  id: string;
  label: string;
  kind: 'quick' | 'spar' | 'chain';
};

/* ---------- Component ---------- */

@Component({
  selector: 'app-lineup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './lineup.html',
  styleUrls: ['./lineup.scss'],
})
export class LineupComponent {
  /* DI */
  private readonly fb = inject(FormBuilder);
  private readonly lineupService = inject(LineupService);
  private readonly teamLoader = inject(TeamLoaderService);

  /* UI refs */
  @ViewChild('loadInput') loadInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('formBlock') formBlock!: ElementRef<HTMLElement>;

  /* Global, pro-App verfügbare Extras (Checkbox-Optionen) */
  globalSparExtras = signal<string[]>([]);
  globalChainExtras = signal<string[]>([]);
  teamQuery = computed(() => {
    const id = this.teamLoader.selectedTeamId();
    return id ? { team: id } : {};
  });

  /* State */
  players = signal<Player[]>([]);
  editingIndex = signal<number | null>(null);

  /* Header: Teamname */
  teamNameCtrl = this.fb.nonNullable.control('');
  teamLogoCtrl = this.fb.nonNullable.control<string>(TEAM_PLACEHOLDER);

  /* Labels / Defaults */
  readonly quickLabel = 'Laufen';
  readonly baseSpars = ['LP', 'Schild', 'Stab', 'Q-Tip'] as const;
  readonly defaultAvatar = PLACEHOLDER_AVATAR;
  readonly defaultTeamLogo = TEAM_PLACEHOLDER;

  /* Formular (Add + Edit) */
  addForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    quick: [true],

    // Basis-Pompfen
    LP: [false],
    Schild: [false],
    Stab: [false],
    QTip: [false],

    // Dynamische Pompfen-Extras
    sparsExtras: this.fb.nonNullable.array<FormControl<string>>([]),
    sparExtraInput: [''],

    // Basis-Kette
    chainNormal: [false],
    chainOben: [false],

    // Dynamische Ketten-Extras
    chainExtras: this.fb.nonNullable.array<FormControl<string>>([]),
    chainExtraInput: [''],

    // Bild (Data-URL)
    profileFile: [PLACEHOLDER_AVATAR],
  });

  /* Shortcuts */
  get sparsExtras(): FormArray<FormControl<string>> {
    return this.addForm.controls.sparsExtras;
  }
  get chainExtras(): FormArray<FormControl<string>> {
    return this.addForm.controls.chainExtras;
  }

  /* ---------- Ctor ---------- */

  constructor() {
    const snapshot = this.lineupService.snapshot as Lineup | null;

    if (snapshot?.players?.length) this.players.set([...snapshot.players]);
    if (snapshot?.teamName) this.teamNameCtrl.setValue(snapshot.teamName);
    if (snapshot?.teamLogo) {
      this.teamLogoCtrl.setValue(snapshot.teamLogo, { emitEvent: false });
    }

    // globale Extras aus vorhandenen Spielern ableiten
    if (snapshot?.players?.length) {
      const { sparSet, chainSet } = collectGlobalExtras(
        snapshot.players,
        this.baseSpars
      );
      this.globalSparExtras.set([...sparSet]);
      this.globalChainExtras.set([...chainSet]);
    }

    // Teamname live persistieren
    this.teamNameCtrl.valueChanges.subscribe((name) => {
      this.lineupService.setLineup(this.currentLineup(name || undefined));
    });

    this.teamLogoCtrl.valueChanges.subscribe(() => {
      this.lineupService.setLineup(this.currentLineup());
    });

    // Players-Änderungen persistieren
    effect(() => {
      this.lineupService.setLineup(this.currentLineup());
    });
  }

  /* ---------- UI Actions ---------- */

  // expand/collapse entfernt – Kader hat eigene Seite

  async onPickImage(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    this.addForm.patchValue({ profileFile: dataUrl });
    input.value = ''; // gleiche Datei erneut wählbar
  }

  /* Extras hinzufügen (erzeugt globale Option + wählt sie für aktuellen Spieler) */
  addSparExtra() {
    const value = norm(this.addForm.controls.sparExtraInput.value);
    if (!value) return;

    this.globalSparExtras.set(addUniqueCI(this.globalSparExtras(), value));

    if (
      !containsCI(
        this.sparsExtras.controls.map((c) => c.value),
        value
      )
    ) {
      this.sparsExtras.push(this.fb.nonNullable.control(value));
    }
    this.addForm.controls.sparExtraInput.setValue('');
  }

  addChainExtra() {
    const value = norm(this.addForm.controls.chainExtraInput.value);
    if (!value) return;

    this.globalChainExtras.set(addUniqueCI(this.globalChainExtras(), value));

    if (
      !containsCI(
        this.chainExtras.controls.map((c) => c.value),
        value
      )
    ) {
      this.chainExtras.push(this.fb.nonNullable.control(value));
    }
    this.addForm.controls.chainExtraInput.setValue('');
  }

  /* Checkbox-Toggle für globale Extras (pro Spieler) */
  toggleSparExtra(opt: string) {
    toggleFormArrayValueCI(this.sparsExtras, opt, this.fb);
  }
  toggleChainExtra(opt: string) {
    toggleFormArrayValueCI(this.chainExtras, opt, this.fb);
  }

  /* Remove aus aktuellem Formular (nicht global) – nur falls noch irgendwo genutzt */
  removeSparExtra(i: number) {
    this.sparsExtras.removeAt(i);
  }
  removeChainExtra(i: number) {
    this.chainExtras.removeAt(i);
  }
  /** Ist die Spar-Extra-Option für den aktuellen Spieler ausgewählt? */
  hasSparExtra(opt: string): boolean {
    return containsCI(
      this.sparsExtras.controls.map((c) => c.value),
      opt
    );
  }

  /** Ist die Chain-Extra-Option für den aktuellen Spieler ausgewählt? */
  hasChainExtra(opt: string): boolean {
    return containsCI(
      this.chainExtras.controls.map((c) => c.value),
      opt
    );
  }

  /** Entfernt eine globale Spar-Option (und bei allen Spielern, inkl. aktuellem Formular) */
  removeGlobalSparExtra(opt: string) {
    const o = norm(opt);
    this.globalSparExtras.set(
      this.globalSparExtras().filter((x) => !eqCI(x, o))
    );

    // aus allen Spielern entfernen
    this.players.update((players) =>
      players.map((p) => ({ ...p, spars: p.spars.filter((s) => !eqCI(s, o)) }))
    );

    // aus aktuellem Formular entfernen
    const idx = this.sparsExtras.controls.findIndex((c) => eqCI(c.value, o));
    if (idx >= 0) this.sparsExtras.removeAt(idx);
  }

  /** Entfernt eine globale Ketten-Option (und bei allen Spielern, inkl. aktuellem Formular) */
  removeGlobalChainExtra(opt: string) {
    const o = norm(opt);
    this.globalChainExtras.set(
      this.globalChainExtras().filter((x) => !eqCI(x, o))
    );

    this.players.update((players) =>
      players.map((p) => ({
        ...p,
        chains: p.chains.filter((c) => !eqCI(c, o)),
      }))
    );

    const idx = this.chainExtras.controls.findIndex((c) => eqCI(c.value, o));
    if (idx >= 0) this.chainExtras.removeAt(idx);
  }

  /* Formular -> Player */
  private buildPlayerFromForm(): Player {
    const v = this.addForm.getRawValue();

    const spars = [
      ...(v.LP ? ['LP'] : []),
      ...(v.Schild ? ['Schild'] : []),
      ...(v.Stab ? ['Stab'] : []),
      ...(v.QTip ? ['Q-Tip'] : []),
      ...this.sparsExtras.controls.map((c) => c.value.trim()).filter(Boolean),
    ];

    const chains = [
      ...(v.chainNormal ? ['Normal'] : []),
      ...(v.chainOben ? ['Oben'] : []),
      ...this.chainExtras.controls.map((c) => c.value.trim()).filter(Boolean),
    ];

    return {
      name: v.name.trim(),
      profilePicture: v.profileFile || PLACEHOLDER_AVATAR,
      quick: v.quick ? [this.quickLabel] : [],
      spars,
      chains,
    };
  }

  private resetFormToDefault() {
    this.addForm.reset({
      name: '',
      quick: true,
      LP: false,
      Schild: false,
      Stab: false,
      QTip: false,
      sparExtraInput: '',
      chainNormal: false,
      chainOben: false,
      chainExtraInput: '',
      profileFile: this.defaultAvatar,
    });
    while (this.sparsExtras.length) this.sparsExtras.removeAt(0);
    while (this.chainExtras.length) this.chainExtras.removeAt(0);
    this.editingIndex.set(null);
  }

  submitForm() {
    if (this.addForm.invalid) return;
    const player = this.buildPlayerFromForm();
    const idx = this.editingIndex();

    if (idx === null) {
      this.players.update((list) => [player, ...list]); // neu oben einfügen
    } else {
      this.players.update((list) => {
        const copy = [...list];
        copy[idx] = player;
        return copy;
      });
    }
    this.resetFormToDefault();
  }

  cancelEdit() {
    this.resetFormToDefault();
  }

  async startEdit(i: number) {
    await new Promise((resolve) => {
      setTimeout(() => {
        this.formBlock?.nativeElement.scrollIntoView({
          behavior: 'smooth',
        });
        resolve(null);
      }, 50);
    });
    const p = this.players()[i];
    this.editingIndex.set(i);

    const has = (s: string) => p.spars.includes(s);
    const sparExtras = p.spars.filter(
      (s) => !this.baseSpars.includes(s as any)
    );
    const chainExtras = p.chains.filter((c) => c !== 'Normal' && c !== 'Oben');

    // globale listen anreichern
    this.globalSparExtras.set(
      addManyUniqueCI(this.globalSparExtras(), sparExtras.map(norm))
    );
    this.globalChainExtras.set(
      addManyUniqueCI(this.globalChainExtras(), chainExtras.map(norm))
    );

    // form-arrays befüllen
    refillFormArray(this.sparsExtras, sparExtras.map(norm), this.fb);
    refillFormArray(this.chainExtras, chainExtras.map(norm), this.fb);

    this.addForm.patchValue({
      name: p.name,
      quick: p.quick.includes(this.quickLabel),
      LP: has('LP'),
      Schild: has('Schild'),
      Stab: has('Stab'),
      QTip: has('Q-Tip'),
      sparExtraInput: '',
      chainNormal: p.chains.includes('Normal'),
      chainOben: p.chains.includes('Oben'),
      chainExtraInput: '',
      profileFile: p.profilePicture || this.defaultAvatar,
    });

    // expand/collapse nicht mehr nötig; Formular bleibt sichtbar
  }

  delete(i: number) {
    this.players.update((list) => list.filter((_, idx) => idx !== i));
    if (this.editingIndex() === i) this.resetFormToDefault();
  }

  /* Anzeige-Tags */
  chipList(p: Player): PlayerChip[] {
    const chips: PlayerChip[] = [];
    const slug = norm(p.name).toLowerCase() || 'player';

    p.quick.forEach((raw, idx) => {
      const text = norm(raw) || this.quickLabel;
      chips.push({
        id: `quick-${slug}-${idx}-${text.toLowerCase()}`,
        label: text,
        kind: 'quick',
      });
    });

    p.spars.forEach((raw, idx) => {
      const text = norm(raw);
      if (!text) return;
      chips.push({
        id: `spar-${slug}-${idx}-${text.toLowerCase()}`,
        label: text,
        kind: 'spar',
      });
    });

    p.chains.forEach((raw, idx) => {
      const mode = norm(raw);
      if (!mode) return;
      chips.push({
        id: `chain-${slug}-${idx}-${mode.toLowerCase()}`,
        label: `Kette · ${mode}`,
        kind: 'chain',
      });
    });

    return chips;
  }

  /* ---------- Save / Load ---------- */

  save() {
    const lineup = this.currentLineup();
    const blob = new Blob([JSON.stringify(lineup, null, 2)], {
      type: 'application/json',
    });

    const team = (lineup.teamName || 'unbenannt').replace(/[^\w\-]+/g, '_');
    const filename = `${team}.randomizer`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    console.log('Gespeichert:', filename, lineup);
  }

  load() {
    this.loadInputRef?.nativeElement.click();
  }

  async onLoadPicked(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!isLineup(json)) {
        alert('Ungültige .randomizer-Datei (Schema passt nicht).');
        input.value = '';
        return;
      }

      // apply
      this.players.set([...json.players]);
      this.teamNameCtrl.setValue(json.teamName || '', { emitEvent: true });
      this.teamLogoCtrl.setValue(json.teamLogo || this.defaultTeamLogo, {
        emitEvent: true,
      });
      this.resetFormToDefault();

      // globale listen aus geladenem lineup neu aufbauen
      const { sparSet, chainSet } = collectGlobalExtras(
        json.players,
        this.baseSpars
      );
      this.globalSparExtras.set([...sparSet]);
      this.globalChainExtras.set([...chainSet]);

      console.log('Geladen:', file.name, json);
    } catch (e) {
      console.error(e);
      alert('Datei konnte nicht gelesen oder geparst werden.');
    } finally {
      input.value = '';
    }
  }

  /* ---------- Private helpers ---------- */

  async onPickTeamLogo(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      this.teamLogoCtrl.setValue(dataUrl || this.defaultTeamLogo, {
        emitEvent: true,
      });
    } finally {
      input.value = '';
    }
  }

  private currentLineup(overwriteName?: string): Lineup {
    const name = overwriteName ?? (this.teamNameCtrl.value || undefined);
    const logo = this.teamLogoCtrl.value || undefined;
    return { players: this.players(), teamName: name, teamLogo: logo };
  }
}

/* ================= Helpers (module-scope) ================= */

function norm(s: string) {
  return (s ?? '').trim();
}
function eqCI(a: string, b: string) {
  return a?.toLowerCase() === b?.toLowerCase();
}
function containsCI(haystack: string[], needle: string) {
  return haystack.some((x) => eqCI(x, needle));
}
function addUniqueCI(list: string[], value: string) {
  if (!value) return list;
  return containsCI(list, value) ? list : [...list, value];
}
function addManyUniqueCI(list: string[], values: string[]) {
  let out = list;
  for (const v of values) out = addUniqueCI(out, v);
  return out;
}

function refillFormArray(
  arr: FormArray<FormControl<string>>,
  values: string[],
  fb: FormBuilder
) {
  while (arr.length) arr.removeAt(0);
  values.forEach((v) => arr.push(fb.nonNullable.control(v)));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(new Error('read error'));
    r.onload = () => res(String(r.result));
    r.readAsDataURL(file);
  });
}

function isLineup(x: any): x is Lineup {
  if (!x || typeof x !== 'object') return false;
  if (!Array.isArray(x.players)) return false;

  const okPlayers = x.players.every(
    (p: any) =>
      p &&
      typeof p.name === 'string' &&
      typeof p.profilePicture === 'string' &&
      Array.isArray(p.quick) &&
      Array.isArray(p.spars) &&
      Array.isArray(p.chains)
  );

  if (!okPlayers) return false;
  if (x.teamName != null && typeof x.teamName !== 'string') return false;
  if (x.teamLogo != null && typeof x.teamLogo !== 'string') return false;
  return true;
}

function collectGlobalExtras(players: Player[], baseSpars: readonly string[]) {
  const sparSet = new Set<string>();
  const chainSet = new Set<string>();

  for (const p of players) {
    for (const x of p.spars)
      if (!baseSpars.includes(x as any)) sparSet.add(norm(x));
    for (const x of p.chains)
      if (x !== 'Normal' && x !== 'Oben') chainSet.add(norm(x));
  }
  return { sparSet, chainSet };
}

// Helper: Wert in einem FormArray<string> togglen (case-insensitive)
function toggleFormArrayValueCI(
  arr: FormArray<FormControl<string>>,
  value: string,
  fb: FormBuilder
) {
  const v = (value ?? '').trim();
  const idx = arr.controls.findIndex(
    (c) => (c.value ?? '').toLowerCase() === v.toLowerCase()
  );
  if (idx >= 0) {
    arr.removeAt(idx);
  } else {
    arr.push(fb.nonNullable.control(v));
  }
}
