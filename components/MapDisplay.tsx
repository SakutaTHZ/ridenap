import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates } from '../types';
import { calculateDistance } from '../utils/geo';

// Fix for default Leaflet markers
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapDisplayProps {
  currentLocation: Coordinates | null;
  targetLocation: Coordinates | null;
  routeCoords: Coordinates[];
  alarmRadius: number; // in meters
  onSetTarget: (coords: Coordinates) => void;
  viewCenter: Coordinates | null; // New prop to control map center
}

// Component to handle map clicks
const MapEvents = ({ onSetTarget }: { onSetTarget: (coords: Coordinates) => void }) => {
  useMapEvents({
    click(e) {
      onSetTarget({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

// Component to keep view centered based on prop
const MapUpdater = ({ center }: { center: Coordinates | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      // Use flyTo for smooth scrolling animation
      map.flyTo([center.lat, center.lng], map.getZoom(), { 
        duration: 1.5,
        easeLinearity: 0.25 
      });
    }
  }, [center, map]);
  return null;
};

export const MapDisplay: React.FC<MapDisplayProps> = ({ 
  currentLocation, 
  targetLocation, 
  routeCoords,
  alarmRadius, 
  onSetTarget,
  viewCenter
}) => {
  
  // Default center (e.g., somewhere neutral or based on IP if possible, default to 0,0)
  const defaultCenter = { lat: 40.7128, lng: -74.0060 }; // NYC default
  const initialCenter = currentLocation || defaultCenter;

  // Calculate dynamic route color based on distance
  const routeColor = useMemo(() => {
    if (!currentLocation || !targetLocation) return '#3b82f6'; // Default Blue

    const dist = calculateDistance(currentLocation, targetLocation);
    
    // Color Logic:
    // < 2x Alarm Radius: RED (Urgent)
    // < 10x Alarm Radius: ORANGE (Approaching)
    // > 10x Alarm Radius: BLUE (Safe/Sleeping)
    
    if (dist <= alarmRadius * 2) {
      return '#ef4444'; // Red
    } else if (dist <= alarmRadius * 10) {
      return '#f97316'; // Orange
    } else {
      return '#3b82f6'; // Blue
    }
  }, [currentLocation, targetLocation, alarmRadius]);

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={[initialCenter.lat, initialCenter.lng]} 
        zoom={13} 
        minZoom={3} // Prevent zooming out too far
        maxBounds={[[-90, -180], [90, 180]]} // Restrict view to one world
        maxBoundsViscosity={1.0} // Sticky bounds
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true} // Prevent tiles from repeating horizontally
        />

        <MapEvents onSetTarget={onSetTarget} />
        
        {/* Handle programmatic panning */}
        <MapUpdater center={viewCenter} />
        
        {/* Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline 
            positions={routeCoords.map(c => [c.lat, c.lng])} 
            pathOptions={{ 
              color: routeColor, 
              weight: 6, 
              opacity: 0.8, 
              lineCap: 'round',
              lineJoin: 'round'
            }} 
          />
        )}
        
        {/* User's Current Location Marker (Blue) */}
        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={
              L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
              })
          } />
        )}

        {/* Target Destination Marker (Red) */}
        {targetLocation && (
          <>
            <Marker position={[targetLocation.lat, targetLocation.lng]} />
            <Circle 
              center={[targetLocation.lat, targetLocation.lng]}
              radius={alarmRadius}
              pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }}
            />
          </>
        )}

      </MapContainer>
    </div>
  );
};