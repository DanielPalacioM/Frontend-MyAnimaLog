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
  },
  {
    path: 'pet-profile',
    loadChildren: () => import('./views/pet-profile/pet-profile.module').then( m => m.PetProfilePageModule)
  },
  {
  path: 'add-pet',
  loadChildren: () => import('./views/add-pet/add-pet-module').then(m => m.AddPetModule)
},

{
    path: 'pets/:id/edit',
    loadChildren: () => import('./views/add-pet/add-pet-module').then(m => m.AddPetModule)
  },
  {
  path: 'register-vaccine',
  loadChildren: () => import('./views/register-vaccine/register-vaccine-module').then(m => m.RegisterVaccineModule)
},

{
path: 'vaccine-timeline',
loadChildren: () => import('./views/vaccine-timeline/vaccine-timeline-module').then(m => m.VaccineTimelineModule)

},
  
  {
    path: 'vaccine-info',
    loadChildren: () => import('./views/vaccine-info/vaccine-info.module').then( m => m.VaccineInfoPageModule)
  },  {
    path: 'medical-history',
    loadChildren: () => import('./views/medical-history/medical-history/medical-history.module').then( m => m.MedicalHistoryPageModule)
  },
  {
    path: 'add-record',
    loadChildren: () => import('./views/medical-history/add-record/add-record.module').then( m => m.AddRecordPageModule)
  },
  {
    path: 'add-surgery',
    loadChildren: () => import('./views/medical-history/add-surgery/add-surgery.module').then( m => m.AddSurgeryPageModule)
  },
  {
    path: 'add-consultation',
    loadChildren: () => import('./views/medical-history/add-consultation/add-consultation.module').then( m => m.AddConsultationPageModule)
  },
  {
    path: 'add-treatment',
    loadChildren: () => import('./views/medical-history/add-treatment/add-treatment.module').then( m => m.AddTreatmentPageModule)
  },
  {
    path: 'add-lab',
    loadChildren: () => import('./views/medical-history/add-lab/add-lab.module').then( m => m.AddLabPageModule)
  }


  

  
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
