// FixMapResize.jsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

const FixMapResize = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize(); // force tiles to load correctly
    }, 200);
  }, [map]);

  return null;
};

export default FixMapResize;
