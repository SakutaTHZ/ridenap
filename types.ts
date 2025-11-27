export interface Coordinates {
  lat: number;
  lng: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  TRACKING = 'TRACKING',
  ALARM = 'ALARM',
}

export interface LocationSearchResult {
  name: string;
  coords: Coordinates;
  address?: string;
  sourceUrl?: string;
}

export interface SearchState {
  isLoading: boolean;
  error: string | null;
  results: LocationSearchResult[]; 
}

export type ThemeColor = 'slate' | 'zinc' | 'neutral' | 'blue' | 'rose' | 'violet';
export type SoundType = 'classic' | 'chime' | 'urgent';
