import { Routes } from '@angular/router';
import { Mainpage } from './mainpage/mainpage';
import { LineupComponent } from './lineup/lineup';
import { GeneratorComponent } from './generator/generator';
import { InputForLineupComponent } from './input-for-lineup/input-for-lineup';

export const routes: Routes = [
  { path: '', redirectTo: '/input', pathMatch: 'full' },
  // Shell-Layout für alle Seiten
  {
    path: '',
    component: Mainpage,
    children: [
      { path: 'input', component: InputForLineupComponent },
      { path: 'kader', component: LineupComponent },
      { path: 'generator', component: GeneratorComponent },
      { path: 'mainpage', redirectTo: 'generator', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/input' },
];
