export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  description: string;
}

export interface BetOption {
  id: string;
  label: string;
  odds: number;
  description: string;
}

export interface Bet {
  id: string;
  option: BetOption;
  amount: number;
  timestamp: Date;
  location: string;
  targetDate: Date;
  baselineTemp: number;
  resolved: boolean;
  won?: boolean;
  payout?: number;
}

