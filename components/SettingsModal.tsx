import React from 'react';
import { X, Check, Play, Volume2 } from 'lucide-react';
import { ThemeColor, SoundType } from '../types';
import { alarmSystem } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
  currentSound: SoundType;
  setSound: (sound: SoundType) => void;
  accentColor: string;
}

const themes: { id: ThemeColor; name: string; colorClass: string }[] = [
  { id: 'slate', name: 'Slate', colorClass: 'bg-slate-500' },
  { id: 'zinc', name: 'Midnight', colorClass: 'bg-zinc-500' },
  { id: 'neutral', name: 'Paper', colorClass: 'bg-neutral-500' },
  { id: 'blue', name: 'Ocean', colorClass: 'bg-blue-600' },
  { id: 'rose', name: 'Sunset', colorClass: 'bg-rose-500' },
  { id: 'violet', name: 'Royal', colorClass: 'bg-violet-600' },
];

const sounds: { id: SoundType; name: string; desc: string }[] = [
  { id: 'classic', name: 'Classic Beep', desc: 'Standard sharp alarm' },
  { id: 'chime', name: 'Soft Chime', desc: 'Gentle wake up' },
  { id: 'urgent', name: 'Urgent Siren', desc: 'Loud rising alert' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  setTheme,
  currentSound,
  setSound,
  accentColor
}) => {
  if (!isOpen) return null;

  const handlePreviewSound = (sound: SoundType) => {
    alarmSystem.previewSound(sound);
  };

  // Base background based on theme for the modal to match app feel
  // using a hardcoded dark backdrop for contrast
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-gray-900 border border-gray-800`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Theme Section */}
          <div className="space-y-3">
            <h3 className="text-sm uppercase tracking-wider text-gray-400 font-semibold">Theme Color</h3>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className={`relative h-12 rounded-xl flex items-center justify-center transition-all ${theme.colorClass} ${
                    currentTheme === theme.id ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Select ${theme.name} theme`}
                >
                  <span className="text-white font-medium text-xs drop-shadow-md">{theme.name}</span>
                  {currentTheme === theme.id && (
                    <div className="absolute top-1 right-1 bg-white text-black rounded-full p-0.5">
                      <Check size={8} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Section */}
          <div className="space-y-3">
            <h3 className="text-sm uppercase tracking-wider text-gray-400 font-semibold">Alarm Sound</h3>
            <div className="space-y-2">
              {sounds.map((sound) => (
                <div 
                  key={sound.id}
                  onClick={() => setSound(sound.id)}
                  className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${
                    currentSound === sound.id 
                      ? `bg-${accentColor}-900/30 border-${accentColor}-500/50` 
                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  <div className={`p-2 rounded-full mr-3 ${
                    currentSound === sound.id ? `text-${accentColor}-400 bg-${accentColor}-400/10` : 'text-gray-400 bg-gray-700'
                  }`}>
                    <Volume2 size={18} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${currentSound === sound.id ? 'text-white' : 'text-gray-300'}`}>
                      {sound.name}
                    </p>
                    <p className="text-xs text-gray-500">{sound.desc}</p>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewSound(sound.id);
                    }}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Preview Sound"
                  >
                    <Play size={16} fill="currentColor" />
                  </button>
                  
                  {currentSound === sound.id && (
                    <div className={`ml-2 text-${accentColor}-400`}>
                      <Check size={18} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
        
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
           <button 
             onClick={onClose}
             className={`w-full py-3 rounded-xl font-bold bg-${accentColor}-600 text-white shadow-lg hover:opacity-90 transition-opacity`}
           >
             Done
           </button>
        </div>
      </div>
    </div>
  );
};
