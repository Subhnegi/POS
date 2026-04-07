import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabReportsPage } from './tab-reports.page';
import { TabReportsPageRoutingModule } from './tab-reports-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TabReportsPageRoutingModule
  ],
  declarations: [TabReportsPage]
})
export class TabReportsPageModule {}
