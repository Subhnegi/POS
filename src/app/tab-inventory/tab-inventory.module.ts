import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TabInventoryPage } from './tab-inventory.page';
import { TabInventoryPageRoutingModule } from './tab-inventory-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TabInventoryPageRoutingModule
  ],
  declarations: [TabInventoryPage]
})
export class TabInventoryPageModule {}
