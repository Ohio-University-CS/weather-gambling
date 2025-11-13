import { Component, OnInit } from '@angular/core';
import { BettingService } from './services/betting.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Weather Gambling';

  constructor(private bettingService: BettingService) {}

  ngOnInit(): void {
    // Check and resolve any pending bets whose target date has passed
    // This ensures we don't miss resolving bets when the app loads
    this.bettingService.checkAndResolvePendingBets();
  }
}

