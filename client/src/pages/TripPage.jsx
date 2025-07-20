import { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import TripEditor from "./TripEditor";
import TripItinerary from "../components/Itinerary";
import { port } from "../../config";
import axios from "axios";

export default function TripPage() {
  const { id } = useParams();
  const [view, setView] = useState(() => {
  return sessionStorage.getItem('viewMode') || 'itinerary';
});
  const location = useLocation();
  const [title, setTitle] = useState("");


  useEffect(() => {
  sessionStorage.setItem('viewMode', view);
}, [view]);

  useEffect(() => {
    axios.get(`${port}/trips/${id}`, { withCredentials: true }).then((res) => {
      setTitle(res.data.trip?.title || "Untitled Trip");
    });
  }, [id]);

    useEffect(() => {
    const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  if (!isReload) {
    setView('itinerary')
  }
  }, [location.pathname]);

  return (
    <>
      <h2>{title}</h2>
      <button onClick={() => setView(view === "edit" ? "itinerary" : "edit")}>
        Switch to {view === "edit" ? "Itinerary" : "Editor"} View
      </button>

      {view === "edit" ? (
        <TripEditor id={id} />
      ) : (
        <TripItinerary id={id} />
      )}
    </>
  );
}