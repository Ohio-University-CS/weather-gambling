import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BettingService } from './betting.service';
import { PreferencesService } from './preferences.service';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private readonly INITIAL_BALANCE = 200;
  private balanceSubject = new BehaviorSubject<number>(this.INITIAL_BALANCE);
  public balance$: Observable<number> = this.balanceSubject.asObservable();
  private injector: Injector;

  constructor(injector: Injector) {
    this.injector = injector;
    const savedBalance = localStorage.getItem('walletBalance');
    if (savedBalance) {
      this.balanceSubject.next(parseFloat(savedBalance));
    }
  }

  getBalance(): number {
    return this.balanceSubject.value;
  }

  deduct(amount: number): boolean {
    const currentBalance = this.balanceSubject.value;
    if (currentBalance >= amount) {
      const newBalance = currentBalance - amount;
      this.balanceSubject.next(newBalance);
      localStorage.setItem('walletBalance', newBalance.toString());
      return true;
    }
    return false;
  }

  add(amount: number): void {
    const newBalance = this.balanceSubject.value + amount;
    this.balanceSubject.next(newBalance);
    localStorage.setItem('walletBalance', newBalance.toString());
  }

  reset(): void {
    // When user requests a reset, zero their balance and clear stored stats/preferences.
    this.balanceSubject.next(this.INITIAL_BALANCE);
    localStorage.setItem('walletBalance', this.INITIAL_BALANCE.toString());

    // Clear stored bets and reset preferences using lazy injection to avoid circular dependency
    try {
      const bettingService = this.injector.get(BettingService, null);
      const preferencesService = this.injector.get(PreferencesService, null);
      
      if (bettingService && typeof bettingService.clearBets === 'function') {
        bettingService.clearBets();
      }
      if (preferencesService && typeof preferencesService.resetPreferences === 'function') {
        preferencesService.resetPreferences();
      }
    } catch (e) {
      // Swallow errors to avoid breaking UI reset behavior
      console.error('Error clearing auxiliary services during wallet reset', e);
    }
  }
}

