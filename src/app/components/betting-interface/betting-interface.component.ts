import { Component, Input, OnInit } from '@angular/core';
import { WalletService } from '../../services/wallet.service';
import { WeatherService } from '../../services/weather.service';
import { BettingService } from '../../services/betting.service';
import { WeatherData, BetOption, Bet } from '../../models/weather.model';

@Component({
  selector: 'app-betting-interface',
  templateUrl: './betting-interface.component.html',
  styleUrls: ['./betting-interface.component.scss']
})
export class BettingInterfaceComponent implements OnInit {
  @Input() betOptions: BetOption[] = [];
  @Input() weatherData!: WeatherData;

  selectedOption: BetOption | null = null;
  betAmount: number = 10;
  potentialPayout: number = 0;
  message: string = '';
  messageType: 'success' | 'error' | '' = '';

  constructor(
    public walletService: WalletService,
    private weatherService: WeatherService,
    private bettingService: BettingService
  ) {}

  ngOnInit(): void {}

  selectOption(option: BetOption): void {
    this.selectedOption = option;
    this.calculatePayout();
    this.clearMessage();
  }

  onAmountChange(): void {
    this.calculatePayout();
  }

  calculatePayout(): void {
    if (this.selectedOption && this.betAmount > 0) {
      this.potentialPayout = this.betAmount * this.selectedOption.odds;
    } else {
      this.potentialPayout = 0;
    }
  }

  placeBet(): void {
    if (!this.selectedOption) {
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
      const baselineTemp = 65; // Default baseline used in getBetOptions
      const bet: Bet = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        option: this.selectedOption,
        amount: this.betAmount,
        timestamp: new Date(),
        location: this.weatherData.location,
        targetDate: new Date(), // Current date for betting-interface (current weather bets)
        baselineTemp: baselineTemp,
        resolved: false
      };

      this.bettingService.placeBet(bet);
      
      setTimeout(() => {
        this.resolveBet(bet);
      }, 2000);

      this.showMessage(`Bet placed! Resolving in 2 seconds...`, 'success');
      this.selectedOption = null;
      this.betAmount = 10;
      this.potentialPayout = 0;
    } else {
      this.showMessage('Failed to place bet', 'error');
    }
  }

  resolveBet(bet: Bet): void {
    // Fetch actual current weather for today's bets
    this.weatherService.getWeatherData(bet.location).subscribe({
      next: (weatherData) => {
        const won = this.weatherService.resolveBet(bet.option, weatherData, bet.baselineTemp);
        const payout = won ? bet.amount * bet.option.odds : 0;
        
        this.bettingService.resolveBet(bet.id, won, payout);
        
        if (won) {
          this.walletService.add(payout);
          this.showMessage(`You won! Payout: $${payout.toFixed(2)}`, 'success');
        } else {
          this.showMessage(`You lost. Better luck next time!`, 'error');
        }
      },
      error: (error) => {
        console.error('Error fetching weather for bet resolution:', error);
        this.showMessage('Error resolving bet. Please try again later.', 'error');
      }
    });
  }

  showMessage(text: string, type: 'success' | 'error'): void {
    this.message = text;
    this.messageType = type;
    setTimeout(() => {
      this.clearMessage();
    }, 5000);
  }

  clearMessage(): void {
    this.message = '';
    this.messageType = '';
  }
}

