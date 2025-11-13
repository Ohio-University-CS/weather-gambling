import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Bet } from '../models/weather.model';
import { WeatherService } from './weather.service';
import { WalletService } from './wallet.service';

@Injectable({
  providedIn: 'root'
})
export class BettingService {
  private betsSubject = new BehaviorSubject<Bet[]>([]);
  public bets$: Observable<Bet[]> = this.betsSubject.asObservable();
  private resolvingBets = new Set<string>(); // Track bets currently being resolved to prevent duplicates

  constructor(
    private weatherService: WeatherService,
    private walletService: WalletService
  ) {
    const savedBets = localStorage.getItem('bets');
    if (savedBets) {
      try {
        const bets = JSON.parse(savedBets).map((bet: any) => ({
          ...bet,
          timestamp: new Date(bet.timestamp),
          targetDate: bet.targetDate ? new Date(bet.targetDate) : new Date(bet.timestamp),
          baselineTemp: bet.baselineTemp || 65
        }));
        this.betsSubject.next(bets);
      } catch (e) {
        console.error('Error loading bets from localStorage', e);
      }
    }
  }

  placeBet(bet: Bet): void {
    const currentBets = this.betsSubject.value;
    const newBets = [...currentBets, bet];
    this.betsSubject.next(newBets);
    localStorage.setItem('bets', JSON.stringify(newBets));
  }

  resolveBet(betId: string, won: boolean, payout: number): void {
    const currentBets = this.betsSubject.value;
    const updatedBets = currentBets.map(bet => 
      bet.id === betId 
        ? { ...bet, resolved: true, won, payout }
        : bet
    );
    this.betsSubject.next(updatedBets);
    localStorage.setItem('bets', JSON.stringify(updatedBets));
  }

  getBets(): Bet[] {
    return this.betsSubject.value;
  }

  getActiveBets(): Bet[] {
    return this.betsSubject.value.filter(bet => !bet.resolved);
  }

  clearBets(): void {
    this.betsSubject.next([]);
    localStorage.removeItem('bets');
  }

  checkAndResolvePendingBets(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const bets = this.getBets();
    const unresolvedBets = bets.filter(bet => !bet.resolved && !this.resolvingBets.has(bet.id));
    
    unresolvedBets.forEach(bet => {
      const targetDate = new Date(bet.targetDate);
      targetDate.setHours(0, 0, 0, 0);
      
      // If target date is today or in the past, resolve the bet
      if (targetDate.getTime() <= today.getTime()) {
        this.resolvePendingBet(bet);
      }
    });
  }

  private resolvePendingBet(bet: Bet): void {
    // Mark as being resolved to prevent duplicate attempts
    this.resolvingBets.add(bet.id);
    
    // Fetch actual current weather for the bet location
    this.weatherService.getWeatherData(bet.location).subscribe({
      next: (weatherData) => {
        const won = this.weatherService.resolveBet(bet.option, weatherData, bet.baselineTemp);
        const payout = won ? bet.amount * bet.option.odds : 0;
        
        this.resolveBet(bet.id, won, payout);
        
        if (won) {
          this.walletService.add(payout);
        }
        
        // Remove from resolving set
        this.resolvingBets.delete(bet.id);
      },
      error: (error) => {
        console.error('Error fetching weather for bet resolution:', error);
        // Remove from resolving set so it can be retried on next load
        this.resolvingBets.delete(bet.id);
        // Don't mark as resolved if we can't fetch weather - will retry on next load
      }
    });
  }
}

