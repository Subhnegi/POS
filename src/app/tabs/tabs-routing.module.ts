import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () => import('../tab-home/tab-home.module').then(m => m.TabHomePageModule)
      },
      {
        path: 'pos',
        loadChildren: () => import('../tab-pos/tab-pos.module').then(m => m.TabPosPageModule)
      },
      {
        path: 'inventory',
        loadChildren: () => import('../tab-inventory/tab-inventory.module').then(m => m.TabInventoryPageModule)
      },
      {
        path: 'transactions',
        loadChildren: () => import('../tab-transactions/tab-transactions.module').then(m => m.TabTransactionsPageModule)
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
