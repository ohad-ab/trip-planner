import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import axios from 'axios';
import { port } from '../../config';

// 🔧 Fix default marker icons
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: iconRetina,
//   iconUrl: icon,
//   shadowUrl: shadow,
// });

// ✅ Force map to recalculate size
// const FixMapResize = () => {
//   const map = useMap();
//   useEffect(() => {
//     setTimeout(() => {
//       map.invalidateSize();
//     }, 200);
//   }, [map]);
//   return null;
// };

const redIcon = new L.icon({
  iconUrl: '/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl:shadow,
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

const greenIcon = new L.icon({
  iconUrl: '/marker-icon-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl:shadow,
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

const POIMap = ({ poiList, results, resCenter, day, fetchActivities, poiClickId, setPoiClickId, readOnly}) => {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
  const defaultCenter = poiList.length
    ? [poiList[0].lat, poiList[0].lon]
    : [48.8566, 2.3522]; // fallback: Paris
  const zoomDefault = 2;
  const zoomPOI = 13;

  const [marker, setMarker] = useState();
  const [markerDetails, setMarkerDetails] = useState({});
  const [center, setCenter] = useState(resCenter);
  const [shouldRecenter, setShouldRecenter] = useState(poiClickId !== null);
  
  const SetMapCenter = ({ center }) => {
    const map = useMap();

    useEffect(() => {
      if (center && shouldRecenter) {
        if(poiList.length === 0){
          map.setView(center,zoomDefault);
        }
        else{
          map.flyTo(center, zoomPOI)
        }
        setShouldRecenter(false);
      }
    }, [center,shouldRecenter, map]);

    return null;
};

useEffect(() => {
  if (poiList.length === 0) {
    setCenter(defaultCenter);
    setShouldRecenter(true);
  }
}, [poiList]);

useEffect(()=>{
  if(results?.length > 0 || poiClickId){
    setCenter(resCenter);
    setShouldRecenter(true);
  }
},[results, poiClickId]);

// useEffect(()=>{
//   if(resCenter){
//     setCenter(resCenter);
//     setShouldRecenter(true);
//   }
// },[resCenter])

  const AutoOpenMarker = ({ position, text }) => {
    const markerRef = useRef();
    const map = useMap();

    function isSamePlace(poi, details, tolerance = 0.0003){
      const nameMatch = poi.name === details.name;
      const latClose = Math.abs(poi.lat - details.lat) < tolerance;
      const lonClose = Math.abs(poi.lon - details.lon) < tolerance;
      return nameMatch && latClose && lonClose;
    };

    const handleSave =(markerDetails)=>{
      const isAlreadyAdded = poiList.some(poi =>
        isSamePlace(poi, markerDetails)
      );
      console.log(isAlreadyAdded)
      if (isAlreadyAdded) {
        alert("This place is already added.");
        return;
      }
      axios.post(port+'/poi', {name:markerDetails?.name || markerDetails.address_line1, lat:markerDetails.lat, lon:markerDetails.lon, day:day}).then((response)=>{
        if(response.status === 200){
          fetchActivities();
          setMarker(null);
          setMarkerDetails(null);
          map.closePopup();
        }
      })
  }

    useEffect(() => {
      if (markerRef.current) {
        markerRef.current.openPopup();
      }
    }, []);
      return (
        <Marker ref={markerRef} position={position} icon={greenIcon}>
          <Popup>
            {!markerDetails ? (<div>
              Loading...
            </div>):
            (<>
            {markerDetails?.name || markerDetails?.address_line1}<br/>
            <button onClick={(e)=>handleSave(markerDetails)}>Add</button>
            </>)}
          </Popup>
        </Marker>
      );
      
  };

  function PoiMarker({poi, poiClickId, deletePOI, clearFreeMarker}){
      const ref = useRef();

      useEffect(()=>{
        
        const markerRef = ref.current;

        if (poiClickId !== null && markerRef && poi.id === poiClickId){
          markerRef.openPopup();
          clearFreeMarker(null);
        }
        

      },[poiClickId]);

      return (
          <Marker ref={ref} position={[poi.lat, poi.lon]} eventHandlers={{click:()=>clearFreeMarker()}}>
            <Popup>
              {poi.name}<br/>
              <button onClick={()=>deletePOI(poi)}>Delete</button>
              </Popup>
          </Marker>
          )

  }

  function MapClickHandler ({ onClick }){
  useMapEvent('click', (e) => {
    const { lat, lng } = e.latlng;
    onClick({ lat, lng });
  });

  return null;
  }


const handleSaveResult =(markerDetails)=>{
    axios.post(port+'/poi', {name:markerDetails?.name || markerDetails.address_line1, lat:markerDetails.lat, lon:markerDetails.lon, day:day}).then((response)=>{
      if(response.status === 200){
        fetchActivities();
      }
    })
  }
  function searchCoords(coords){
    axios.get(`https://api.geoapify.com/v1/geocode/reverse?lat=${coords.lat}&lon=${coords.lng}&apiKey=${apiKey}`).then((response)=>{
      setMarkerDetails(response.data.features[0].properties)
      console.log(response.data.features[0].properties)
    }).catch((message)=>console.log(message))
  }

  function deletePOI(poi){
    console.log(poi.id)
    axios.delete(port+'/poi',{withCredentials: true,
  data: { id: poi.id }}).then((response)=>{
      if(response.status === 200){
        console.log("Deleted");
        fetchActivities();
      }
    }).catch((error)=>{
      console.error(error.message);
    })
  }
  return (
    <div style={{ width: '100%', height: '400px', marginTop: '2rem', position: 'relative', zIndex: 0 }}>
      <MapContainer
        center={center || defaultCenter}
        zoom={poiList.length > 0 ? zoomPOI : zoomDefault}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        {/* <FixMapResize /> */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SetMapCenter center={center}/>
        <MapClickHandler onClick={(coords)=>{
            if (poiClickId != null) {
              setPoiClickId(null);
            }
            else if(!marker)
            {
              setCenter(coords);
              setShouldRecenter(false);
              setMarker(coords);
              searchCoords(coords);
            }
            else
            {
              setMarker(null);
              setMarkerDetails(null);
            }
        }}/>
        {marker?
        <AutoOpenMarker position={marker} text={marker.lat+" "+marker.lng}/>
          :''}
        {poiList.map((poi) => (
          <PoiMarker key={poi.id} poi={poi} poiClickId={poiClickId} deletePOI={deletePOI} clearFreeMarker={()=>{setMarker(null); setMarkerDetails(null)}}/>
        ))}
        {
          results?.map((res,i)=>(
            <Marker key={i} position={[res.properties.lat, res.properties.lon]} icon={redIcon} eventHandlers={{click:()=>{setMarker(null); setMarkerDetails(null)}}}>
              <Popup>
              {res.properties?.name_international?.en || res.properties.name}<br/>
                {<button onClick={(e)=>handleSaveResult(res.properties)}>Add</button>}
              </Popup>
            </Marker>
          ))
        }
      </MapContainer>
    </div>
  );
};

export default POIMap;
