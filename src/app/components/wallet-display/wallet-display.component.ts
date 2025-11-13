import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../services/wallet.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-wallet-display',
  templateUrl: './wallet-display.component.html',
  styleUrls: ['./wallet-display.component.scss']
})
export class WalletDisplayComponent implements OnInit {
  balance$: Observable<number>;

  constructor(private walletService: WalletService) {
    this.balance$ = this.walletService.balance$;
  }

  ngOnInit(): void {}

  resetWallet(): void {
    if (confirm('Are you sure you want to reset your wallet to $200 and clear all stats?')) {
      this.walletService.reset();
    }
  }
}

