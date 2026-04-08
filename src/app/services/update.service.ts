import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
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

  constructor(private alertController: AlertController) {}

  async checkForUpdate(): Promise<void> {
    // Only check on native platforms (Android/iOS), not web
    if (!Capacitor.isNativePlatform()) return;

    // Skip if the version placeholder wasn't replaced (local dev)
    if (environment.appVersion.startsWith('__')) return;

    // Throttle checks
    const lastCheck = parseInt(localStorage.getItem(this.LAST_CHECK_KEY) || '0', 10);
    if (Date.now() - lastCheck < this.CHECK_INTERVAL) return;
    localStorage.setItem(this.LAST_CHECK_KEY, Date.now().toString());

    try {
      const release = await this.fetchLatestRelease();
      if (!release) return;

      const latestTag = release.tag_name;
      const currentVersion = environment.appVersion;

      // Same version — no update
      if (latestTag === currentVersion) return;

      // User previously skipped this exact version
      const skipped = localStorage.getItem(this.SKIP_KEY);
      if (skipped === latestTag) return;

      // Find APK asset
      const apkAsset = release.assets.find(a => a.name.endsWith('.apk'));
      const downloadUrl = apkAsset?.browser_download_url || release.html_url;

      await this.showUpdatePrompt(latestTag, release.body || '', downloadUrl);
    } catch {
      // Silently fail — update check is non-critical
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
            window.open(downloadUrl, '_system');
          }
        }
      ]
    });
    await alert.present();
  }

  private truncate(text: string, max: number): string {
    return text.length > max ? text.substring(0, max) + '…' : text;
  }
}
