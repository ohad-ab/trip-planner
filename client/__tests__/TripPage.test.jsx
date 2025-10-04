import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import TripPage from "../src/pages/TripPage";

jest.mock("axios");

// Mock TripEditor and TripItinerary
jest.mock("../src/pages/TripEditor", () => () => (
  <div data-testid="mock-editor">Mock Editor</div>
));
jest.mock("../src/components/Itinerary", () => () => (
  <div data-testid="mock-itinerary">Mock Itinerary</div>
));

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

function renderWithRouter(initialEntries = ["/trips/1"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/trips/:id" element={<TripPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("TripPage", () => {
  test("renders trip title from API", async () => {
    axios.get.mockImplementation((url) => {
      console.log("Mocked GET:", url);
      if (url.includes("/trips/1/itinerary")) {
        return Promise.resolve({ data: { actsPerDay: [], routeEstimates: [] } });
      }
      if (url.includes("/trips/1")) {
        console.log("Mocking trip title API call");
        return Promise.resolve({ data: { trip: { title: "Test Trip" } } });
      }
      console.log("Mocking other API call");
      return Promise.resolve({ data: {} });
    });

    renderWithRouter();

    expect(await screen.findByText("Test Trip")).toBeInTheDocument();
  });

  test("toggles between itinerary and editor views", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("/trips/1/itinerary")) {
        return Promise.resolve({ data: { actsPerDay: [], routeEstimates: [] } });
      }
      if (url.includes("/trips/1")) {
        return Promise.resolve({ data: { trip: { title: "Test Trip" } } });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter();

    // Starts with itinerary
    expect(await screen.findByTestId("mock-itinerary")).toBeInTheDocument();

    // Switch to editor
    fireEvent.click(screen.getByText(/Switch to Editor View/i));
    expect(await screen.findByTestId("mock-editor")).toBeInTheDocument();

    // Switch back
    fireEvent.click(screen.getByText(/Switch to Itinerary View/i));
    expect(await screen.findByTestId("mock-itinerary")).toBeInTheDocument();
  });

  test("persists view mode in sessionStorage", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("/trips/1/itinerary")) {
        return Promise.resolve({ data: { actsPerDay: [], routeEstimates: [] } });
      }
      if (url.includes("/trips/1")) {
        return Promise.resolve({ data: { trip: { title: "Persist Test" } } });
      }
      return Promise.resolve({ data: {} });
    });

    const { container } = renderWithRouter();
    fireEvent.click(container.querySelector(".switch-view"));

    await waitFor(() => {
      expect(sessionStorage.getItem("viewMode")).toBe("edit");
    });

    fireEvent.click(container.querySelector(".switch-view"));

    await waitFor(() => {
      expect(sessionStorage.getItem("viewMode")).toBe("itinerary");
    });
    
  });

  test("resets to itinerary when location changes", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("/trips/1/itinerary")) {
        return Promise.resolve({ data: { actsPerDay: [], routeEstimates: [] } });
      }
      if (url.includes("/trips/1")) {
        return Promise.resolve({ data: { trip: { title: "Reset Test" } } });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter();

    // Switch to editor
    fireEvent.click(await screen.findByText(/Switch to Editor View/i));
    expect(await screen.findByTestId("mock-editor")).toBeInTheDocument();

    // Simulate location change
    renderWithRouter();

    expect(await screen.findByTestId("mock-itinerary")).toBeInTheDocument();
  });
});
