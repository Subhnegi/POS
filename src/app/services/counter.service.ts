import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CounterService {
  private counterId: string;

  constructor() {
    // Use sessionStorage so each tab gets its own counter ID
    let stored = sessionStorage.getItem('pos_counter_id');
    if (!stored) {
      stored = this.generateCounterId();
      sessionStorage.setItem('pos_counter_id', stored);
    }
    this.counterId = stored;
  }

  getCounterId(): string {
    return this.counterId;
  }

  getCounterLabel(): string {
    return `Counter-${this.counterId.substring(0, 6).toUpperCase()}`;
  }

  private generateCounterId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
