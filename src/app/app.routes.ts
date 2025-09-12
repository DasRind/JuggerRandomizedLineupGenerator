import { Routes } from '@angular/router';
import { Landingpage } from './landingpage/landingpage';
import { Mainpage } from './mainpage/mainpage';
import { LineupComponent } from './lineup/lineup';
import { GeneratorComponent } from './generator/generator';
import { InputForLineupComponent } from './input-for-lineup/input-for-lineup';

export const routes: Routes = [
  { path: '', redirectTo: '/landingpage', pathMatch: 'full' },
  { path: 'landingpage', component: Landingpage },
  // Shell-Layout: alle Seiten außer Landingpage im Mainpage-Frame
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
];
