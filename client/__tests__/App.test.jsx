import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import App from "../src/App";

// Mock axios
jest.mock("axios");

// Mock components that make network requests to avoid crashes
jest.mock("../src/components/POIMap", () => () => <div data-testid="mock-map" />);
jest.mock("../src/components/Itinerary", () => () => <div data-testid="mock-itinerary" />);
jest.mock("../src/pages/TripEditor", () => () => <div data-testid="mock-editor" />);

// Mock useNavigate from react-router-dom
const mockedNavigate = jest.fn();
// jest.mock("react-router-dom", () => {
//   const actual = jest.requireActual("react-router-dom");
//   return {
//     ...actual,
//     useNavigate: () => mockedNavigate,
//   };
// });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("App routing & auth", () => {
  function renderWithRouter(initialEntries = ["/"]) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    );
  }

  test("redirects to login when not authenticated", async () => {
    // Mock all necessary API calls
    axios.get.mockImplementation((url) => {
      if (url.includes("/trips/1/itinerary")) {
        return Promise.resolve({ data: { actsPerDay: [], routeEstimates: [] } });
      }
      if (url.includes("/trips/1")) {
        return Promise.resolve({ data: { trip: { title: "Test Trip" } } });
      }
      // Auth check
      return Promise.resolve({ data: { user: null } });
    });

    renderWithRouter(["/trips/1"]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /LOGIN/i })).toBeInTheDocument();
    });
  });

  test("shows home page when authenticated and visiting /", async () => {
    axios.get.mockResolvedValue({ data: { user: { id: 1, name: "Test User" } } });

    renderWithRouter(["/"]);

    await waitFor(() =>
      expect(screen.getByText(/Add Trip/i)).toBeInTheDocument()
    );
  });

  test("hides login/register when authenticated", async () => {
    axios.get.mockResolvedValue({ data: { user: { id: 1, name: "Test User" } } });

    renderWithRouter(["/login"]);

    await waitFor(() =>
      expect(screen.queryByText(/Login/i)).not.toBeInTheDocument()
    );
  });

  test("shows logout button when authenticated", async () => {
    axios.get.mockResolvedValue({ data: { user: { id: 1, name: "Test User" } } });

    renderWithRouter(["/"]);

    await waitFor(() =>
      expect(screen.getByText(/Logout/i)).toBeInTheDocument()
    );
  });
});
