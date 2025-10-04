// __tests__/Home.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "../src/pages/Home";
import axios from "axios";

// Mock axios
jest.mock("axios");

describe("Home component", () => {
  const tripsMock = [
    { id: 1, title: "Trip 1", start_date: "2025-01-01", end_date: "2025-01-02" },
  ];

  const newTripMock = { id: 2, title: "Trip 2", start_date: "2025-02-01", end_date: "2025-02-02" };

  beforeEach(() => {
    axios.get.mockResolvedValue({ data: { trips: tripsMock } });
    axios.post.mockResolvedValue({ status: 201, data: { result: newTripMock } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders 'Add Trip' button and trips fetched from backend", async () => {
    render(<Home />);
    expect(screen.getByText("Add Trip")).toBeInTheDocument();
    await waitFor(() => screen.getByText(/Trip 1/));
    expect(screen.getByText(/Trip 1/)).toBeInTheDocument();
  });

  it("opens and closes the add trip form", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("Add Trip"));
    expect(screen.getByPlaceholderText("Title")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByPlaceholderText("Title")).not.toBeInTheDocument();
  });

  it("updates form input values correctly", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("Add Trip"));

    const titleInput = screen.getByPlaceholderText("Title");
    const startInput = screen.getByPlaceholderText("Start Date");
    const endInput = screen.getByPlaceholderText("End Date");

    fireEvent.change(titleInput, { target: { value: "Trip 2" } });
    fireEvent.change(startInput, { target: { value: "2025-02-01" } });
    fireEvent.change(endInput, { target: { value: "2025-02-02" } });

    expect(titleInput.value).toBe("Trip 2");
    expect(startInput.value).toBe("2025-02-01");
    expect(endInput.value).toBe("2025-02-02");
  });

  it("adds a new trip on Save", async () => {
    render(<Home />);
    fireEvent.click(screen.getByText("Add Trip"));

    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "Trip 2" } });
    fireEvent.change(screen.getByPlaceholderText("Start Date"), { target: { value: "2025-02-01" } });
    fireEvent.change(screen.getByPlaceholderText("End Date"), { target: { value: "2025-02-02" } });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => screen.getByText(/Trip 2/));
    expect(screen.getByText(/Trip 2/)).toBeInTheDocument();
  });

  it("does not show form after saving a new trip", async () => {
    render(<Home />);
    fireEvent.click(screen.getByText("Add Trip"));

    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "Trip 2" } });
    fireEvent.change(screen.getByPlaceholderText("Start Date"), { target: { value: "2025-02-01" } });
    fireEvent.change(screen.getByPlaceholderText("End Date"), { target: { value: "2025-02-02" } });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => screen.getByText(/Trip 2/));
    expect(screen.queryByPlaceholderText("Title")).not.toBeInTheDocument();
  });
});
