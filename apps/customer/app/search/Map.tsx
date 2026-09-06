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
      <style>{`
        .modern-popup .leaflet-popup-content-wrapper {
          padding: 0;
          overflow: hidden;
          border-radius: 0.75rem;
        }
        .modern-popup .leaflet-popup-content {
          margin: 0;
          width: 200px !important;
        }
      `}</style>
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
            <Popup closeButton={false} className="modern-popup">
              <a href={`/locations/${loc.id}`} target="_blank" rel="noopener noreferrer" className="block relative w-full h-32 group">
                {loc.photos && loc.photos.length > 0 ? (
                  <img src={loc.photos[0]} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium text-xs">No Image</div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                {/* Text overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <h3 className="font-bold text-sm truncate drop-shadow-md">{loc.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs font-bold text-orange-400 drop-shadow-md">₹{loc.price_per_day}/day</p>
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-[10px] font-bold text-gray-200">{loc.avg_rating || 'New'}</span>
                    </div>
                  </div>
                </div>
              </a>
            </Popup>
          </Marker>
        ))}
        <MapBounds locations={locations} center={center} />
      </MapContainer>
    </div>
  );
}
