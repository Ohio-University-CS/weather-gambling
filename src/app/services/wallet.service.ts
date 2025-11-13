import { Injectable } from '@angular/core';
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

  constructor(private bettingService: BettingService, private preferencesService: PreferencesService) {
    const savedBalance = localStorage.getItem('walletBalance');
    if (savedBalance) {
      this.balanceSubject.next(parseFloat(savedBalance));
    }

    // attach aux services for use in reset
    this.setAuxServices(this.bettingService, this.preferencesService);
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

    // Clear stored bets and reset preferences if available via DI.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const betting = (this as any).bettingService as BettingService | undefined;
      const prefs = (this as any).preferencesService as PreferencesService | undefined;
      if (betting && typeof betting.clearBets === 'function') {
        betting.clearBets();
      }
      if (prefs && typeof prefs.resetPreferences === 'function') {
        prefs.resetPreferences();
      }
    } catch (e) {
      // Swallow errors to avoid breaking UI reset behavior
      console.error('Error clearing auxiliary services during wallet reset', e);
    }
  }

  // Optional helper for DI-based clearing from constructor
  private setAuxServices(bettingService: BettingService, preferencesService: PreferencesService): void {
    // Attach services dynamically to avoid circular DI issues in some setups
    (this as any).bettingService = bettingService;
    (this as any).preferencesService = preferencesService;
  }
}

