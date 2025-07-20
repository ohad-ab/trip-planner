import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

function ItineraryMap({poiList}) {
  if(!poiList || poiList.length === 0)
    return null;

  const SetMapCenter = () => {
      const map = useMap();
  
      useEffect(() => {
       
        map.setView([poiList[0]?.lat, poiList[0]?.lon]);
         
      }, [poiList]);
  
      return null;
  };
  
  return (
    <>
      <MapContainer center={[poiList[0]?.lat, poiList[0]?.lon]} zoom={13} scrollWheelZoom={false} style={{ height: "400px", width: "50%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {poiList.map((poi) =>poi.lat && poi.lon ? (
          <Marker key={poi.id} position={[poi.lat, poi.lon]}>
            <Popup>
              {poi.name}<br/>
              {poi.lat} {poi.lon}
            </Popup>
          </Marker>
        ):null)}
        <SetMapCenter/>
      </MapContainer>
    </>
  )
}

export default ItineraryMap;