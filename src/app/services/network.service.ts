import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NetworkService implements OnDestroy {
  private onlineStatus = new BehaviorSubject<boolean>(navigator.onLine);
  isOnline$ = this.onlineStatus.asObservable();

  private onlineHandler = () => this.onlineStatus.next(true);
  private offlineHandler = () => this.onlineStatus.next(false);

  constructor() {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  get isOnline(): boolean {
    return this.onlineStatus.getValue();
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }
}
