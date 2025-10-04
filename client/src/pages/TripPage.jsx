import { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import TripEditor from "./TripEditor";
import TripItinerary from "../components/Itinerary";
import { port } from "../../config";
import axios from "axios";

/**
 * TripPage component that acts as a wrapper for the trip editor and itinerary views.
 * Handles loading the trip title and toggling between edit and view modes.
 */
export default function TripPage() {
  const { id } = useParams();
  const location = useLocation();

  const [view, setView] = useState(() => {
    return sessionStorage.getItem('viewMode') || 'itinerary';
  });

  const [title, setTitle] = useState("");

  // Persist current view mode across page reloads
  useEffect(() => {
    sessionStorage.setItem('viewMode', view);
  }, [view]);

  // Fetch trip title when component mounts or ID changes
  useEffect(() => {
    axios.get(`${port}/trips/${id}`, { withCredentials: true }).then((res) => {
      setTitle(res.data.trip?.title || "Untitled Trip");
    });
  }, [id]);

  // Reset to itinerary view when arriving from a different route (not on reload)
  useEffect(() => {
    const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
    if (!isReload) {
      setView('itinerary');
    }
  }, [location.pathname]);

  return (
    <>
      <h2>{title}</h2>

      <button className="switch-view" onClick={() => setView(view === "edit" ? "itinerary" : "edit")}>
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