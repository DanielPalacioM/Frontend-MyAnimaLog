import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { vetLinkGuard } from '../../guards/vet-link.guard';
import { VetPage } from './vet.page';
import { VetLinkPage } from './vet-link/vet-link.page';
import { VetSharePage } from './vet-share/vet-share.page';
import { VetDetailPage } from './vet-detail/vet-detail.page';

// Todas cuelgan de `/vet` (registrada en app-routing): /vet, /vet/link, /vet/share/:vetId, /vet/detail/:vetId.
const routes: Routes = [
  { path: '', component: VetPage },
  { path: 'link', component: VetLinkPage, canActivate: [vetLinkGuard] },
  { path: 'share/:vetId', component: VetSharePage },
  { path: 'detail/:vetId', component: VetDetailPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VetPageRoutingModule {}
