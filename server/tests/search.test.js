import supertest from "supertest";
import express from "express";
import searchRoutes from "../routes/search";
import { jest } from "@jest/globals";
import axios from "axios";

jest.spyOn(axios, "get");

describe("Geoapify Search Routes", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/search", searchRoutes());
    axios.get.mockClear();
  });

  test("returns POIs and center for valid place", async () => {
    axios.get
      .mockImplementationOnce(() => Promise.resolve({
        data: { features: [{ properties: { lat: 48.8584, lon: 2.2945 } }] }
      }))
      .mockImplementationOnce(() => Promise.resolve({
        data: { features: [{ id: 1, name: "Eiffel Tower" }] }
      }));

    const res = await supertest(app)
      .post("/search")
      .query({ place: "Paris", category: "tourism.sights" });

    expect(res.status).toBe(200);
    expect(res.body.center).toEqual([48.8584, 2.2945]);
    expect(res.body.pois).toHaveLength(1);
    expect(res.body.pois[0].name).toBe("Eiffel Tower");
  });

  test("returns 404 if place not found", async () => {
    axios.get.mockImplementationOnce(() => Promise.resolve({ data: { features: [] } }));

    const res = await supertest(app)
      .post("/search")
      .query({ place: "UnknownPlace", category: "tourism.sights" });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/place not found/i);
  });

  test("returns 500 if Geoapify API call fails", async () => {
    axios.get.mockImplementationOnce(() => Promise.reject(new Error("API failure")));

    const res = await supertest(app)
      .post("/search")
      .query({ place: "Paris", category: "tourism.sights" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to fetch pois/i);
  });
});
