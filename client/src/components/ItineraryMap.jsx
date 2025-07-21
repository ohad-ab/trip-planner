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
  // Return nothing if poiList is empty or undefined
  if (!poiList || poiList.length === 0) return null;

  // Helper component to update map center when poiList changes
  const SetMapCenter = () => {
    const map = useMap();

    useEffect(() => {
      // Center the map on the first POI's coordinates
      if (poiList[0]?.lat && poiList[0]?.lon) {
        map.setView([poiList[0].lat, poiList[0].lon]);
      }
    }, [poiList, map]);

    return null;
  };

  return (
    <MapContainer
      center={[poiList[0].lat, poiList[0].lon]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "400px", width: "50%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {poiList.map(
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
