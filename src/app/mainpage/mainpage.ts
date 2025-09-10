import { Component, computed, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LineupService } from '../lineup-service';
import { LineupComponent } from '../lineup/lineup';
import { GeneratorComponent } from '../generator/generator';

@Component({
  selector: 'app-mainpage',
  imports: [LineupComponent, GeneratorComponent, RouterModule],
  templateUrl: './mainpage.html',
  styleUrl: './mainpage.scss',
})
export class Mainpage {
  showRaw = signal(false);

  constructor(public lineupService: LineupService, private router: Router) {}

  backToInput() {
    this.router.navigateByUrl('/input');
  }

  toggleRaw() {
    this.showRaw.update((v) => !v);
  }

  // einfache Heuristik, bis wir das echte Schema kennen:
  // versuch, Spieleranzahl zu schätzen
  readonly playerCount = computed(() => {
    const data = this.lineupService.snapshot as any;
    if (!data) return 0;
    if (Array.isArray(data)) return data.length;
    if (Array.isArray(data?.players)) return data.players.length;
    return 0;
  });
}
