// tests/pois.test.js
import supertest from "supertest";
import express from "express";
import { jest } from "@jest/globals";
import poiRoutes from "../routes/pois";

describe("POI Routes", () => {
  let app;
  let mockDb;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    mockDb = { query: jest.fn() };
    app.use("/pois", poiRoutes(mockDb));
  });

  describe("POST /pois", () => {
    test("adds a POI successfully", async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // insert POI
        .mockResolvedValueOnce({ rows: [{ position: 0 }] }); // link to trip_day

      const res = await supertest(app)
        .post("/pois")
        .send({ name: "Eiffel Tower", day: 10, cat: "sightseeing", lat: 48.8584, lon: 2.2945 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ id: 1, position: 0 });
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    test("fails with 400 if name or day missing", async () => {
      const res = await supertest(app).post("/pois").send({ cat: "sightseeing" });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    test("returns 500 on DB error", async () => {
      mockDb.query.mockRejectedValueOnce(new Error("DB fail"));

      const res = await supertest(app)
        .post("/pois")
        .send({ name: "Eiffel Tower", day: 10 });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toMatch(/failed to add/i);
    });
  });

  describe("DELETE /pois", () => {
    test("deletes a POI successfully", async () => {
      mockDb.query.mockResolvedValueOnce({});
      const res = await supertest(app).delete("/pois").send({ id: 1 });
      expect(res.statusCode).toBe(200);
      expect(mockDb.query).toHaveBeenCalledWith("DELETE FROM pois WHERE id = $1", [1]);
    });

    test("returns 500 on DB error", async () => {
      mockDb.query.mockRejectedValueOnce(new Error("DB fail"));
      const res = await supertest(app).delete("/pois").send({ id: 1 });
      expect(res.statusCode).toBe(500);
    });
  });
});
