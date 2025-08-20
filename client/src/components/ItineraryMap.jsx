import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

/**
 * Displays a Leaflet map centered on the first POI in the list.
 * Shows markers for each POI with popups displaying name and coordinates.
 *
 * @param {Object[]} poiList - Array of POI objects with lat, lon, name, and id.
 * @returns JSX element or null if no POIs.
 */
function ItineraryMap({ poiList }) {
  // Filter POIs that have valid coordinates
  const validPois = poiList?.filter(poi => poi.lat != null && poi.lon != null);

  // Return null if no POIs with coordinates
  if (!validPois || validPois.length === 0) return null;

  // Helper component to update map center when poiList changes
  const SetMapCenter = () => {
    const map = useMap();

    useEffect(() => {
      if (validPois[0]) {
        map.setView([validPois[0].lat, validPois[0].lon]);
      }
    }, [validPois, map]);

    return null;
  };

  return (
    <MapContainer
      center={[validPois[0].lat, validPois[0].lon]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "400px", width: "50%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {validPois.map(
        (poi) =>
          poi.lat &&
          poi.lon && (
            <Marker key={poi.id} position={[poi.lat, poi.lon]}>
              <Popup>
                {poi.name}
                <br />
                {poi.lat} {poi.lon}
              </Popup>
            </Marker>
          )
      )}

      <SetMapCenter />
    </MapContainer>
  );
}

export default ItineraryMap;
