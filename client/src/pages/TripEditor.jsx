import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dateFormat, port } from "../../config";
import categoryGroups from "../data/categories.json";
import POIMap from "../components/POIMap";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableItem from "../components/SortableItem";
/**
 * Renders the TripEditor component, allowing the user to search for POIs,
 * manage activities per day (drag/drop, delete, duration), and view trip details.
 * @param {Object} props
 * @param {number|string} props.id - Trip ID from the route
 * @returns {JSX.Element}
 */
function TripEditor({ id }) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(categoryGroups[0].items[0].id);
  const [searchInput, setSearchInput] = useState("");
  const [resultsOn, setResultsOn] = useState(false);
  const [poiList, setPoiList] = useState([]);
  const [resCat, setResCat] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState();
  const [endDate, setEndDate] = useState();
  const [activities, setActivities] = useState([]);
  const [date, setDate] = useState();
  const [day, setDay] = useState(0);
  const [dayID, setDayID] = useState();
  const [center, setCenter] = useState();
  const [poiClickId, setPoiClickId] = useState();
  const [durationEditVal, setDurationeditVal] = useState("");
  const [editActId, setEditActId] = useState();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    axios.get(`${port}/trips/${id}`, { withCredentials: true }).then((response) => {
      if (response.data.trip) {
        setTitle(response.data.trip.title);
        setStartDate(new Date(response.data.trip.start_date));
        setDayID(response.data.day);
        setDate(new Date(response.data.trip.start_date));
        setEndDate(new Date(response.data.trip.end_date));
        setActivities(response.data.activities);
      }
    });
  }, [id]);

  /**
 * Fetches activities for the current trip and day, then updates local state.
 */
  function fetchActivities() {
    axios
      .get(`${port}/trips/${id}/trip_day?day=${day}`, { withCredentials: true })
      .then((response) => {
        setDayID(response.data.day);
        setActivities(response.data.activities);
      });
  }

  useEffect(fetchActivities, [day, id]);

  /**
 * Adds a new POI to the current day by sending it to the backend.
 * Closes the search results and refreshes the activity list on success.
 * @param {Event} e - Form click or submit event
 * @param {Object} poi - POI details from search result
 */
  const handleSave = (e, poi) => {
    axios
      .post(
        `${port}/poi`,
        {
          name: poi?.name_international?.en || poi.name,
          lat: poi.lat,
          lon: poi.lon,
          cat: resCat,
          day: dayID,
        },
        { withCredentials: true }
      )
      .then((response) => {
        if (response.status === 200) {
          setResultsOn(false);
          setPoiList([]);
          fetchActivities();
        }
      });
  };

  function addSubDay(sign) {
    const newDay = new Date(date);
    newDay.setDate(newDay.getDate() + sign);
    setDate(newDay);
    setDay((prev) => prev + sign);
  }

  function isSamePlace(poi, details, tolerance = 0.0003) {
    const nameMatch = poi.name === details.name;
    const latClose = Math.abs(poi.lat - details.lat) < tolerance;
    const lonClose = Math.abs(poi.lon - details.lon) < tolerance;
    return nameMatch && latClose && lonClose;
  }

  /**
 * Sends a search request for POIs based on the input and selected category.
 * Filters out already-added activities and displays the result list.
 * @param {Event} e - Form submission event
 */
  function handleSearch(e) {
    e.preventDefault();

    axios
      .post(
        `${port}/search?place=${searchInput}&category=${selectedCategory}`,
        {},
        { withCredentials: true }
      )
      .then((response) => {
        if (response.status === 200) {
          setPoiList(response.data.pois.filter((res) => !activities.some((act) => isSamePlace(act, res.properties))));
          setResultsOn(true);
          setResCat(selectedCategory);
          setCenter(response.data.center);
        }
      });
  }

  function handleDelete() {
    const confirmed = window.confirm("Are you sure you want to delete this trip?");
    if (confirmed) {
      axios.delete(`${port}/trips/${id}`, { withCredentials: true }).then((response) => {
        if (response.status === 204) {
          navigate("/");
        } else {
          alert("Error: Could not delete the entry");
        }
      });
    }
  }

  function deletePOI(poi) {
    axios
      .delete(`${port}/poi`, {
        withCredentials: true,
        data: { id: poi.id },
      })
      .then((response) => {
        if (response.status === 200) {
          fetchActivities();
        }
      })
      .catch((error) => {
        console.error(error.message);
      });
  }

  /**
 * Handles drag-and-drop reordering of POIs using @dnd-kit.
 * Updates both local state and backend with the new order.
 * @param {Object} e - DnD event object from @dnd-kit
 */
  function handleDragEnd(e) {
    if (e.active.id !== e.over.id) {
      setActivities((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === e.active.id);
        const newIndex = prev.findIndex((item) => item.id === e.over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const newArray = arrayMove(prev, oldIndex, newIndex);
        const orderedIds = newArray.map((val) => val.id);

        axios
          .post(
            `${port}/trips/update_poi_order`,
            { dayId: dayID, orderedIds: orderedIds },
            { withCredentials: true }
          )
          .then((response) => {
            if (response.status === 200) {
              fetchActivities();
            }
          })
          .catch((err) => {
            console.error(err);
          });

        return newArray;
      });
    }
  }

  function updateActivity(actId, field, value) {
    axios
      .post(
        `${port}/trips/update_activity`,
        { day_id: dayID, act_id: actId, field: field, value: value },
        { withCredentials: true }
      )
      .then((response) => {
        if (response.status === 200) {
          fetchActivities();
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  return (
    <>
      {date > startDate ? <button onClick={() => addSubDay(-1)}>{'<'}</button> : ""}
      {date?.toLocaleString(undefined, dateFormat)} Day {day + 1}
      {date < endDate ? <button onClick={() => addSubDay(1)}>{'>'}</button> : ""}
      <input placeholder="Search POI" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
      <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
        {categoryGroups.map((group) => (
          <optgroup key={group.group} label={group.group}>
            {group.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <button onClick={handleSearch}>Search</button>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activities} strategy={verticalListSortingStrategy}>
          <ul>
            {activities.map((act) => (
              <SortableItem key={act.trip_day_poi_id} id={act.trip_day_poi_id}>
                <div>
                  {act.name}
                  <form
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDurationeditVal("");
                      }
                    }}
                  >
                    <input
                      placeholder={act.duration?.minutes}
                      value={editActId === act.id ? durationEditVal : ""}
                      onClick={() => setEditActId(act.id)}
                      onChange={(e) => setDurationeditVal(e.target.value)}
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        updateActivity(act.id, "duration", durationEditVal);
                      }}
                    >
                      Set Duration
                    </button>
                  </form>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCenter([act.lat, act.lon]);
                      setPoiClickId(act.id);
                    }}
                  >
                    View
                  </button>
                  <button onClick={() => deletePOI(act)}>Delete</button>
                </div>
              </SortableItem>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {resultsOn ? (
        <>
          <h3>Search Results</h3>
          <ul>
            {poiList.length > 0 && <button onClick={() => setPoiList([])}>Close Results</button>}
            {poiList.map((val) => (
              <li style={{ cursor: "pointer" }} onClick={(e) => handleSave(e, val.properties)} key={val.properties.place_id || val.properties.name}>
                {val.properties?.name_international?.en || val.properties.name} {val.properties.city}
              </li>
            ))}
          </ul>
        </>
      ) : (
        ""
      )}

      <>
        <h3 style={{ marginTop: "2rem" }}>Trip Map</h3>
        <POIMap
          poiList={activities}
          results={poiList}
          resCenter={center}
          day={dayID}
          fetchActivities={fetchActivities}
          poiClickId={poiClickId}
          setPoiClickId={setPoiClickId}
        />
      </>

      <button onClick={handleDelete}>Delete Trip</button>
    </>
  );
}

export default TripEditor;
