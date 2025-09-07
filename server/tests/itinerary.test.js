// tests/itinerary.test.js
import supertest from "supertest";
import express from "express";
import { jest } from "@jest/globals";

import { routeCache } from "../routes/trips";
import axios from "axios";
import tripRoutes from "../routes/trips";

jest.spyOn(axios, 'get');




  const request = supertest;


describe("GET /trips/:id/itinerary", () => {
  let app;
  let mockDb;

  beforeEach(() => {
    // 4️⃣ Clear cache & reset mocks before each test
    routeCache.flushAll();
    axios.get.mockClear();

    // 5️⃣ Setup Express app
    app = express();
    app.use(express.json());

    // 6️⃣ Mock user for routes that require authentication
    app.use((req, res, next) => {
      req.user = { id: 1 };
      next();
    });

    // 7️⃣ Mock database
    mockDb = { query: jest.fn() };

    // 8️⃣ Attach routes
    app.use("/trips", tripRoutes(mockDb));
  });

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

});