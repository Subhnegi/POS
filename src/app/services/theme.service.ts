import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'pos-theme';
  isDark = true;

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    this.isDark = saved !== 'light';
    this.applyTheme();
  }

  toggle(): void {
    this.isDark = !this.isDark;
    localStorage.setItem(this.STORAGE_KEY, this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    document.body.classList.toggle('light-theme', !this.isDark);
    document.body.classList.toggle('dark-theme', this.isDark);
  }
}
