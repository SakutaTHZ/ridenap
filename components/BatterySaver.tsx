import React, { useState, useEffect } from 'react';
import { Moon, Unlock } from 'lucide-react';

interface BatterySaverProps {
  distance: number | null;
  onExit: () => void;
}

export const BatterySaver: React.FC<BatterySaverProps> = ({ distance, onExit }) => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Move text periodically to prevent OLED burn-in
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setPosition({
        x: 20 + Math.random() * 60, // Keep within 20-80% of screen
        y: 20 + Math.random() * 60
      });
    }, 60000); // Every minute

    const timeInterval = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    return () => {
      clearInterval(moveInterval);
      clearInterval(timeInterval);
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black text-slate-500 cursor-pointer flex flex-col items-center justify-center select-none"
      onClick={onExit}
    >
      <div 
        className="absolute flex flex-col items-center transition-all duration-1000 ease-in-out"
        style={{ left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)' }}
      >
        <Moon className="mb-4 opacity-50" size={48} />
        <div className="text-6xl font-black text-slate-700 tracking-tighter mb-2">
          {time}
        </div>
        {distance !== null && (
          <div className="text-xl font-mono text-slate-600">
            {(distance / 1000).toFixed(2)} km remaining
          </div>
        )}
        <div className="mt-8 flex items-center text-sm uppercase tracking-widest opacity-30 animate-pulse">
          <Unlock size={16} className="mr-2" />
          Tap to Wake
        </div>
      </div>
      
      {/* Helper text at very bottom */}
      <div className="absolute bottom-10 text-xs text-slate-800 text-center max-w-xs px-4">
        Screen is black to save battery. <br/>
        App is running. Do not lock your phone.
      </div>
    </div>
  );
};
