import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import { port } from '../../config';

/**
 * POIMap component displays POIs and search results on a Leaflet map.
 * Allows users to add or delete POIs, recenter the map, and auto-open popups.
 * 
 * @param {Array} poiList - Fixed POIs for the day
 * @param {Array} results - POI search results to optionally add
 * @param {Object} resCenter - Lat/lon to recenter on
 * @param {number} day - Current day index
 * @param {Function} fetchActivities - Refetch activity list after adding/removing
 * @param {number|null} poiClickId - ID of selected POI to focus popup
 * @param {Function} setPoiClickId - Setter for selected POI
 * @param {boolean} readOnly - Whether map is read-only or interactive
 */
const POIMap = ({ poiList, results, resCenter, day, fetchActivities, poiClickId, setPoiClickId, readOnly }) => {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;

  const defaultCenter = poiList.length && poiList[0].lat != null && poiList[0].lon != null
    ? [poiList[0].lat, poiList[0].lon]
    : [48.8566, 2.3522]; // Paris fallback

  const zoomDefault = 2;
  const zoomPOI = 13;

  const [marker, setMarker] = useState();
  const [markerDetails, setMarkerDetails] = useState({});
  const [center, setCenter] = useState(resCenter);
  const [shouldRecenter, setShouldRecenter] = useState(poiClickId !== null);

  // Marker icons
  const redIcon = new L.Icon({
    iconUrl: '/marker-icon-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: shadow,
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  });

  const greenIcon = new L.Icon({
    iconUrl: '/marker-icon-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: shadow,
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  });

  // Automatically center map when clicking on a POI or getting new results
  useEffect(() => {
    if (poiList.length === 0) {
      setCenter(defaultCenter);
      setShouldRecenter(true);
    }
  }, [poiList]);

  useEffect(() => {
    if (results?.length > 0 || poiClickId) {
      setCenter(resCenter);
      setShouldRecenter(true);
    }
  }, [results, poiClickId]);

  /** Force map to recenter on a given location */
  function SetMapCenter({ center }) {
    const map = useMap();

    useEffect(() => {
      if (center && shouldRecenter) {
        map.setView(center, poiList.length === 0 ? zoomDefault : zoomPOI);
        setShouldRecenter(false);
      }
    }, [center, shouldRecenter, map]);

    return null;
  }

  /** Reverse geocode clicked location */
  function searchCoords(coords) {
    axios
      .get(`https://api.geoapify.com/v1/geocode/reverse`, {
        params: {
          lat: coords.lat,
          lon: coords.lng,
          apiKey,
        },
      })
      .then((res) => setMarkerDetails(res.data.features[0].properties))
      .catch((err) => console.error(err));
  }

  /** Save a search result POI */
  function handleSaveResult(details) {
    axios
      .post(`${port}/poi`, {
        name: details?.name || details.address_line1,
        lat: details.lat,
        lon: details.lon,
        day,
      })
      .then((res) => {
        if (res.status === 200) {
          fetchActivities();
        }
      });
  }

  /** Delete existing POI */
  function deletePOI(poi) {
    axios
      .delete(`${port}/poi`, {
        withCredentials: true,
        data: { id: poi.id },
      })
      .then((res) => {
        if (res.status === 200) {
          fetchActivities();
        }
      })
      .catch((err) => console.error(err));
  }

  /** Handles user click on map (adds/removes free marker) */
  function MapClickHandler({ onClick }) {
    useMapEvent('click', (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }));
    return null;
  }

  /** Marker that opens its popup immediately and allows saving */
  function AutoOpenMarker({ position }) {
    const markerRef = useRef();
    const map = useMap();

    useEffect(() => {
      if (markerRef.current) markerRef.current.openPopup();
    }, []);

    function isSamePlace(poi, details, tol = 0.0003) {
      return (
        poi.name === details.name &&
        Math.abs(poi.lat - details.lat) < tol &&
        Math.abs(poi.lon - details.lon) < tol
      );
    }

    function handleSave(details) {
      const alreadyExists = poiList.some((poi) => isSamePlace(poi, details));
      if (alreadyExists) {
        alert("This place is already added.");
        return;
      }

      axios
        .post(`${port}/poi`, {
          name: details?.name || details.address_line1,
          lat: details.lat,
          lon: details.lon,
          day,
        })
        .then((res) => {
          if (res.status === 200) {
            fetchActivities();
            setMarker(null);
            setMarkerDetails(null);
            map.closePopup();
          }
        });
    }

    return (
      <Marker ref={markerRef} position={position} icon={greenIcon}>
        <Popup>
          {!markerDetails ? (
            <div>Loading...</div>
          ) : (
            <>
              {markerDetails.name || markerDetails.address_line1}
              <br />
              <button onClick={() => handleSave(markerDetails)}>Add</button>
            </>
          )}
        </Popup>
      </Marker>
    );
  }

  /** Marker for a saved POI */
  function PoiMarker({ poi, poiClickId, deletePOI, clearFreeMarker }) {
    const ref = useRef();

    useEffect(() => {
      if (poiClickId != null && ref.current && poi.id === poiClickId) {
        ref.current.openPopup();
        clearFreeMarker();
      }
    }, [poiClickId]);

    return (
      <Marker
        ref={ref}
        position={[poi.lat, poi.lon]}
        eventHandlers={{ click: () => clearFreeMarker() }}
      >
        <Popup>
          {poi.name}
          <br />
          <button onClick={() => deletePOI(poi)}>Delete</button>
        </Popup>
      </Marker>
    );
  }

  return (
    <div style={{ width: '100%', height: '400px', marginTop: '2rem', position: 'relative', zIndex: 0 }}>
      <MapContainer
        center={center || defaultCenter}
        zoom={poiList.length > 0 ? zoomPOI : zoomDefault}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SetMapCenter center={center} />
        <MapClickHandler
          onClick={(coords) => {
            if (poiClickId != null) {
              setPoiClickId(null);
            } else if (!marker & coords.lat != null && coords.lng != null) {
              setCenter(coords);
              setShouldRecenter(false);
              setMarker(coords);
              searchCoords(coords);
            } else {
              setMarker(null);
              setMarkerDetails(null);
            }
          }}
        />

        {marker && <AutoOpenMarker position={marker} />}

        {poiList.map((poi) => (
          poi.lat != null && poi.lon != null ?<PoiMarker
            key={poi.id}
            poi={poi}
            poiClickId={poiClickId}
            deletePOI={deletePOI}
            clearFreeMarker={() => {
              setMarker(null);
              setMarkerDetails(null);
            }}
          /> : null
        ))}

        {results?.map((res, i) => (
          <Marker
            key={i}
            position={[res.properties.lat, res.properties.lon]}
            icon={redIcon}
            eventHandlers={{ click: () => setMarker(null) }}
          >
            <Popup>
              {res.properties.name_international?.en || res.properties.name}
              <br />
              <button onClick={() => handleSaveResult(res.properties)}>Add</button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default POIMap;
