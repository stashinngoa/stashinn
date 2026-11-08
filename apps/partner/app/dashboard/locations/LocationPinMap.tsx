'use client';

import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// MapContainer only reads `center` once; move the view when the position changes (e.g. after a PIN lookup)
function Recenter({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, Math.max(map.getZoom(), zoom));
  }, [map, position, zoom]);
  return null;
}

export default function LocationPinMap({ 
  initialLat, 
  initialLng, 
  onChange 
}: { 
  initialLat: number, 
  initialLng: number, 
  onChange: (lat: number, lng: number) => void 
}) {
  const [position, setPosition] = useState<[number, number]>([initialLat || 20.5937, initialLng || 78.9629]); // Default to India if none provided

  // Keep internal state synced if props change initially (e.g. edit mode)
  useEffect(() => {
    if (initialLat && initialLng) {
      setPosition([initialLat, initialLng]);
    }
  }, [initialLat, initialLng]);

  const handleLocationSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onChange(lat, lng);
  };

  return (
    <div className="w-full h-72 overflow-hidden relative z-0">
      <MapContainer 
        center={position} 
        zoom={initialLat ? 15 : 5} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onLocationSelect={handleLocationSelect} />
        {initialLat ? <Recenter position={position} zoom={15} /> : null}
        {position[0] !== 20.5937 && (
          <Marker position={position}></Marker>
        )}
      </MapContainer>
      <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur text-xs px-3 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 z-[400] pointer-events-none text-gray-700 dark:text-gray-300 font-medium">
        Click the map at your entrance to place the pin.
      </div>
    </div>
  );
}
