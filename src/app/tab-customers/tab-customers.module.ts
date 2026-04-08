import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabCustomersPage } from './tab-customers.page';
import { TabCustomersPageRoutingModule } from './tab-customers-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TabCustomersPageRoutingModule
  ],
  declarations: [TabCustomersPage]
})
export class TabCustomersPageModule {}
