import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../services/wallet.service';
import { WeatherService } from '../../services/weather.service';
import { BettingService } from '../../services/betting.service';
import { WeatherData, BetOption } from '../../models/weather.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  location: string = 'Athens,OH,US';
  weatherData: WeatherData | null = null;
  betOptions: BetOption[] = [];
  loading: boolean = false;
  error: string | null = null;

  constructor(
    public walletService: WalletService,
    private weatherService: WeatherService,
    private bettingService: BettingService
  ) {}

  ngOnInit(): void {
    this.loadWeatherData();
  }

  loadWeatherData(): void {
    if (!this.location.trim()) {
      this.error = 'Please enter a location';
      return;
    }

    this.loading = true;
    this.error = null;

    this.weatherService.getWeatherData(this.location).subscribe({
      next: (data) => {
        this.weatherData = data;
        this.betOptions = this.weatherService.getBetOptions(data);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load weather data. Please try again.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onLocationChange(): void {
    this.loadWeatherData();
  }
}

