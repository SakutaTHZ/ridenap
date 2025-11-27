import React from 'react';
import { BellOff, MapPin } from 'lucide-react';

interface AlarmOverlayProps {
  onDismiss: () => void;
  distance: number;
}

export const AlarmOverlay: React.FC<AlarmOverlayProps> = ({ onDismiss, distance }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-urgent-pulse text-white p-6 animate-bounce-in bg-red-600/90 backdrop-blur-sm">
      <div className="animate-bounce mb-8">
        <MapPin size={80} className="text-white drop-shadow-lg" />
      </div>
      
      <h1 className="text-5xl font-black mb-4 text-center uppercase tracking-wider drop-shadow-md animate-slide-down">
        Wake Up!
      </h1>
      
      <p className="text-xl mb-12 text-center font-medium opacity-90 animate-fade-in delay-200">
        You are within {Math.round(distance)}m of your destination.
      </p>

      <button
        onClick={onDismiss}
        className="group relative flex items-center justify-center px-12 py-6 bg-white text-red-600 rounded-full font-bold text-2xl shadow-2xl transition-transform active:scale-95 hover:bg-gray-100 animate-slide-up delay-300"
      >
        <BellOff className="mr-3 group-hover:rotate-12 transition-transform" size={32} />
        STOP ALARM
      </button>
    </div>
  );
};