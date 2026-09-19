import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DocumentInfoPage } from './document-info.page';

const routes: Routes = [
  {
    path: '',
    component: DocumentInfoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DocumentInfoPageRoutingModule {}
