import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/config-wizard/config-wizard.component').then((m) => m.ConfigWizardComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
