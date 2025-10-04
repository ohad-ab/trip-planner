import { render } from "@testing-library/react";
import FixMapResize from "../src/components/FixMapResize";

// Mock useMap to return a spy object
const invalidateSizeMock = jest.fn();

jest.mock("react-leaflet", () => {
  const invalidateSizeMock = jest.fn();
  return {
    useMap: () => ({ invalidateSize: invalidateSizeMock }),
    __invalidateSizeMock: invalidateSizeMock, // optional, to access later
  };
});

describe("FixMapResize", () => {
  let invalidateSizeMock;

  beforeEach(() => {
    // Access the mock we stored
    const leaflet = require("react-leaflet");
    invalidateSizeMock = leaflet.__invalidateSizeMock;
    invalidateSizeMock.mockClear();
  });

it("calls map.invalidateSize after mount", async () => {
    render(<FixMapResize />);
    await new Promise((r) => setTimeout(r, 250)); // wait for timeout
    expect(invalidateSizeMock).toHaveBeenCalled();
  });
});