import { Routes } from '@angular/router';
import { Landingpage } from './landingpage/landingpage';
import { Mainpage } from './mainpage/mainpage';
import { InputForLineupComponent } from './input-for-lineup/input-for-lineup';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/landingpage',
    pathMatch: 'full',
  },
  {
    path: 'landingpage',
    component: Landingpage,
  },
  {
    path: 'input',
    component: InputForLineupComponent,
  },
  {
    path: 'mainpage',
    component: Mainpage,
  },
];
