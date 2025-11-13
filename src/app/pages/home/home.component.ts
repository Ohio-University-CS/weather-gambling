import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../../services/weather.service';
import { PreferencesService } from '../../services/preferences.service';
import { BettingService } from '../../services/betting.service';
import { WeatherData, Bet } from '../../models/weather.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  location: string = 'Athens,OH,US';
  weatherData: WeatherData | null = null;
  loading: boolean = false;
  error: string | null = null;
  bets$: Observable<Bet[]>;

  constructor(
    private weatherService: WeatherService,
    private preferencesService: PreferencesService,
    private bettingService: BettingService
  ) {
    this.bets$ = this.bettingService.bets$;
  }

  ngOnInit(): void {
    this.location = this.preferencesService.getLocation();
    this.loadWeatherData();
    // Check for pending bets (also runs in AppComponent, but good to check here too)
    this.bettingService.checkAndResolvePendingBets();
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
        this.loading = false;
      },
      error: (err) => {
        if (err.status === 401 || (err.error && err.error.cod === 401)) {
          this.error = 'Invalid API key. Please check your OpenWeather API key configuration.';
        } else {
          this.error = 'Failed to load weather data. Please try again.';
        }
        this.loading = false;
        console.error(err);
      }
    });
  }

  onLocationChange(): void {
    this.preferencesService.setLocation(this.location);
    this.loadWeatherData();
  }


  getBetStatusClass(bet: Bet): string {
    if (!bet.resolved) {
      return 'pending';
    }
    return bet.won ? 'won' : 'lost';
  }

  isBetDue(bet: Bet): boolean {
    if (bet.resolved) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(bet.targetDate);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.getTime() <= today.getTime();
  }
}

