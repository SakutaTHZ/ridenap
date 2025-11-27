import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Navigation, Search, Bell, Settings, Loader2, BellOff, Battery, ShieldAlert, AlertTriangle, X, ExternalLink, Locate, Flag } from 'lucide-react';
import { Coordinates, AppStatus, SearchState, LocationSearchResult, ThemeColor, SoundType } from './types';
import { calculateDistance, getCurrentPosition } from './utils/geo';
import { MapDisplay } from './components/MapDisplay';
import { AlarmOverlay } from './components/AlarmOverlay';
import { BatterySaver } from './components/BatterySaver';
import { SettingsModal } from './components/SettingsModal';
import { alarmSystem } from './utils/audio';
// Replaced Gemini with OpenStreetMap Geocoding
import { searchLocations } from './services/geocoding';
import { getRoute } from './services/routing';

const WAKE_LOCK_TYPE = 'screen';

// Map themes to a specific accent color name for buttons/highlights
const getAccentColor = (theme: ThemeColor): string => {
  switch (theme) {
    case 'slate': return 'blue';
    case 'zinc': return 'indigo';
    case 'neutral': return 'orange';
    case 'blue': return 'cyan';
    case 'rose': return 'pink';
    case 'violet': return 'fuchsia';
    default: return 'blue';
  }
};

export default function App() {
  // Preferences State
  const [theme, setTheme] = useState<ThemeColor>('slate');
  const [soundType, setSoundType] = useState<SoundType>('classic');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // App State
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [targetLocation, setTargetLocation] = useState<Coordinates | null>(null);
  const [routeCoords, setRouteCoords] = useState<Coordinates[]>([]);
  const [alarmRadius, setAlarmRadius] = useState<number>(500); // meters
  const [mapCenter, setMapCenter] = useState<Coordinates | null>(null); 
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({ isLoading: false, error: null, results: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isBatterySaver, setIsBatterySaver] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);

  // Refs
  const watchId = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);

  // Load Preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('napride-theme') as ThemeColor;
    const savedSound = localStorage.getItem('napride-sound') as SoundType;
    if (savedTheme) setTheme(savedTheme);
    if (savedSound) {
      setSoundType(savedSound);
      alarmSystem.setSoundType(savedSound);
    }
  }, []);

  // Save Preferences
  const handleSetTheme = (newTheme: ThemeColor) => {
    setTheme(newTheme);
    localStorage.setItem('napride-theme', newTheme);
  };

  const handleSetSound = (newSound: SoundType) => {
    setSoundType(newSound);
    alarmSystem.setSoundType(newSound);
    localStorage.setItem('napride-sound', newSound);
  };

  // Initialize: Get current location
  useEffect(() => {
    getCurrentPosition()
      .then((pos) => {
        setCurrentLocation(pos);
        if (!mapCenter) setMapCenter(pos); 
      })
      .catch((err) => console.error("Initial location error:", err));
  }, []);

  // Update Route when target is set
  useEffect(() => {
    const fetchRoute = async () => {
      if (currentLocation && targetLocation && routeCoords.length === 0) {
        const coords = await getRoute(currentLocation, targetLocation);
        setRouteCoords(coords);
      }
    };
    fetchRoute();
  }, [currentLocation, targetLocation, routeCoords.length]);

  // Debounced Autocomplete Search
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
    }

    if (searchQuery.trim().length < 3) {
      setSearchState({ isLoading: false, error: null, results: [] });
      setShowSuggestions(false);
      return;
    }

    if (status !== AppStatus.IDLE) return;

    debounceTimeoutRef.current = window.setTimeout(async () => {
      setSearchState(prev => ({ ...prev, isLoading: true, error: null }));
      setShowSuggestions(true);
      
      try {
        // Use the new OpenStreetMap geocoding service
        const results = await searchLocations(searchQuery);
        setSearchState({ isLoading: false, error: null, results });
      } catch (err) {
        setSearchState({ isLoading: false, error: "Error fetching suggestions", results: [] });
      }
    }, 1000); 

    return () => {
      if (debounceTimeoutRef.current) window.clearTimeout(debounceTimeoutRef.current);
    };
  }, [searchQuery, status]);


  const showToast = (message: string, type: 'error' | 'info' = 'error') => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  const handleUserInteraction = () => {
    alarmSystem.prime();
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await navigator.wakeLock.request(WAKE_LOCK_TYPE);
        setWakeLock(lock);
        lock.addEventListener('release', () => {
          setWakeLock(null);
        });
      }
    } catch (err) {
      console.error(`${WAKE_LOCK_TYPE} Wake Lock failed:`, err);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === AppStatus.TRACKING && !wakeLock) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, wakeLock]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
    }
  }, [wakeLock]);

  const startTracking = async () => {
    if (!targetLocation) return;
    
    if (currentLocation) {
      const dist = calculateDistance(currentLocation, targetLocation);
      if (dist <= alarmRadius) {
        showToast("You are already within the alarm radius! Move further away to start.", 'error');
        return;
      }
      // Set initial distance immediately to ensure UI appears
      setDistanceToTarget(dist);
    }

    handleUserInteraction();
    await requestWakeLock();
    setStatus(AppStatus.TRACKING);
    if (currentLocation) setMapCenter(currentLocation);
    setShowSuggestions(false); 
    
    if (navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const newCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newCoords);
          setMapCenter(newCoords);

          const dist = calculateDistance(newCoords, targetLocation);
          setDistanceToTarget(dist);

          if (dist <= alarmRadius) {
            triggerAlarm();
          }
        },
        (error) => console.error("Tracking error:", error),
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        }
      );
    }
  };

  const stopTracking = useCallback(() => {
    setStatus(AppStatus.IDLE);
    setDistanceToTarget(null);
    setIsBatterySaver(false);
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    releaseWakeLock();
  }, [releaseWakeLock]);

  const triggerAlarm = () => {
    setIsBatterySaver(false);
    setStatus(AppStatus.ALARM);
    alarmSystem.startAlarm();
    if (navigator.vibrate) {
      navigator.vibrate([1000, 500, 1000]);
    }
  };

  const dismissAlarm = () => {
    alarmSystem.stopAlarm();
    stopTracking();
  };

  const handleSelectLocation = (location: LocationSearchResult) => {
    if (currentLocation) {
      const dist = calculateDistance(currentLocation, location.coords);
      if (dist <= alarmRadius) {
        showToast(`Too close (${Math.round(dist)}m). You are already inside the alarm radius.`, 'error');
        return;
      }
    }

    setTargetLocation(location.coords);
    setMapCenter(location.coords);
    setSearchQuery(location.name);
    setRouteCoords([]); 
    setShowSuggestions(false); 
  };

  const handleSetTarget = (coords: Coordinates) => {
    if (status === AppStatus.IDLE) {
      if (currentLocation) {
        const dist = calculateDistance(currentLocation, coords);
        if (dist <= alarmRadius) {
          showToast(`Too close! You cannot set a target within your ${alarmRadius}m alarm radius.`, 'error');
          return;
        }
      }

      setTargetLocation(coords);
      setRouteCoords([]); 
      setShowSuggestions(false);
    }
  };

  const handleRecenter = () => {
    if (currentLocation) {
      // Force new object reference to trigger useEffect in MapDisplay
      setMapCenter({ ...currentLocation });
    } else {
      getCurrentPosition().then(pos => {
        setCurrentLocation(pos);
        setMapCenter(pos);
      }).catch(e => showToast("Could not get location", "error"));
    }
  };

  const handleGoToTarget = () => {
    if (targetLocation) {
      // Force new object reference to trigger useEffect in MapDisplay
      setMapCenter({ ...targetLocation });
    }
  };

  // Dynamic Theme Variables
  const accent = getAccentColor(theme);
  // Construct dynamic classes for background/text based on selected theme
  const bgMain = `bg-${theme}-900`;
  const textMain = `text-${theme}-100`;
  
  // Glassmorphism Styles
  const glassInput = `bg-${theme}-900/40 backdrop-blur-md border border-white/10 text-white placeholder-slate-300 focus:bg-${theme}-900/60 focus:ring-2 focus:ring-${accent}-500/50 focus:border-${accent}-500/50 transition-all shadow-xl`;
  const glassPanel = `bg-${theme}-900/80 backdrop-blur-xl border-t border-white/10`;
  const glassButton = `bg-${theme}-900/60 backdrop-blur-md border border-white/20 text-white shadow-xl hover:bg-${accent}-600/80 hover:border-${accent}-400/50 hover:shadow-${accent}-500/20 transition-all active:scale-95`;
  const gradientTop = `from-${theme}-900/95 via-${theme}-900/80`;

  return (
    <div className={`h-screen w-full flex flex-col ${bgMain} ${textMain} overflow-hidden font-sans relative transition-colors duration-500`}>
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        setTheme={handleSetTheme}
        currentSound={soundType}
        setSound={handleSetSound}
        accentColor={accent}
      />

      {isBatterySaver && (
        <BatterySaver distance={distanceToTarget} onExit={() => setIsBatterySaver(false)} />
      )}

      {status === AppStatus.ALARM && distanceToTarget !== null && (
        <AlarmOverlay onDismiss={dismissAlarm} distance={distanceToTarget} />
      )}

      {toast && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
          <div className={`flex items-center p-4 rounded-xl shadow-2xl border backdrop-blur-md pointer-events-auto ${
            toast.type === 'error' 
              ? 'bg-red-900/90 border-red-500/50 text-red-100' 
              : `bg-${accent}-900/90 border-${accent}-500/50 text-${accent}-100`
          }`}>
            <AlertTriangle className="shrink-0 mr-3" size={24} />
            <p className="text-sm font-medium pr-2">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className={`absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b ${gradientTop} to-transparent pointer-events-none pb-12 animate-slide-down`}>
        <div className="pointer-events-auto max-w-md mx-auto w-full space-y-3 relative">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <h1 className={`text-xl font-bold flex items-center text-${accent}-400 drop-shadow-sm`}>
              <img src="/icon.svg" className="w-8 h-8 mr-2 rounded-lg shadow-sm" alt="Logo" />
              NapRide
            </h1>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${
                status === AppStatus.TRACKING ? 'bg-green-500/20 text-green-400 border border-green-500/50 animate-pulse' : 'bg-white/10 text-slate-400'
              }`}>
                {status === AppStatus.TRACKING ? 'Tracking Active' : 'Setup Mode'}
              </div>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className={`p-2 rounded-full ${glassButton} text-slate-200 hover:text-white transition-colors`}
                aria-label="Settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Search Bar - Staggered Animation */}
          {status === AppStatus.IDLE && (
            <div className="relative animate-fade-in delay-200 opacity-0" style={{ animationFillMode: 'forwards' }}>
              <div className="relative z-30">
                <input 
                  type="text" 
                  placeholder="Search destination..." 
                  className={`w-full ${glassInput} rounded-xl py-3 pl-10 pr-10 text-sm focus:outline-none`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length === 0) setShowSuggestions(false);
                  }}
                  onFocus={() => {
                     if (searchState.results.length > 0) setShowSuggestions(true);
                  }}
                />
                <Search className="absolute left-3 top-3.5 text-slate-300" size={18} />
                
                {searchState.isLoading ? (
                  <div className="absolute right-3 top-3.5">
                    <Loader2 className={`animate-spin text-${accent}-400`} size={18} />
                  </div>
                ) : searchQuery.length > 0 && (
                   <button 
                     onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                     className="absolute right-3 top-3.5 text-slate-400 hover:text-white"
                   >
                     <X size={18} />
                   </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className={`absolute top-full left-0 right-0 mt-2 bg-${theme}-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-20 animate-in fade-in slide-in-from-top-2`}>
                  {searchState.results.length > 0 ? (
                    <ul>
                      {searchState.results.map((result, index) => (
                        <li key={index}>
                          <button
                            onClick={() => handleSelectLocation(result)}
                            className={`w-full text-left px-4 py-3 hover:bg-${accent}-600/30 transition-colors border-b border-white/5 last:border-0`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-semibold text-white">{result.name}</p>
                                <p className="text-xs text-slate-400 truncate">{result.address}</p>
                              </div>
                              {result.sourceUrl && <ExternalLink size={12} className="text-slate-500 mt-1" />}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    !searchState.isLoading && searchQuery.length >= 3 && (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        No locations found
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
          
          {searchState.error && (
            <div className="bg-red-900/40 border border-red-500/30 backdrop-blur-sm p-3 rounded-lg text-xs text-red-200 flex items-center animate-in fade-in zoom-in-95">
              <AlertTriangle size={14} className="mr-2 shrink-0" />
              {searchState.error}
            </div>
          )}

          {status === AppStatus.TRACKING && !isBatterySaver && (
            <div className="bg-amber-500/10 border border-amber-500/30 backdrop-blur-sm p-3 rounded-lg flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
              <ShieldAlert className="text-amber-500 shrink-0" size={20} />
              <p className="text-xs text-amber-200 leading-relaxed">
                <span className="font-bold">Important:</span> Do not lock your phone screen. Use "Battery Saver" below.
              </p>
            </div>
          )}

        </div>
      </div>

      <div className="flex-grow relative z-0 animate-zoom-in delay-100 opacity-0" style={{ animationFillMode: 'forwards' }}>
        <MapDisplay 
          currentLocation={currentLocation}
          targetLocation={targetLocation}
          routeCoords={routeCoords}
          alarmRadius={alarmRadius}
          onSetTarget={handleSetTarget}
          viewCenter={mapCenter}
        />
        
        {/* Map Control Buttons - High Z-index to float above map */}
        {/* Changed from bottom-24 to bottom-6 to restore ergonomic position near bottom sheet */}
        <div className="absolute bottom-6 right-4 z-[1000] flex flex-col space-y-3 pointer-events-auto">
          {targetLocation && (
            <button
              onClick={handleGoToTarget}
              className={`p-3 rounded-full ${glassButton} animate-in zoom-in slide-in-from-bottom-4`}
              title="Go to Destination"
            >
              <Flag size={20} fill="currentColor" className="opacity-90" />
            </button>
          )}
          <button
            onClick={handleRecenter}
            className={`p-3 rounded-full ${glassButton} animate-in zoom-in slide-in-from-bottom-2`}
            title="My Location"
          >
            <Locate size={20} className="opacity-90" />
          </button>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className={`${glassPanel} rounded-t-3xl p-4 pb-8 z-30 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] transition-colors animate-slide-up delay-300 opacity-0`} style={{ animationFillMode: 'forwards' }}>
        <div className="max-w-md mx-auto w-full space-y-4">
          
          {status === AppStatus.TRACKING && (
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Distance to Target</p>
                  <p className="text-3xl font-mono font-bold text-white drop-shadow-md">
                    {distanceToTarget !== null ? (distanceToTarget / 1000).toFixed(2) : <span className="text-lg animate-pulse">Calculating...</span>} 
                    {distanceToTarget !== null && <span className="text-lg text-slate-400">km</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Wake up at</p>
                  <p className={`text-xl font-mono text-${accent}-400`}><span className="text-white font-bold">{alarmRadius}</span>m</p>
                </div>
              </div>

              <button
                onClick={() => setIsBatterySaver(true)}
                className={`w-full py-3 rounded-xl ${glassInput} hover:bg-${theme}-800/60 flex items-center justify-center space-x-2 transition-colors`}
              >
                <Battery size={20} className="text-emerald-400" />
                <span>Enter Battery Saver (Black Screen)</span>
              </button>
            </div>
          )}

          {status === AppStatus.IDLE && (
            <div className="space-y-2">
               <div className="flex justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                  <span>Wake Up Radius</span>
                  <span className={`text-${accent}-400`}>{alarmRadius} meters</span>
               </div>
               <input 
                  type="range" 
                  min="100" 
                  max="2000" 
                  step="100"
                  value={alarmRadius}
                  onChange={(e) => setAlarmRadius(Number(e.target.value))}
                  className={`w-full h-2 bg-${theme}-700/50 rounded-lg appearance-none cursor-pointer accent-${accent}-500 backdrop-blur-sm`}
               />
               <p className="text-[10px] text-slate-500 text-center">Drag slider to adjust when the alarm sounds</p>
            </div>
          )}

          {status === AppStatus.IDLE ? (
            <button
              onClick={startTracking}
              disabled={!targetLocation}
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all transform active:scale-98 flex items-center justify-center space-x-2 backdrop-blur-sm border border-white/10
                ${targetLocation 
                  ? `bg-${accent}-600/90 hover:bg-${accent}-500/90 text-white shadow-${accent}-900/40` 
                  : `bg-${theme}-800/40 text-slate-500 cursor-not-allowed`}`}
            >
              <Bell size={24} className={targetLocation ? 'animate-pulse' : ''} />
              <span>{targetLocation ? 'Start Sleeping' : 'Set Destination on Map'}</span>
            </button>
          ) : (
            <button
              onClick={stopTracking}
              className="w-full py-4 rounded-2xl font-bold text-lg bg-red-900/40 text-red-200 border border-red-500/30 hover:bg-red-900/60 transition-all active:scale-98 flex items-center justify-center space-x-2 backdrop-blur-md"
            >
              <BellOff size={24} />
              <span>Cancel Alarm</span>
            </button>
          )}

        </div>
      </div>
    </div>
  );
}