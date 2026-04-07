import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChartService {
  private charts: Map<string, any> = new Map();
  private chartModule: any;

  private async loadChartJs(): Promise<any> {
    if (!this.chartModule) {
      const mod = await import('chart.js');
      mod.Chart.register(...mod.registerables);
      this.chartModule = mod;
    }
    return this.chartModule;
  }

  async render(key: string, canvas: HTMLCanvasElement, config: any): Promise<void> {
    const { Chart } = await this.loadChartJs();
    const existing = this.charts.get(key);
    if (existing) existing.destroy();
    this.charts.set(key, new Chart(canvas, config));
  }

  destroyAll(): void {
    this.charts.forEach(c => c.destroy());
    this.charts.clear();
  }

  getBarOptions(yLabel: string): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#8b99ae', font: { family: 'DM Sans' } } },
      },
      scales: {
        x: {
          ticks: { color: '#556478', font: { family: 'DM Sans', size: 10 } },
          grid: { color: 'rgba(42, 52, 68, 0.5)' }
        },
        y: {
          title: { display: true, text: yLabel, color: '#8b99ae', font: { family: 'DM Sans' } },
          ticks: { color: '#556478', font: { family: 'DM Sans', size: 10 } },
          grid: { color: 'rgba(42, 52, 68, 0.5)' },
          beginAtZero: true
        }
      }
    };
  }

  getLineOptions(yLabel: string): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#8b99ae', font: { family: 'DM Sans' } } },
      },
      scales: {
        x: {
          ticks: { color: '#556478', font: { family: 'DM Sans', size: 10 } },
          grid: { color: 'rgba(42, 52, 68, 0.5)' }
        },
        y: {
          title: { display: true, text: yLabel, color: '#8b99ae', font: { family: 'DM Sans' } },
          ticks: { color: '#556478', font: { family: 'DM Sans', size: 10 } },
          grid: { color: 'rgba(42, 52, 68, 0.5)' },
          beginAtZero: true
        }
      }
    };
  }

  getDoughnutOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: '#8b99ae', font: { family: 'DM Sans' }, padding: 16 }
        },
      },
      cutout: '60%'
    };
  }
}
