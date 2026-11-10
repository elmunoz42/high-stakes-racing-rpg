export interface RaceEntryResult {
  name: string;
  carName: string;
  isPlayer: boolean;
  position: number;
  timeMs: number;
}

export interface RaceResult {
  trackId: string;
  laps: number;
  position: number;
  timeMs: number;
  collisions: number;
  ledALap: boolean;
  topSpeedKmh: number;
  order: RaceEntryResult[];
}
