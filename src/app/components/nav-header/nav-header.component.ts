import { Component } from '@angular/core';
import { WalletService } from '../../services/wallet.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-nav-header',
  templateUrl: './nav-header.component.html',
  styleUrls: ['./nav-header.component.scss']
})
export class NavHeaderComponent {
  balance$: Observable<number>;

  constructor(public walletService: WalletService) {
    this.balance$ = this.walletService.balance$;
  }

  resetWallet(): void {
    if (confirm('Are you sure you want to reset your wallet to $200 and clear all stats?')) {
      this.walletService.reset();
    }
  }
}

