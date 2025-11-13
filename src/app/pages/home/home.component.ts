import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../../services/weather.service';
import { WeatherData } from '../../models/weather.model';

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

  constructor(private weatherService: WeatherService) {}

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

