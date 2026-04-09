import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { environment } from '../../environments/environment';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  assets: { name: string; browser_download_url: string }[];
}

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly SKIP_KEY = 'pos_skipped_version';
  private readonly CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
  private readonly LAST_CHECK_KEY = 'pos_last_update_check';

  readonly appVersion = environment.appVersion;

  constructor(
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  /** Auto-check on startup (throttled, respects skip) */
  async checkForUpdate(): Promise<void> {
    // Skip if the version placeholder wasn't replaced (local dev)
    if (this.appVersion.startsWith('__')) return;

    // Throttle checks
    const lastCheck = parseInt(localStorage.getItem(this.LAST_CHECK_KEY) || '0', 10);
    if (Date.now() - lastCheck < this.CHECK_INTERVAL) return;
    localStorage.setItem(this.LAST_CHECK_KEY, Date.now().toString());

    await this.doCheck(false);
  }

  /** Manual check from sidebar button (no throttle, ignores skip) */
  async checkForUpdateManual(): Promise<void> {
    if (this.appVersion.startsWith('__')) {
      await this.showToast('Version not set — running in dev mode');
      return;
    }
    await this.doCheck(true);
  }

  private async doCheck(manual: boolean): Promise<void> {
    try {
      const release = await this.fetchLatestRelease();
      if (!release) {
        if (manual) await this.showToast('Could not reach GitHub. Check your connection.');
        return;
      }

      const latestTag = release.tag_name;

      // Compare semantic versions (strip v prefix and -commitHash suffix)
      const currentSemver = this.extractSemver(this.appVersion);
      const latestSemver = this.extractSemver(latestTag);

      // If we can't parse either, fall back to string equality
      if (!currentSemver || !latestSemver) {
        if (latestTag === this.appVersion) {
          if (manual) await this.showToast('You are on the latest version!');
          return;
        }
      } else {
        const cmp = this.compareSemver(currentSemver, latestSemver);
        // cmp >= 0 means current is same or newer — no update needed
        if (cmp >= 0) {
          if (manual) await this.showToast('You are on the latest version!');
          return;
        }
      }

      // Auto-check respects skip; manual does not
      if (!manual) {
        const skipped = localStorage.getItem(this.SKIP_KEY);
        if (skipped === latestTag) return;
      }

      // Find APK asset
      const apkAsset = release.assets.find(a => a.name.endsWith('.apk'));
      const downloadUrl = apkAsset?.browser_download_url || release.html_url;

      await this.showUpdatePrompt(latestTag, release.body || '', downloadUrl);
    } catch {
      if (manual) await this.showToast('Update check failed. Try again later.');
    }
  }

  private async fetchLatestRelease(): Promise<GitHubRelease | null> {
    const url = `https://api.github.com/repos/${environment.githubRepo}/releases/latest`;
    const response = await fetch(url, {
      headers: { Accept: 'application/vnd.github.v3+json' }
    });
    if (!response.ok) return null;
    return response.json();
  }

  private async showUpdatePrompt(version: string, notes: string, downloadUrl: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Update Available',
      subHeader: `Version ${version}`,
      message: notes
        ? this.truncate(notes, 200)
        : 'A new version of POS Terminal is available.',
      buttons: [
        {
          text: 'Later',
          role: 'cancel'
        },
        {
          text: 'Skip Version',
          handler: () => {
            localStorage.setItem(this.SKIP_KEY, version);
          }
        },
        {
          text: 'Update Now',
          handler: () => {
            if (Capacitor.isNativePlatform()) {
              Browser.open({ url: downloadUrl });
            } else {
              window.open(downloadUrl, '_blank');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'top',
      color: 'medium'
    });
    await toast.present();
  }

  /** Extract [major, minor, patch] from tags like "v1.0.3-abc1234" or "1.0.3" */
  private extractSemver(tag: string): number[] | null {
    const m = tag.match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (!m) return null;
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  }

  /** Returns negative if a < b, 0 if equal, positive if a > b */
  private compareSemver(a: number[], b: number[]): number {
    for (let i = 0; i < 3; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  }

  private truncate(text: string, max: number): string {
    return text.length > max ? text.substring(0, max) + '…' : text;
  }
}
