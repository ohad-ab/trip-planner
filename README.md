# Trip Planner App

A full-stack React + Node.js app for planning trips, managing daily points of interest (POIs), and viewing itineraries on an interactive map.

## Features

- User registration and login with session-based authentication
- Create, edit, and delete trips with multiple days
- Add, reorder, and remove POIs per day
- Interactive map with Leaflet for placing and reviewing POIs
- Reverse geocoding via Geoapify API
- Route distance/time estimation between POIs
- Drag-and-drop reordering of POIs per day using @dnd-kit
- Toggle between editable and read-only itinerary views

## Tech Stack

- **Frontend:** React, React Router, Leaflet, @dnd-kit (drag-and-drop)
- **Backend:** Node.js, Express, PostgreSQL (via `pg`)
- **APIs:** [Geoapify](https://www.geoapify.com/) for geocoding and routing

## Notes
- Database schema and migrations are assumed to be set up externally.

- API keys should be added to .env files or environment variables before running.

- Authentication is cookie-based; login required to access trip features.

- The backend caches route calculations to optimize API usage.
