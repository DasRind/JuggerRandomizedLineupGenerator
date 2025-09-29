import { Routes } from '@angular/router';
import { Mainpage } from './mainpage/mainpage';
import { LineupComponent } from './lineup/lineup';
import { GeneratorComponent } from './generator/generator';
import { InputForLineupComponent } from './input-for-lineup/input-for-lineup';
import { ImpressumPage } from './legal/impressum/impressum';
import { DatenschutzPage } from './legal/datenschutz/datenschutz';

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
      { path: 'impressum', component: ImpressumPage },
      { path: 'datenschutz', component: DatenschutzPage },
      { path: 'mainpage', redirectTo: 'generator', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/input' },
];
