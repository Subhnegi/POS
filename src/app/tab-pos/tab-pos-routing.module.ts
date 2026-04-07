import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabPosPage } from './tab-pos.page';

const routes: Routes = [
  { path: '', component: TabPosPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabPosPageRoutingModule {}
