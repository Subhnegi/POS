import { Component, OnInit } from '@angular/core';
import { UpdateService } from './services/update.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(public updateService: UpdateService) {}

  ngOnInit(): void {
    this.updateService.checkForUpdate();
  }
}
