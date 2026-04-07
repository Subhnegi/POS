import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabTransactionsPage } from './tab-transactions.page';

const routes: Routes = [
  { path: '', component: TabTransactionsPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabTransactionsPageRoutingModule {}
