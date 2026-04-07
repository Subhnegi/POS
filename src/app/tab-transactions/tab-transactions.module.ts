import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabTransactionsPage } from './tab-transactions.page';
import { TabTransactionsPageRoutingModule } from './tab-transactions-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TabTransactionsPageRoutingModule
  ],
  declarations: [TabTransactionsPage]
})
export class TabTransactionsPageModule {}
