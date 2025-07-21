import axios from "axios";
import { useEffect, useState } from "react";
import { port } from "../../config";
import ItineraryMap from "./ItineraryMap";

const tripRoutesCaches = new Map();
const snapCache = new Map();

/**
 * TripItinerary renders a read-only itinerary for a given trip ID.
 * Displays POIs for each day with estimated travel time and distance between them.
 * Uses cached route estimates and allows day-to-day navigation.
 * @param {Object} props
 * @param {number|string} props.id - Trip ID to fetch itinerary data for
 * @returns {JSX.Element}
 */
function TripItinerary({ id }) {
  const [activities, setActivities] = useState([]);
  const [dayInd, setDayInd] = useState(0);
  const [routeEstimates, setRouteEstimates] = useState([]);

  if (!tripRoutesCaches.has(id)) {
    tripRoutesCaches.set(id, new Map());
  }

  const routeCache = tripRoutesCaches.get(id);

  useEffect(() => {
    axios.get(port + `/trips/${id}/itinerary`, { withCredentials: true }).then((response) => {
      const acts = response.data.actsPerDay;
      if (acts) {
        setActivities(acts);
        setRouteEstimates(response.data.routeEstimates);
      }
    });
  }, [id]);

  return (
    <>
      <button onClick={() => setDayInd((prev) => Math.max(prev - 1, 0))}>{"<"}</button>
      Day {activities[dayInd]?.[0]?.day_number + 1 || "?"}
      <button onClick={() => setDayInd((i) => Math.min(i + 1, activities.length - 1))}>{">"}</button>
      <ItineraryMap poiList={activities[dayInd]} />
      <ul>
        {activities.map((dayActs, i) => {
          const currTime = new Date(`1970-01-01T${dayActs[0].start_time}`);
          const dayRoutes = routeEstimates[i] || [];

          return (
            <li key={i}>
              <h3>{dayActs[0]?.day_number + 1}</h3>
              {dayActs[0].start_time}
              <ul>
                {dayActs.map((act, j) => {
                  const actTime = currTime.toTimeString().slice(0, 5);
                  currTime.setMinutes(currTime.getMinutes() + (act.duration?.minutes || 0));
                  currTime.setHours(currTime.getHours() + (act.duration?.hours || 0));
                  return (
                    <li key={act.trip_day_poi_id}>
                      {actTime} {act.name}
                      {j < dayActs.length - 1 && dayRoutes[j] && (
                        <p>
                          ↓ {Math.round(dayRoutes[j].distance)} m, {Math.round(dayRoutes[j].time / 60)} min to {dayRoutes[j].to}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default TripItinerary;
