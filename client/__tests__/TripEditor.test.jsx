import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import TripEditor from "../src/pages/TripEditor";

jest.mock("axios");
jest.mock('../src/components/POIMap', () => () => <div data-testid="mock-map" />);
jest.mock('../src/components/SortableItem', () => ({ children }) => <div>{children}</div>);

beforeEach(() => {
  jest.clearAllMocks();
});

function renderWithRouter(id = 1) {
  return render(
    <MemoryRouter>
      <TripEditor id={id} />
    </MemoryRouter>
  );
}

describe("TripEditor", () => {
  test('adds a new activity', async () => {
    axios.get.mockResolvedValue({
      data: {
        trip: { title: 'Trip', start_date: '2025-01-01', end_date: '2025-01-02'},
        day: 0 ,
        activities: []
      },
    });

    axios.post.mockResolvedValue({ status: 200 });

    renderWithRouter(1);

    await waitFor(() => expect(screen.getByPlaceholderText('Name')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'New Activity' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/poi'),
      expect.objectContaining({ name: 'New Activity', day: expect.anything() }),
      expect.any(Object)
    ));
  });
  

  test('displays POI search results', async () => {
    axios.get.mockResolvedValue({ data: { trip: { title: 'Trip', start_date: '2025-01-01', end_date: '2025-01-02'}, day: 0, activities: []  } });
    axios.post.mockResolvedValue({
      status: 200,
      data: { pois: [{ properties: { name: 'POI 1', place_id: 'p1', lat: 0, lon: 0 } }], center: [0,0] }
    });

    renderWithRouter(1);

    fireEvent.change(screen.getByPlaceholderText('Search POI'), { target: { value: 'POI' } });
    fireEvent.click(screen.getByText('Search'));

    expect(await screen.findByText('POI 1')).toBeInTheDocument();
  });

  test("deletes trip when confirmed", async () => {
    axios.get.mockResolvedValue({ data: { trip: { title: 'Trip', start_date: '2025-01-01', end_date: '2025-01-02'}, day: 0, activities: [] } });
    axios.delete.mockResolvedValue({ status: 204 });
    const navigate = jest.fn();
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithRouter(1);

    fireEvent.click(await screen.findByText("Delete Trip"));

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/trips/1'), expect.any(Object));
    });
    window.confirm.mockRestore();
  });

  test("deletes a POI", async () => {
    const activities = [{ id: 1, trip_day_poi_id: 101, name: 'A' }];
    axios.get.mockResolvedValue({ data: { trip: { title: 'Trip', start_date: '2025-01-01', end_date: '2025-01-02'}, day: 0, activities } });
    axios.delete.mockResolvedValue({ status: 200 });

    renderWithRouter(1);

    fireEvent.click(await screen.findByText("Delete"));

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/poi'), expect.objectContaining({
        data: { id: 1 },
      }));
    });
  });

  test("updates activity duration", async () => {
    const activities = [{ id: 1, trip_day_poi_id: 101, name: 'A', duration: { hours: 1, minutes: 30 } }];
    axios.get.mockResolvedValue({ data: { trip: { title: 'Trip', start_date: '2025-01-01', end_date: '2025-01-02'}, day: 0, activities } });
    axios.post.mockResolvedValue({ status: 200 });

    renderWithRouter(1);

    const input = await screen.findByPlaceholderText("1:30");
    fireEvent.change(input, { target: { value: "2:00" } });

    const setDurationButton = screen.getByText("Set Duration");
    fireEvent.click(setDurationButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/trips/update_activity'),
        expect.objectContaining({ act_id: 1, field: "duration", value: "2:00" }),
        expect.any(Object)
      );
    });
  });

  test("navigates between days", async () => {
    axios.get.mockResolvedValue({ data: { trip: { title: 'Trip', start_date: '2025-01-01', end_date: '2025-01-02'}, day: 0, activities: [] } });
    
    renderWithRouter(1);

    const nextButton = await screen.findByText(">");
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/trip_day?day=1'), expect.any(Object));
    });

    const prevButton = screen.queryByText("<");
    if (prevButton) {
      fireEvent.click(prevButton);
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/trip_day?day=0'), expect.any(Object));
      });
    }
  });
});

describe("TripEditor day navigation", () => {
  const day0Activities = [
    { id: 1, trip_day_poi_id: 101, name: "Museum" },
    { id: 2, trip_day_poi_id: 102, name: "Cafe" },
  ];
  const day1Activities = [
    { id: 3, trip_day_poi_id: 103, name: "Beach" },
  ];

  beforeEach(() => {
    // Initial trip info
URLs:

    axios.get.mockImplementation((url) => {
      if (url.includes("/trip_day?day=0")) {
        return Promise.resolve({
          data: {
            day: 0,
            activities: [
              { trip_day_poi_id: 1, id: 1, name: "Museum", lat: 0, lon: 0 },
              { trip_day_poi_id: 2, id: 2, name: "Cafe", lat: 0, lon: 0 },
            ],
          },
        });
      }
      if (url.includes("/trip_day?day=1")) {
        return Promise.resolve({
          data: {
            day: 1,
            activities: [
              { trip_day_poi_id: 3, id: 3, name: "Beach", lat: 0, lon: 0 },
            ],
          },
        });
      }
      // initial trip info
      return Promise.resolve({
        data: {
          trip: {
            title: "Trip",
            start_date: "2025-01-01",
            end_date: "2025-01-02",
          },
          day: 0,
          activities: [],
        },
      });
    });
  });

  test("navigates between days and respects boundaries", async () => {
    renderWithRouter(1);

    // Wait for day 0 activities
    await screen.findByText(/Museum/);

    // On first day, "<" button should not exist
    expect(screen.queryByText("<")).not.toBeInTheDocument();
    // ">" button should exist
    expect(screen.getByText(">")).toBeInTheDocument();

    // Move to day 1
    fireEvent.click(screen.getByText(">"));
    await waitFor(() => {
      expect(screen.getByText("Beach")).toBeInTheDocument();
      expect(screen.getByText(/Day 2/)).toBeInTheDocument();
    });

    // On last day, ">" button should not exist
    expect(screen.queryByText(">")).not.toBeInTheDocument();
    // "<" button should exist
    expect(screen.getByText("<")).toBeInTheDocument();

    // Move back to first day
    fireEvent.click(screen.getByText("<"));
    await waitFor(() => {
      expect(screen.getByText("Museum")).toBeInTheDocument();
      expect(screen.getByText(/Day 1/)).toBeInTheDocument();
    });

    // Confirm first day boundary again
    expect(screen.queryByText("<")).not.toBeInTheDocument();
    expect(screen.getByText(">")).toBeInTheDocument();
  });

});