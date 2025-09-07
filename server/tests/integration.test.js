import supertest from "supertest";
import { app, db } from "../server.js";
import { expect, jest } from "@jest/globals";
import { resetTables, createTestUser, createTestTrip, createTestPOI } from "./testUtils.js";
import axios from "axios";

jest.spyOn(axios, "get");

let agent;

beforeEach(async () => {
  await resetTables();
  agent = supertest.agent(app)
});

afterAll(async () => {
  await db.end();
});

describe("Auth routes", () => {
  test("register flow", async () => {
    const res = await supertest(app).post("/register").send({
      email: "newuser@example.com",
      password: "pass",
      repeatedPassword: "pass",
      username: "newuser",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("login flow", async () => {
    await createTestUser("loginuser@example.com", "pass", "loginuser");
    const res = await supertest(app).post("/login").send({
      username: "loginuser@example.com",
      password: "pass",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("Trips routes", () => {
  test("create trip and fetch trips", async () => {
    const user = await createTestUser();
    const loginRes = await agent
      .post("/login")
      .send({ username: user.email, password: "pass", });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.success).toBe(true);

    const trip = await agent.post("/trips/add_trip").send({
      title: "Test Trip",
      startDate: "2025-01-01", 
      endDate: "2025-01-10"});


    expect(trip.statusCode).toBe(201);
    expect(trip.body.result.title).toBe("Test Trip");
    
    const res = await agent.get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body.trips.length).toBe(1);
    expect(res.body.trips[0].title).toBe("Test Trip");
  });
});

describe("POI routes", () => {
  test("add and delete POI", async () => {
    const user = await createTestUser();
    const { trip, days } = await createTestTrip(user.id);

    const addRes = await supertest(app).post("/poi").send({
      name: "Hotel",
      lat: 10,
      lon: 20,
      cat: "hotel",
      day: days[0].id,
    });

    expect(addRes.statusCode).toBe(200);
    expect(addRes.body.id).toBeDefined();
    expect(addRes.body.position).toBe(0);

    const deleteRes = await supertest(app).delete("/poi").send({
      id: addRes.body.id,
    });

    expect(deleteRes.statusCode).toBe(200);
  });
});

describe("Search routes", () => {
  test("mock Geoapify search", async () => {
    axios.get.mockImplementation((url, { params }) => {
      if (url.includes("/v1/geocode/search")) {
        return Promise.resolve({
          data: { features: [{ properties: { lat: 10, lon: 20 } }] },
        });
      } else if (url.includes("/v2/places")) {
        return Promise.resolve({
          data: { features: [{ id: "poi1" }, { id: "poi2" }] },
        });
      }
    });

    const res = await supertest(app)
      .post("/search")
      .query({ place: "Paris", category: "hotel" });

    expect(res.statusCode).toBe(200);
    expect(res.body.pois).toHaveLength(2);
    expect(res.body.center).toEqual([10, 20]);
  });
});

describe("Trips routes (auth required)", () => {
  test("cannot create a trip without logging in", async () => {
    const res = await supertest(app).post("/trips/add_trip").send({
      title: "Unauthorized Trip",
      startDate: "2025-01-01",
      endDate: "2025-01-05",
    });

    // Expect forbidden/unauthorized
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBeFalsy();
  });
});

describe("Itinerary routes", () => {
  test("returns empty itinerary if no POIs", async () => {
    const user = await createTestUser();
    await agent.post("/login").send({ username: user.email, password: "pass" });

    const tripRes = await agent.post("/trips/add_trip").send({
      title: "Week Trip",
      startDate: "2025-01-01",
      endDate: "2025-01-07",
    });

    expect(tripRes.statusCode).toBe(201);

    const trip = tripRes.body.result;
    // fetch trip itinerary and check trip_days length
    const itineraryRes = await agent.get(`/trips/${trip.id}/itinerary`);
    expect(itineraryRes.statusCode).toBe(200);
    expect(itineraryRes.body.actsPerDay).toEqual([]);
    expect(itineraryRes.body.routeEstimates).toEqual([]);
  });

  test("groups activities per day", async () => {
    const user = await createTestUser();
    const {trip, days} = await createTestTrip(user.id);
    const poi1 = await createTestPOI(trip.id, "Hotel", 10, 20);
    const poi2 = await createTestPOI(trip.id, "Museum", 11, 21);

    axios.get.mockImplementation((url, { params }) => {
      if (url.includes("/v1/routing")) {
        return Promise.resolve({
          data: {
            features: [
              { properties: { distance: 1000, time: 600 } }
            ]
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    await agent
      .post("/login")
      .send({ username: user.email, password: "pass" });

    const itineraryRes = await agent.get(`/trips/${trip.id}/itinerary`);
    expect(itineraryRes.statusCode).toBe(200);

    // should return a single day with 2 activities
    expect(itineraryRes.body.actsPerDay).toHaveLength(1);
    expect(itineraryRes.body.actsPerDay[0]).toHaveLength(2);
    expect(itineraryRes.body.actsPerDay[0][0].name).toBe("Hotel");
    expect(itineraryRes.body.actsPerDay[0][1].name).toBe("Museum");
  });
});

describe("POI routes (extra cases)", () => {
  test("multiple POIs increment position", async () => {
    const user = await createTestUser();
    await agent.post("/login").send({ username: user.email, password: "pass" });
    const trip = await createTestTrip(user.id);

    const poi1 = await agent.post("/poi").send({
      name: "POI1",
      lat: 1,
      lon: 1,
      cat: "sight",
      day: trip.days[0].id, // assuming createTestTrip returns days
    });

    const poi2 = await agent.post("/poi").send({
      name: "POI2",
      lat: 2,
      lon: 2,
      cat: "sight",
      day: trip.days[0].id,
    });

    expect(poi1.body.position).toBe(0);
    expect(poi2.body.position).toBe(1);
  });
});

describe("Auth routes (extra case)", () => {
  test("logout clears session", async () => {
    const user = await createTestUser();
    await agent.post("/login").send({ username: user.email, password: "pass" });

    const logoutRes = await agent.post("/logout");
    expect(logoutRes.statusCode).toBe(200);

    // should now be unauthorized
    const tripRes = await agent.post("/trips/add_trip").send({
      title: "Trip after logout",
      startDate: "2025-01-01",
      endDate: "2025-01-02",
    });

    expect(tripRes.statusCode).toBe(500);
    expect(tripRes.body.success).toBeFalsy();
  });
});

test("register fails with missing email", async () => {
  const res = await supertest(app).post("/register").send({
    password: "pass",
    repeatedPassword: "pass",
    username: "user",
  });
  expect(res.statusCode).toBe(500);
});

test("login fails with wrong password", async () => {
  const user = await createTestUser();
  const res = await supertest(app).post("/login").send({
    username: user.email,
    password: "wrong",
  });
  expect(res.body.success).toBe(false);
});

describe("Trips routes - edge cases", () => {
  test("cannot create trip without required fields", async () => {
    const user = await createTestUser();
    await agent.post("/login").send({ username: user.email, password: "pass" });
    const res = await agent.post("/trips/add_trip").send({
      startDate: "2025-01-01", // missing title
      endDate: "2025-01-05",
    });
    expect(res.statusCode).toBe(500);
  });

  test("fetch trips when none exist returns empty array", async () => {
    const user = await createTestUser();
    await agent.post("/login").send({ username: user.email, password: "pass" });
    const res = await agent.get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body.trips).toEqual([]);
  });
});

describe("POI routes - edge cases", () => {
  test("cannot add POI with missing name", async () => {
    const user = await createTestUser();
    const { trip, days } = await createTestTrip(user.id);
    await agent.post("/login").send({ username: user.email, password: "pass" });

    const res = await agent.post("/poi").send({
      lat: 10,
      lon: 10,
      cat: "hotel",
      day: days[0].id,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("cannot add POI to invalid trip_day_id", async () => {
    const user = await createTestUser();
    await agent.post("/login").send({ username: user.email, password: "pass" });

    const res = await agent.post("/poi").send({
      name: "Invalid POI",
      lat: 10,
      lon: 10,
      cat: "hotel",
      day: 9999, // non-existent
    });
    expect(res.statusCode).toBe(500);
  });

});

describe("Search routes - edge cases", () => {
  test("empty Geoapify results return empty pois array", async () => {
    axios.get.mockResolvedValueOnce({ data: { features: [] } });

    const res = await supertest(app).post("/search").query({
      place: "Nowhere",
      category: "hotel",
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  test("Geoapify API failure returns 500", async () => {
    axios.get.mockRejectedValueOnce(new Error("API down"));

    const res = await supertest(app).post("/search").query({
      place: "Paris",
      category: "hotel",
    });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Failed to fetch POIs from Geoapify");
  });
});