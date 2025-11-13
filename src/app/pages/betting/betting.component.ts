import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../../services/weather.service';
import { WalletService } from '../../services/wallet.service';
import { BettingService } from '../../services/betting.service';
import { PreferencesService } from '../../services/preferences.service';
import { WeatherData, BetOption, Bet } from '../../models/weather.model';

interface DayBet {
  day: string;
  date: Date;
  weatherData: WeatherData | null;
  betOptions: BetOption[];
  loading: boolean;
}

@Component({
  selector: 'app-betting',
  templateUrl: './betting.component.html',
  styleUrls: ['./betting.component.scss']
})
export class BettingComponent implements OnInit {
  location: string = 'Athens,OH,US';
  days: DayBet[] = [];
  selectedDay: DayBet | null = null;
  selectedOption: BetOption | null = null;
  betAmount: number = 10;
  showModal: boolean = false;
  modalMessage: string = '';
  modalType: 'success' | 'error' | '' = '';
  baselineTemp: number = 65;

  constructor(
    public walletService: WalletService,
    private weatherService: WeatherService,
    private bettingService: BettingService,
    private preferencesService: PreferencesService
  ) {}

  ngOnInit(): void {
    this.location = this.preferencesService.getLocation();
    this.initializeDays();
    this.loadWeatherForAllDays();
  }

  initializeDays(): void {
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      this.days.push({
        day: dayNames[date.getDay()],
        date: date,
        weatherData: null,
        betOptions: [],
        loading: false
      });
    }
  }

  loadWeatherForAllDays(): void {
    // Get current weather to establish baseline temperature
    this.weatherService.getWeatherData(this.location).subscribe({
      next: (currentData) => {
        this.baselineTemp = currentData.temperature;
        
        // Load forecast for each day
        this.days.forEach(day => {
          day.loading = true;
          this.weatherService.getForecastForDay(this.location, day.date).subscribe({
            next: (data) => {
              day.weatherData = data;
              day.betOptions = this.weatherService.getBetOptions(data, this.baselineTemp);
              day.loading = false;
            },
            error: () => {
              day.loading = false;
            }
          });
        });
      },
      error: () => {
        // If current weather fails, use default baseline
        this.baselineTemp = 65;
        this.days.forEach(day => {
          day.loading = true;
          this.weatherService.getForecastForDay(this.location, day.date).subscribe({
            next: (data) => {
              day.weatherData = data;
              day.betOptions = this.weatherService.getBetOptions(data, this.baselineTemp);
              day.loading = false;
            },
            error: () => {
              day.loading = false;
            }
          });
        });
      }
    });
  }

  onLocationChange(): void {
    this.preferencesService.setLocation(this.location);
    this.loadWeatherForAllDays();
  }

  openBetModal(day: DayBet, option: BetOption): void {
    this.selectedDay = day;
    this.selectedOption = option;
    this.betAmount = 10;
    this.showModal = true;
    this.calculatePayout();
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedDay = null;
    this.selectedOption = null;
    this.betAmount = 10;
    this.modalMessage = '';
    this.modalType = '';
  }

  onModalAmountChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Parse numeric value from the input; if invalid, default to 0
    const val = Number(input.value);
    if (isNaN(val)) {
      this.betAmount = 0;
      return;
    }

    // Disallow negative values by clamping to minimum 1
    if (val < 1) {
      this.betAmount = 1;
      // Reflect the clamped value back to the input element so the UI updates immediately
      input.value = String(this.betAmount);
      return;
    }

    // Otherwise accept the parsed value
    this.betAmount = val;
  }

  preventMinus(event: KeyboardEvent): void {
    // Prevent entering a minus sign which would allow negative numbers
    if (event.key === '-' || event.key === 'e' || event.key === '+' ) {
      event.preventDefault();
    }
  }

  calculatePayout(): void {
    // This will be used in the template
  }

  getPotentialPayout(): number {
    if (this.selectedOption && this.betAmount > 0) {
      return this.betAmount * this.selectedOption.odds;
    }
    return 0;
  }

  placeBet(): void {
    if (!this.selectedDay || !this.selectedOption) {
      this.showMessage('Please select a bet option', 'error');
      return;
    }

    if (this.betAmount <= 0) {
      this.showMessage('Please enter a valid bet amount', 'error');
      return;
    }

    if (this.betAmount > this.walletService.getBalance()) {
      this.showMessage('Insufficient balance', 'error');
      return;
    }

    if (this.walletService.deduct(this.betAmount)) {
      const bet: Bet = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        option: this.selectedOption,
        amount: this.betAmount,
        timestamp: new Date(),
        location: this.location,
        resolved: false
      };

      this.bettingService.placeBet(bet);
      
      setTimeout(() => {
        this.resolveBet(bet);
      }, 2000);

      this.showMessage(`Bet placed! Resolving in 2 seconds...`, 'success');
      
      setTimeout(() => {
        this.closeModal();
      }, 2500);
    } else {
      this.showMessage('Failed to place bet', 'error');
    }
  }

  resolveBet(bet: Bet): void {
    if (!this.selectedDay?.weatherData) return;
    
    const won = this.weatherService.resolveBet(bet.option, this.selectedDay.weatherData, this.baselineTemp);
    const payout = won ? bet.amount * bet.option.odds : 0;
    
    this.bettingService.resolveBet(bet.id, won, payout);
    
    if (won) {
      this.walletService.add(payout);
      this.showMessage(`You won! Payout: $${payout.toFixed(2)}`, 'success');
    } else {
      this.showMessage(`You lost. Better luck next time!`, 'error');
    }
  }

  showMessage(text: string, type: 'success' | 'error'): void {
    this.modalMessage = text;
    this.modalType = type;
  }
}

