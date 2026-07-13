'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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
    <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-300 relative z-0">
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
        {position[0] !== 20.5937 && (
          <Marker position={position}></Marker>
        )}
      </MapContainer>
      <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur text-xs px-3 py-2 rounded-lg shadow-sm border border-gray-100 z-[400] pointer-events-none text-gray-700 font-medium">
        Click anywhere on the map to place your storefront pin.
      </div>
    </div>
  );
}
