'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapBounds({ locations, center }: { locations: any[], center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.latitude, loc.longitude]));
      map.flyToBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
    } else if (center) {
      map.flyTo(center, 12, { animate: true, duration: 1.5 });
    }
  }, [locations, center, map]);
  return null;
}

export default function SearchMap({ locations, center }: { locations: any[], center: [number, number] }) {
  return (
    <div className="w-full h-full sticky top-0">
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', zIndex: 10 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc) => (
          <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
            <Popup>
              <div className="text-center font-inter">
                <h3 className="font-bold text-gray-900">{loc.name}</h3>
                <p className="text-sm text-gray-600 mb-2">₹{loc.price_per_day}/day</p>
                <a href={`/locations/${loc.id}`} className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 block text-center">
                  View Details
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
        <MapBounds locations={locations} center={center} />
      </MapContainer>
    </div>
  );
}
