import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor } from '@angular/common';

type Tile = { src: string; alt?: string };

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180">
    <rect x="1" y="1" width="238" height="178" rx="12" fill="#ffffff" stroke="#1f2a37" stroke-width="3"/>
  </svg>`);

// 👉 deine einfache „JSON“
const LANDING_TILES: Tile[] = [
  { src: 'img/players/maelPP.jpeg', alt: 'Player 1' },
  { src: 'img/players/timPP.jpeg', alt: 'Player 2' },
  { src: 'img/players/matthisPP.png', alt: 'Player 3' },
  { src: 'img/players/davidPP.png', alt: 'Player 4' },
  { src: 'img/players/tillPP.jpeg', alt: 'Player 5' },
  { src: 'img/players/martinPP.png', alt: 'Player 6' },
  { src: 'img/players/saianPP.png', alt: 'Player 7' },
];

@Component({
  selector: 'app-landingpage',
  standalone: true,
  imports: [NgFor],
  templateUrl: './landingpage.html',
  styleUrls: ['./landingpage.scss'],
})
export class Landingpage {
  private router = inject(Router);

  // reaktiv: falls du später laden willst -> this.tiles.set(neueListe)
  tiles = signal<Tile[]>(LANDING_TILES);

  goGenerate() {
    // passe an: '/mainpage' oder '/input'
    this.router.navigateByUrl('/input');
  }
}
