// TripItinerary.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import TripItinerary from "../src/components/Itinerary";

// Mock axios
jest.mock("axios");

// Mock ItineraryMap so we don’t render Leaflet
jest.mock("../src/components/ItineraryMap", () => {
  return function MockItineraryMap(props) {
    return <div data-testid="map">Map with {props.poiList?.length || 0} POIs</div>;
  };
});

describe("TripItinerary", () => {
  const sampleData = {
    actsPerDay: [
      [
        {
          trip_day_poi_id: 1,
          day_number: 0,
          name: "Museum",
          start_time: "09:00",
          duration: { hours: 1, minutes: 30 },
        },
        {
          trip_day_poi_id: 2,
          day_number: 0,
          name: "Cafe",
          start_time: "09:00",
          duration: { hours: 0, minutes: 45 },
        },
      ],
      [
        {
          trip_day_poi_id: 3,
          day_number: 1,
          name: "Beach",
          start_time: "10:00",
          duration: { hours: 2, minutes: 0 },
        },
      ],
    ],
    routeEstimates: [
      [
        { distance: 500, time: 600, to: "Cafe" }, // 600 sec = 10 min
      ],
      [],
    ],
  };

  beforeEach(() => {
    axios.get.mockResolvedValue({ data: sampleData });
  });

  it("fetches and displays activities", async () => {
    render(<TripItinerary id={123} />);

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("/trips/123/itinerary"),
      expect.any(Object)
    );

    // Museum should appear after data load
    await waitFor(() => {
      expect(screen.getByText(/Museum/)).toBeInTheDocument();
    });

    // Route estimate should be rendered
    expect(screen.getByText(/500 m/)).toBeInTheDocument();
    expect(screen.getByText(/10 min/)).toBeInTheDocument();

    // Mock map should receive 2 POIs
    expect(screen.getByTestId("map")).toHaveTextContent("2 POIs");
  });

  it("navigates days with < and > buttons", async () => {
    render(<TripItinerary id={123} />);
    await screen.findByText(/Museum/);

    // Initially Day 1
    expect(screen.getByText(/Day 1/)).toBeInTheDocument();

    // Move to Day 2
    fireEvent.click(screen.getByText(">"));
    expect(await screen.findByText(/Beach/)).toBeInTheDocument();
    expect(screen.getByText(/Day 2/)).toBeInTheDocument();

    // Back to Day 1
    fireEvent.click(screen.getByText("<"));
    expect(await screen.findByText(/Museum/)).toBeInTheDocument();
  });

  it("renders time progression correctly", async () => {
    render(<TripItinerary id={123} />);
    await screen.findByText(/Museum/);

    // Museum should start at 09:00
    expect(screen.getByText(/09:00 Museum/)).toBeInTheDocument();

    // Cafe should come after 1h30 → 10:30
    expect(screen.getByText(/10:30 Cafe/)).toBeInTheDocument();
  });

  it("handles empty itinerary safely", async () => {
    axios.get.mockResolvedValue({ data: { actsPerDay: [], routeEstimates: [] } });
    render(<TripItinerary id={999} />);

    await waitFor(() => {
      expect(screen.getByText("Day ?")).toBeInTheDocument();
    });
  });

});
