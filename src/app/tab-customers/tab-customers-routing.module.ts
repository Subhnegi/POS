import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabCustomersPage } from './tab-customers.page';

const routes: Routes = [{ path: '', component: TabCustomersPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabCustomersPageRoutingModule {}
