import axios from "axios";
import { useEffect, useState } from "react";
import { dateFormat, port } from "../../config";

/**
 * Home component displaying a list of trips and a form to add a new trip.
 */
function Home() {
  const [tripList, setTripList] = useState([]);
  const [tripTitle, setTriptitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [addForm, setAddForm] = useState(false);

  useEffect(() => {
    // Fetch trips on mount
    axios.get(port, { withCredentials: true }).then((response) => {
      if (response.data.trips) setTripList(response.data.trips);
    });
  }, []);

  function handleSave(e) {
    e.preventDefault();

    // Post new trip data to backend
    axios.post(
      port + "/add_trip",
      { title: tripTitle, startDate: startDate, endDate: endDate },
      { withCredentials: true }
    )
    .then((response) => {
      if (response.status === 201) {
        // Clear form and update trip list with new trip
        setTriptitle("");
        setStartDate("");
        setEndDate("");
        setAddForm(false);
        setTripList((prev) => [...prev, response.data.result]);
      } else {
        alert(response.data.message);
      }
    })
    .catch((error) => {
      alert(error);
    });
  }

  return (
    <>
      {addForm ? (
        <form>
          <p>Add Trip</p>
          <input
            onChange={(e) => setTriptitle(e.target.value)}
            value={tripTitle}
            placeholder="Title"
          />
          <input
            onChange={(e) => setStartDate(e.target.value)}
            value={startDate}
            placeholder="Start Date"
            type="date"
          />
          <input
            onChange={(e) => setEndDate(e.target.value)}
            value={endDate}
            placeholder="End Date"
            type="date"
          />
          <button onClick={handleSave}>Save</button>
          <button type="button" onClick={() => setAddForm(false)}>Cancel</button>
        </form>
      ) : (
        <button onClick={() => setAddForm(true)}>Add Trip</button>
      )}
      <ul>
        {tripList.map((trip) => (
          <li key={trip.id}>
            <a href={`/trips/${trip.id}`}>
              {trip.title} from{" "}
              {new Date(trip.start_date).toLocaleDateString(undefined, dateFormat)} to{" "}
              {new Date(trip.end_date).toLocaleDateString(undefined, dateFormat)}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

export default Home;
