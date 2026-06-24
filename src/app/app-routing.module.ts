import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./views/home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./views/login/login.module').then( m => m.LoginPageModule)
  },

  {
    path: 'register',
    loadChildren: () => import('./views/register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'recover-password',
    loadChildren: () => import('./views/recover-password/recover-password.module').then( m => m.RecoverPasswordPageModule)
  },
  {
    path: 'recover-password',
    loadChildren: () => import('./views/recover-password/recover-password.module').then( m => m.RecoverPasswordPageModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./views/profile/profile.module').then( m => m.ProfilePageModule)
  },
  {
    path: 'notifications',
    loadChildren: () => import('./views/notifications/notifications.module').then( m => m.NotificationsPageModule)
  },
  {
    path: 'shared-profiles',
    loadChildren: () => import('./views/shared-profiles/shared-profiles.module').then( m => m.SharedProfilesPageModule)
  },
  {
    path: 'shared-profiles-home',
    loadChildren: () => import('./views/shared-profiles-home/shared-profiles-home.module').then( m => m.SharedProfilesHomePageModule)
  },  {
    path: 'pet-profile',
    loadChildren: () => import('./views/pet-profile/pet-profile.module').then( m => m.PetProfilePageModule)
  },


  

  
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
