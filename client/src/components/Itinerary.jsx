import axios from "axios";
import { useEffect, useState } from "react";
import { port } from "../../config";
import ItineraryMap from "./ItineraryMap";

const tripRoutesCaches = new Map();
const snapCache = new Map();


function TripItinerary({id}){

  const [activities, setActivities] = useState([]);
  const [dayInd, setDayInd] = useState(0);
  const [routeEstimates, setRouteEstimates] = useState([]);

  if(!tripRoutesCaches.has(id)){
    tripRoutesCaches.set(id, new Map())
  }

  const routeCache = tripRoutesCaches.get(id);

useEffect(()=>{
    axios.get(port+`/trips/${id}/itinerary`, {withCredentials:true}).then((response)=>{

      const acts = response.data.actsPerDay
      if(acts){
        // const actsPerDay = acts.reduce((acc, act) => {
        //   const lastGroup = acc[acc.length - 1];

        //   if (!lastGroup || lastGroup[0].day_number !== act.day_number) {
        //     acc.push([act]);
        //   } else {
        //     lastGroup.push(act);
        //   }

        //   return acc;
        // }, []);
        setActivities(acts);
        setRouteEstimates(response.data.routeEstimates)

      }
    })
  },[id]);

  // useEffect(()=>{
  //   if(activities.length === 0)
  //     return;

  //   async function snap(lon,lat) {
  //     const key = `${lat},${lon}`;

  //     if(snapCache.has(key))
  //       return snapCache.get(key);

  //     try {
  //       const response = await axios.get('https://api.geoapify.com/v1/snap-to-road', {params: { lat, lon, apiKey: import.meta.env.VITE_GEOAPIFY_API_KEY }});
  //       const coords = response.data.features?.[0]?.geometry?.coordinates;
  //       console.log('snap',coords)
  //       if(coords){
  //         snapCache.set(key,coords);
  //         return coords;
  //       }
  //     } catch (error) {
  //       console.error("Snap error",error);
  //     }
  //     return [lon, lat];
  //   }

  //   async function fetchRoutes() {
  //     const allDayEstimates = [];
  //     console.log("Cache size before fetching:", routeCache.size);


  //     for (let dayActs of activities){
  //       const dayEstimates = [];

  //       for(let i=0; i<dayActs.length-1; i++){
  //         const from = dayActs[i];
  //         const to = dayActs[i+1];
  //         if(!from.lat || !from.lon || !to.lat || !to.lon){
  //           console.warn("Missing coords:", from, to);
  //         dayEstimates.push(null);
  //         continue;
  //         }

  //         const key = `${from.lat},${from.lon}|${to.lat},${to.lon}`
  //         if(routeCache.has(key)){
  //           dayEstimates.push(routeCache.get(key));
  //         }
  //         else{
  //           try {
  //             const response = await axios.get('https://api.geoapify.com/v1/routing', {params:{waypoints: key, mode: "drive", apiKey: import.meta.env.VITE_GEOAPIFY_API_KEY}});
  //             const props = response.data.features?.[0]?.properties;

  //             if(props){
  //               const estimate =  {from:from.name, to:to.name, distance: props.distance, time: props.time };
  //               routeCache.set(key, estimate);
  //               dayEstimates.push(estimate);
  //             }
  //             else {
  //               console.warn(`No properties found in response for ${key}`);
  //               dayEstimates.push(null);
  //             }
  //             } catch (error) {
  //               console.error(`Error fetching route for ${key}:`, error);
  //               dayEstimates.push(null);
  //               // if(error.response?.status === 400){
  //               //   const [lonFrom, latFrom] = await snap(from.lon,from.lat);
  //               //   const [lonTo, latTo] = await snap(to.lon,to.lat);
  //               //   const newKey = `${latFrom},${lonFrom}|${latTo},${lonTo}`;
  //               //   if(routeCache.has(newKey)){
  //               //     dayEstimates.push(routeCache.get(newKey));
  //               //   }
  //               //   else{
  //               //     try {
  //               //     const newResponse = await axios.get('https://api.geoapify.com/v1/routing', {params: {
  //               //         waypoints: newKey,
  //               //         mode: "transit",
  //               //         apiKey: import.meta.env.VITE_GEOAPIFY_API_KEY,
  //               //       }
  //               //       });
  //               //       const props = newResponse.data.features?.[0]?.properties;
  //               //       if(props){
  //               //         const newEstimate = {from:from.name, to:to.name, distance: props.distance, time: props.time }
  //               //         routeCache.set(newKey,newEstimate);
  //               //         dayEstimates.push(newEstimate);
  //               //       }
  //               //       else{
  //               //         dayEstimates.push(null);
  //               //       }
  //               //     } catch (err) {
  //               //       console.error("Retry with snapped coords failed", err);
  //               //       dayEstimates.push(null);
  //               //     }

  //               //   }
  //               // }
  //               // else{
  //               //   console.error("Route error:", error);
  //               //   dayEstimates.push(null);
  //               // }
  //             }            
  //         }
          
  //       }
  //       allDayEstimates.push(dayEstimates);
  //     }
  //     console.log("Cache size after fetching:", routeCache.size);

  //     setRouteEstimates(allDayEstimates);
  //     console.log(allDayEstimates)
  //   };
  //   fetchRoutes();
  //   console.log("Route cache keys:", Array.from(routeCache.keys()));
  // },[activities])


  return (
    <>
    <button onClick={()=>setDayInd(prev=>Math.max(prev-1,0))}>{'<'}</button>
    Day {activities[dayInd]?.[0]?.day_number + 1 || '?'}
    <button onClick={() => setDayInd(i => Math.min(i + 1, activities.length - 1))}>{'>'}</button>
    <ItineraryMap poiList={activities[dayInd]} />
    <ul>
      {
        activities.map((dayActs, i)=>{
        const currTime = new Date(`1970-01-01T${dayActs[0].start_time}`);
        const dayRoutes = routeEstimates[i] || [];
          
          return(
        <li key={i}>
          <h3>{dayActs[0]?.day_number + 1}</h3>
          {dayActs[0].start_time}
          <ul>
            {dayActs.map((act, j)=>{
              const actTime = currTime.toTimeString().slice(0,5);
              currTime.setMinutes(currTime.getMinutes() + (act.duration?.minutes || 0))
              currTime.setHours(currTime.getHours() + (act.duration?.hours || 0))
              return(
              <li key={act.trip_day_poi_id}>
                {actTime} {act.name}
                {j < dayActs.length - 1 && dayRoutes[j] &&
                 <p >↓ {Math.round(dayRoutes[j].distance)} m, {Math.round(dayRoutes[j].time / 60)} min to {dayRoutes[j].to}</p>}
              </li>
            )
            })}
          </ul>
          
        </li> 
        )
      })
      }
    </ul>
    </>
  )
}

export default TripItinerary;