// tests/trips.test.js
import supertest from "supertest";
import express from "express";
import { jest } from "@jest/globals";

import { routeCache } from "../routes/trips";
import axios from "axios";
import tripRoutes from "../routes/trips";

jest.spyOn(axios, "get");

const request = supertest;

describe("Trip Routes", () => {
  let app;
  let mockDb;

  beforeEach(() => {
    routeCache.flushAll();
    axios.get.mockClear();

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.user = { id: 1 };
      next();
    });

    mockDb = { query: jest.fn() };
    app.use("/trips", tripRoutes(mockDb));
  });

  // ===== GET /:id =====
  describe("GET /:id", () => {
    test("returns trip with first day and activities", async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: "My Trip" }] }) // trip
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })                     // first day
        .mockResolvedValueOnce({ rows: [{ id: 100, name: "Eiffel Tower" }] }); // activities

      const res = await request(app).get("/trips/1");

      expect(res.statusCode).toBe(200);
      expect(res.body.trip.title).toBe("My Trip");
      expect(res.body.day).toBe(10);
      expect(res.body.activities).toHaveLength(1);
    });

    test("returns 504 on DB error", async () => {
      mockDb.query.mockRejectedValueOnce(new Error("DB fail"));

      const res = await request(app).get("/trips/1");
      expect(res.statusCode).toBe(504);
    });
  });

  // ===== GET /:id/itinerary =====
  describe("GET /:id/itinerary", () => {
    test("returns itinerary JSON for a trip with POIs", async () => {
    // 9️⃣ Mock DB query for activities
    mockDb.query.mockResolvedValueOnce({
      rows: [
        {
          trip_day_poi_id: 1,
          name: "Eiffel Tower",
          day_number: 1,
          start_time: "09:00",
          lat: 48.8584,
          lon: 2.2945,
        },
        {
          trip_day_poi_id: 2,
          name: "Louvre Museum",
          day_number: 1,
          start_time: "11:00",
          lat: 48.8606,
          lon: 2.3376,
        },
      ],
    });

    // 🔟 Mock axios response for route estimates
    axios.get.mockResolvedValueOnce({
      data: {
        features: [
          { properties: { distance: 2000, time: 600 } },
        ],
      },
    });

    const res = await request(app).get("/trips/1/itinerary");

    expect(res.statusCode).toBe(200);
    expect(res.body.actsPerDay).toHaveLength(1);
    expect(res.body.actsPerDay[0]).toHaveLength(2);
    expect(res.body.routeEstimates[0][0]).toMatchObject({
      from: "Eiffel Tower",
      to: "Louvre Museum",
      distance: 2000,
      time: 600,
    });

    expect(mockDb.query).toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalled();
  });

  test("returns empty array if trip has no POIs", async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/trips/999/itinerary");

    expect(res.statusCode).toBe(200);
    expect(res.body.actsPerDay).toEqual([]);
    expect(res.body.routeEstimates).toEqual([]);
  });

  test("handles multiple days with route estimates", async () => {
    // Mock DB query: 2 days with 2 POIs each
    mockDb.query.mockResolvedValueOnce({
      rows: [
        { trip_day_poi_id: 1, name: "Eiffel Tower", day_number: 1, start_time: "09:00", lat: 48.8584, lon: 2.2945 },
        { trip_day_poi_id: 2, name: "Louvre Museum", day_number: 1, start_time: "11:00", lat: 48.8606, lon: 2.3376 },
        { trip_day_poi_id: 3, name: "Notre Dame", day_number: 2, start_time: "09:00", lat: 48.853, lon: 2.3499 },
        { trip_day_poi_id: 4, name: "Sainte-Chapelle", day_number: 2, start_time: "10:30", lat: 48.8554, lon: 2.345 },
      ],
    });

    // Mock axios calls in sequence
    axios.get
      .mockResolvedValueOnce({ data: { features: [{ properties: { distance: 2000, time: 600 } }] } }) // day 1
      .mockResolvedValueOnce({ data: { features: [{ properties: { distance: 1500, time: 400 } }] } }); // day 2

    const res = await request(app).get("/trips/1/itinerary");

    expect(res.statusCode).toBe(200);

    // Acts per day
    expect(res.body.actsPerDay).toHaveLength(2);
    expect(res.body.actsPerDay[0]).toHaveLength(2);
    expect(res.body.actsPerDay[1]).toHaveLength(2);

    // Route estimates
    expect(res.body.routeEstimates[0][0]).toMatchObject({ from: "Eiffel Tower", to: "Louvre Museum", distance: 2000, time: 600 });
    expect(res.body.routeEstimates[1][0]).toMatchObject({ from: "Notre Dame", to: "Sainte-Chapelle", distance: 1500, time: 400 });

    expect(mockDb.query).toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test("handles a day with only one POI (no route estimate)", async () => {
  mockDb.query.mockResolvedValueOnce({
    rows: [
      { trip_day_poi_id: 1, name: "Colosseum", day_number: 1, start_time: "09:00", lat: 41.8902, lon: 12.4922 },
    ],
  });

  const res = await request(app).get("/trips/1/itinerary");

  expect(res.statusCode).toBe(200);

  // 1 day, 1 act
  expect(res.body.actsPerDay).toHaveLength(1);
  expect(res.body.actsPerDay[0]).toHaveLength(1);

  // No route estimates
  expect(res.body.routeEstimates[0]).toEqual([]);

  expect(mockDb.query).toHaveBeenCalled();
  expect(axios.get).not.toHaveBeenCalled();
  });

  test("skips route estimation when POI is missing coordinates", async () => {
  mockDb.query.mockResolvedValueOnce({
    rows: [
      { trip_day_poi_id: 1, name: "POI A", day_number: 1, start_time: "09:00", lat: null, lon: null },
      { trip_day_poi_id: 2, name: "POI B", day_number: 1, start_time: "10:00", lat: 40.0, lon: -70.0 },
    ],
  });

  const res = await request(app).get("/trips/1/itinerary");

  expect(res.statusCode).toBe(200);

  // Acts per day
  expect(res.body.actsPerDay[0]).toHaveLength(2);

  // Route estimates skipped due to missing lat/lon
  expect(res.body.routeEstimates[0]).toEqual([]);

  expect(mockDb.query).toHaveBeenCalled();
  expect(axios.get).not.toHaveBeenCalled();
  });

  test("returns 500 if axios fails", async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [
        { trip_day_poi_id: 1, name: "A", day_number: 1, start_time: "09:00", lat: 1, lon: 1 },
        { trip_day_poi_id: 2, name: "B", day_number: 1, start_time: "10:00", lat: 2, lon: 2 },
      ],
    });

    axios.get.mockRejectedValueOnce(new Error("API down"));

    const res = await request(app).get("/trips/1/itinerary");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Failed to fetch itinerary" });

    expect(mockDb.query).toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalled();
  });

  test("returns 500 if database throws an error", async () => {
    mockDb.query.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get("/trips/1/itinerary");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Failed to fetch itinerary" });
    expect(mockDb.query).toHaveBeenCalled();
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("uses cached route if available", async () => {
  const cachedEstimate = { from: "A", to: "B", distance: 123, time: 456 };
  routeCache.set("1,2|3,4", cachedEstimate);

  mockDb.query.mockResolvedValueOnce({
    rows: [
      { trip_day_poi_id: 1, name: "A", day_number: 1, start_time: "09:00", lat: 1, lon: 2 },
      { trip_day_poi_id: 2, name: "B", day_number: 1, start_time: "10:00", lat: 3, lon: 4 },
    ],
  });

  const res = await request(app).get("/trips/1/itinerary");

  expect(res.statusCode).toBe(200);
  expect(res.body.routeEstimates[0][0]).toEqual(cachedEstimate);
  expect(axios.get).not.toHaveBeenCalled();
});

test("returns null if API response missing properties", async () => {
  mockDb.query.mockResolvedValueOnce({
    rows: [
      { trip_day_poi_id: 1, name: "A", day_number: 1, start_time: "09:00", lat: 1, lon: 2 },
      { trip_day_poi_id: 2, name: "B", day_number: 1, start_time: "10:00", lat: 3, lon: 4 },
    ],
  });

  axios.get.mockResolvedValueOnce({ data: { features: [{}] } });

  const res = await request(app).get("/trips/1/itinerary");

  expect(res.statusCode).toBe(200);
  expect(res.body.routeEstimates[0][0]).toBeNull();
});
  });

  // ===== GET /:id/trip_day =====
  describe("GET /:id/trip_day", () => {
    test("returns activities for a specific day", async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 42 }] })                // day
        .mockResolvedValueOnce({ rows: [{ id: 1, name: "POI A" }] }); // activities

      const res = await request(app).get("/trips/1/trip_day?day=0");

      expect(res.statusCode).toBe(200);
      expect(res.body.day).toBe(42);
      expect(res.body.activities).toHaveLength(1);
    });

    test("returns 504 on DB error", async () => {
      mockDb.query.mockRejectedValueOnce(new Error("DB fail"));
      const res = await request(app).get("/trips/1/trip_day?day=0");

      expect(res.statusCode).toBe(504);
      expect(res.body).toEqual({ error: "Database error" });
    });
  });

  // ===== POST /update_poi_order =====
  describe("POST /update_poi_order", () => {
    test("updates POI positions and returns 200", async () => {
      mockDb.query.mockResolvedValue({});
      const res = await request(app)
        .post("/trips/update_poi_order")
        .send({ orderedIds: [3, 1, 2], dayId: 10 });

      expect(res.statusCode).toBe(200);
      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });
  });

  // ===== POST /update_activity =====
  describe("POST /update_activity", () => {
    test("updates a field and returns 200", async () => {
      mockDb.query.mockResolvedValue({});
      const res = await request(app)
        .post("/trips/update_activity")
        .send({ value: "01:00:00", act_id: 1, day_id: 10, field: "duration" });

      expect(res.statusCode).toBe(200);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE trip_day_pois SET duration"),
        ["01:00:00", 10, 1]
      );
    });

    test("returns 500 on DB error", async () => {
      mockDb.query.mockRejectedValueOnce(new Error("DB fail"));
      const res = await request(app)
        .post("/trips/update_activity")
        .send({ value: "01:00:00", act_id: 1, day_id: 10, field: "duration" });

      expect(res.statusCode).toBe(500);
    });
  });

  // ===== POST /add_trip =====
  describe("POST /add_trip", () => {
    test("adds a new trip and days", async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: "Trip X" }] }) // insert trip
        .mockResolvedValueOnce({}); // insert days

      const res = await request(app)
        .post("/trips/add_trip")
        .send({ title: "Trip X", startDate: "2025-01-01", endDate: "2025-01-03" });

      expect(res.statusCode).toBe(201);
      expect(res.body.result.title).toBe("Trip X");
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    test("returns 500 on DB error", async () => {
      mockDb.query.mockRejectedValueOnce(new Error("DB fail"));
      const res = await request(app)
        .post("/trips/add_trip")
        .send({ title: "Trip X", startDate: "2025-01-01", endDate: "2025-01-03" });

      expect(res.statusCode).toBe(500);
    });
  });

  // ===== DELETE /:id =====
  describe("DELETE /:id", () => {
    test("deletes a trip and returns 204", async () => {
      mockDb.query.mockResolvedValue({});
      const res = await request(app).delete("/trips/1");

      expect(res.statusCode).toBe(204);
      expect(mockDb.query).toHaveBeenCalledWith("DELETE FROM trips WHERE id=$1", ["1"]);
    });

    test("returns 500 on DB error", async () => {
      mockDb.query.mockRejectedValueOnce(new Error("DB fail"));
      const res = await request(app).delete("/trips/1");

      expect(res.statusCode).toBe(500);
    });
  });
});
