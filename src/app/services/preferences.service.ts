import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage.service';

export interface UserPreferences {
  location: string;
  lastUpdated?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  private readonly STORAGE_KEY = 'userPreferences';
  private readonly DEFAULT_LOCATION = 'Athens,OH,US';
  
  private preferencesSubject = new BehaviorSubject<UserPreferences>({
    location: this.DEFAULT_LOCATION
  });
  public preferences$: Observable<UserPreferences> = this.preferencesSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadPreferences();
  }

  private loadPreferences(): void {
    const saved = this.storageService.getItem<UserPreferences>(this.STORAGE_KEY);
    if (saved) {
      this.preferencesSubject.next({
        ...saved,
        lastUpdated: saved.lastUpdated ? new Date(saved.lastUpdated) : undefined
      });
    }
  }

  getPreferences(): UserPreferences {
    return this.preferencesSubject.value;
  }

  getLocation(): string {
    return this.preferencesSubject.value.location || this.DEFAULT_LOCATION;
  }

  setLocation(location: string): void {
    const current = this.preferencesSubject.value;
    const updated: UserPreferences = {
      ...current,
      location: location.trim() || this.DEFAULT_LOCATION,
      lastUpdated: new Date()
    };
    this.preferencesSubject.next(updated);
    this.storageService.setItem(this.STORAGE_KEY, updated);
  }

  resetPreferences(): void {
    const defaultPrefs: UserPreferences = {
      location: this.DEFAULT_LOCATION
    };
    this.preferencesSubject.next(defaultPrefs);
    this.storageService.setItem(this.STORAGE_KEY, defaultPrefs);
  }
}

