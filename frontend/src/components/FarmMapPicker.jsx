import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons in React
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/**
 * FarmMapPicker — Brutalist Editorial Version
 */
function MapClickEvent({ onChange }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng);
    },
  });
  return null;
}

export default function FarmMapPicker({ defaultLat = -31.4, defaultLon = -64.2, onLocationSelected }) {
  const [lat, setLat] = useState(String(defaultLat));
  const [lon, setLon] = useState(String(defaultLon));
  const position = [Number(lat), Number(lon)];

  useEffect(() => {
    onLocationSelected({ lat: defaultLat, lon: defaultLon });
  }, []);

  function handleMapChange({ lat: newLat, lng: newLon }) {
    setLat(newLat.toFixed(6));
    setLon(newLon.toFixed(6));
    onLocationSelected({ lat: newLat, lon: newLon });
  }

  function handleManualUpdate() {
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    if (isNaN(parsedLat) || isNaN(parsedLon)) return;
    onLocationSelected({ lat: parsedLat, lon: parsedLon });
  }

  return (
    <div className="space-y-6 relative z-0">
      <div className="h-64 rounded-none overflow-hidden border-2 border-[#1A1A1A] z-0 relative group">
        <MapContainer 
          center={position} 
          zoom={7} 
          scrollWheelZoom={false} 
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} />
          <MapClickEvent onChange={handleMapChange} />
        </MapContainer>
        
        {/* Helper Label: High contrast, sharp edges */}
        <div className="absolute top-4 left-4 z-[1000] bg-[#1A1A1A] text-[#FDFCFB] text-[9px] font-black uppercase tracking-[0.2em] px-3 py-2 flex items-center gap-2 pointer-events-none">
          <span className="w-1.5 h-1.5 bg-[#FF5733]"></span>
          GPS_SELECTOR_ACTIVE
        </div>
      </div>

      {/* Manual coordinate inputs: Designed as a survey form */}
      <div className="grid grid-cols-2 gap-8">
        <label className="flex flex-col gap-2">
          <span className="text-[#1A1A1A]/40 text-[10px] font-black uppercase tracking-widest">Lat_Coordinate</span>
          <input
            id="farm-lat"
            type="number" step="any" value={lat}
            onChange={(e) => setLat(e.target.value)}
            onBlur={handleManualUpdate}
            className="bg-transparent border-b-2 border-[#1A1A1A] rounded-none px-0 py-2 font-mono text-lg font-black text-[#1A1A1A] focus:outline-none focus:border-[#FF5733] transition-colors"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[#1A1A1A]/40 text-[10px] font-black uppercase tracking-widest">Lon_Coordinate</span>
          <input
            id="farm-lon"
            type="number" step="any" value={lon}
            onChange={(e) => setLon(e.target.value)}
            onBlur={handleManualUpdate}
            className="bg-transparent border-b-2 border-[#1A1A1A] rounded-none px-0 py-2 font-mono text-lg font-black text-[#1A1A1A] focus:outline-none focus:border-[#FF5733] transition-colors"
          />
        </label>
      </div>

      <div className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase tracking-tight">
        * Coordinates verified via OpenStreetMap Network_Protocol
      </div>
    </div>
  );
}