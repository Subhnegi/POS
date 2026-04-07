import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabReportsPage } from './tab-reports.page';

const routes: Routes = [
  {
    path: '',
    component: TabReportsPage,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabReportsPageRoutingModule {}
