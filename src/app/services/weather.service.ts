import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';
import { WeatherData, BetOption } from '../models/weather.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly API_KEY = environment.weatherApiKey;
  private readonly API_URL = environment.weatherApiUrl;
  private readonly FORECAST_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';

  constructor(private http: HttpClient) {}

  getWeatherData(location: string): Observable<WeatherData> {
    // Use mock data if API key is 'demo', otherwise use real API
    if (this.API_KEY === 'demo') {
      return of(this.generateMockWeatherData(location)).pipe(
        delay(500),
        map(data => data)
      );
    }

    // Real API call
    return this.http.get<any>(`${this.API_URL}?q=${location}&appid=${this.API_KEY}&units=imperial`).pipe(
      map(response => ({
        location: response.name,
        temperature: response.main.temp,
        condition: response.weather[0].main,
        humidity: response.main.humidity,
        windSpeed: response.wind?.speed || 0, // Already in mph with imperial units
        description: response.weather[0].description
      })),
      catchError(error => {
        console.error('Weather API error:', error);
        // If it's an API key error (401), throw it so the component can handle it
        if (error.status === 401 || (error.error && error.error.cod === 401)) {
          throw error;
        }
        // Fallback to mock data on other errors
        return of(this.generateMockWeatherData(location));
      })
    );
  }

  getForecastForDay(location: string, targetDate: Date): Observable<WeatherData> {
    // Use mock data if API key is 'demo', otherwise use real API
    if (this.API_KEY === 'demo') {
      return of(this.generateMockWeatherData(location)).pipe(
        delay(500),
        map(data => data)
      );
    }

    // Real API call - get 5-day forecast
    return this.http.get<any>(`${this.FORECAST_API_URL}?q=${location}&appid=${this.API_KEY}&units=imperial`).pipe(
      map(response => {
        // Find the forecast closest to the target date
        const targetTime = targetDate.getTime();
        let closestForecast = response.list[0];
        let minDiff = Math.abs(new Date(closestForecast.dt * 1000).getTime() - targetTime);

        for (const forecast of response.list) {
          const forecastTime = new Date(forecast.dt * 1000).getTime();
          const diff = Math.abs(forecastTime - targetTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestForecast = forecast;
          }
        }

        return {
          location: response.city.name,
          temperature: closestForecast.main.temp,
          condition: closestForecast.weather[0].main,
          humidity: closestForecast.main.humidity,
          windSpeed: closestForecast.wind?.speed || 0,
          description: closestForecast.weather[0].description
        };
      }),
      catchError(error => {
        console.error('Forecast API error:', error);
        // If it's an API key error (401), throw it so the component can handle it
        if (error.status === 401 || (error.error && error.error.cod === 401)) {
          throw error;
        }
        // Fallback to mock data on other errors
        return of(this.generateMockWeatherData(location));
      })
    );
  }

  getBetOptions(weatherData: WeatherData, baselineTemp: number = 65): BetOption[] {
    const forecastTemp = weatherData.temperature;
    const tempDiff = forecastTemp - baselineTemp;
    
    // Calculate odds based on how likely higher/lower is
    // If forecast is much higher than baseline, "Higher" has lower odds (more likely)
    // If forecast is much lower than baseline, "Lower" has lower odds (more likely)
    
    // Normalize the difference to calculate probability
    // Assuming typical range is -20 to +20 degrees from baseline
    const normalizedDiff = Math.max(-1, Math.min(1, tempDiff / 20));
    
    // Probability that it will be higher (0 to 1)
    const probHigher = 0.5 + (normalizedDiff * 0.3); // Range from 0.2 to 0.8
    const probLower = 1 - probHigher;
    
    // Convert probability to odds (odds = 1 / probability, with house edge)
    const houseEdge = 0.1; // 10% house edge
    const oddsHigher = Math.max(1.1, Math.min(3.0, (1 / probHigher) * (1 - houseEdge)));
    const oddsLower = Math.max(1.1, Math.min(3.0, (1 / probLower) * (1 - houseEdge)));
    
    // Round to 2 decimal places
    const roundedOddsHigher = Math.round(oddsHigher * 100) / 100;
    const roundedOddsLower = Math.round(oddsLower * 100) / 100;
    
    return [
      {
        id: 'temp-higher',
        label: 'Higher',
        odds: roundedOddsHigher,
        description: `Bet that temperature will be higher than ${baselineTemp}°F (Forecast: ${forecastTemp.toFixed(1)}°F)`
      },
      {
        id: 'temp-lower',
        label: 'Lower',
        odds: roundedOddsLower,
        description: `Bet that temperature will be lower than ${baselineTemp}°F (Forecast: ${forecastTemp.toFixed(1)}°F)`
      }
    ];
  }

  private generateMockWeatherData(location: string): WeatherData {
    const conditions = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm'];
    const descriptions = [
      'clear sky', 'few clouds', 'scattered clouds', 'broken clouds',
      'shower rain', 'rain', 'thunderstorm', 'snow', 'mist'
    ];
    
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    const baseTemp = 59 + Math.random() * 27; // 59-86°F (equivalent to 15-30°C)
    
    return {
      location,
      temperature: Math.round(baseTemp * 10) / 10,
      condition: randomCondition,
      humidity: Math.round(40 + Math.random() * 50),
      windSpeed: Math.round((3 + Math.random() * 12) * 10) / 10, // 3-15 mph
      description: randomDescription
    };
  }

  resolveBet(betOption: BetOption, weatherData: WeatherData, baselineTemp: number = 65): boolean {
    switch (betOption.id) {
      case 'temp-higher':
        return weatherData.temperature > baselineTemp;
      case 'temp-lower':
        return weatherData.temperature < baselineTemp;
      // Keep old cases for backward compatibility
      case 'temp-above-68':
        return weatherData.temperature > 68;
      case 'temp-below-59':
        return weatherData.temperature < 59;
      case 'rain':
        return weatherData.condition.toLowerCase().includes('rain') || 
               weatherData.description.toLowerCase().includes('rain');
      case 'sunny':
        return weatherData.condition.toLowerCase().includes('clear') || 
               weatherData.description.toLowerCase().includes('clear');
      case 'windy':
        return weatherData.windSpeed > 10;
      case 'humidity-high':
        return weatherData.humidity > 70;
      default:
        return false;
    }
  }
}

