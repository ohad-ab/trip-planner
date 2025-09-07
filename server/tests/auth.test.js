import supertest from "supertest";
import express from "express";
import { describe, jest } from "@jest/globals";
import bcrypt from "bcrypt";
import authRoutes from "../routes/auth";
import passport from "passport";
import { verifyUser } from "../server";

jest.spyOn(passport, "authenticate");
jest.spyOn(bcrypt, "compare");

describe("Auth Routes", () => {
  let app;
  let mockDb;
  let testUser;
  let logOutMock, destroyMock, loginMock;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    mockDb = { query: jest.fn() };
    passport.authenticate.mockClear();
    logOutMock = jest.fn((options, cb) => cb && cb(null));
    destroyMock = jest.fn((cb) => cb && cb(null));
    loginMock = jest.fn((user, cb) => cb && cb(null));
          

    // Mock req.isAuthenticated for GET /
    app.use((req, res, next) => {
      req.user = testUser;
      req.isAuthenticated = jest.fn(() => !!req.user);
      next();
    });

    // Mock req.login and req.logOut
    app.use((req, res, next) => {
      req.login = loginMock;
      req.logIn = jest.fn((user, cb) => cb && cb(null));
      req.logOut = logOutMock;
      req.session = {destroy: destroyMock};
      next();
    });

    app.use("/", authRoutes(mockDb));
  });

  describe("GET /", () => {
    test("returns user info and trips if authenticated with trips", async () => {
      testUser = { id: 1, email: "a@b.com" };
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1, title: "Trip 1" }] });

      const res = await supertest(app).get("/");

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.trips).toHaveLength(1);
    });

    test("returns empty trips if authenticated but no trips", async () => {
      testUser = { id: 1, email: "a@b.com" };

      // No trips in DB
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await supertest(app).get("/");

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toEqual(testUser);
      expect(res.body.trips).toEqual([]); // explicitly empty
    });

    test("returns undefined trips and null user if not authenticated", async () => {
      testUser = null;

      const res = await supertest(app).get("/");

      expect(res.statusCode).toBe(200);
      expect(res.body.trips).toBeUndefined();
      expect(res.body.user).toBeNull();
    });

    test("returns 500 if DB query throws in GET /", async () => {
      testUser = { id: 1, email: "a@b.com" };
      mockDb.query.mockImplementationOnce(() => { throw new Error("DB fail"); });

      const res = await supertest(app).get("/");

      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /register", () => {
    test("fails if email exists", async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const res = await supertest(app).post("/register").send({
        email: "existing@example.com",
        password: "pass",
        repeatedPassword: "pass",
        username: "user1",
      });

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/email/i);
    });

    test("fails if passwords do not match", async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await supertest(app).post("/register").send({
        email: "new@example.com",
        password: "pass1",
        repeatedPassword: "pass2",
        username: "user1",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/repeated/i);
    });

    test("succeeds for valid registration", async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // no existing user
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 2, email: "new@example.com" }] });

      const res = await supertest(app).post("/register").send({
        email: "new@example.com",
        password: "pass",
        repeatedPassword: "pass",
        username: "user1",
      });

      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
    });

    test("returns 500 if registration throws an unexpected error", async () => {
      // Simulate DB error on first query
      mockDb.query.mockImplementationOnce(() => { throw new Error("Unexpected"); });

      const res = await supertest(app).post("/register").send({
        email: "test@example.com",
        password: "pass",
        repeatedPassword: "pass",
        username: "user1",
      });

      expect(res.statusCode).toBe(500);
    });

    test("returns 500 if req.login fails during registration", async () => {
      // No existing user
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 2, email: "new@example.com" }] });

      // Mock req.login to simulate error
      loginMock.mockImplementation((user, cb) => cb(new Error("Login failed")));

      const res = await supertest(app).post("/register").send({
        email: "new@example.com",
        password: "pass",
        repeatedPassword: "pass",
        username: "user1",
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Login failed");
      });
  });

  describe("POST /login", ()=>{
    test("logs in successfully with valid credentials", async () => {
      passport.authenticate.mockImplementation((strategy, callback) => {
      return (req, res, next) => {
        const user = { id: 1, email: "a@b.com" };
        callback(null, user, { message: "ok" }); // authenticate callback

        // call req.logIn like Passport would
        // req.logIn(user, (err) => {
        //   if (err) return next(err);
        //   res.json({ success: true, message: "Authentication successful", user });
        // });
      };
    });


      const res = await supertest(app)
        .post("/login")
        .send({ email: "a@b.com", password: "pass" });

      expect(res.body.success).toBe(true);
      expect(res.body.user).toEqual({ id: 1, email: "a@b.com" });
    });

    test("fails if password is incorrect",async ()=>{
      passport.authenticate.mockImplementation((strategy, callback)=>{
        return (req, res, next) => {
          const user = { id: 1, email: "a@b.com" };
          callback(null, false, { message: "Invalid credentials" }); // authenticate callback

        };
      });
      const res = await supertest(app)
        .post("/login")
        .send({ email: "wrong@example.com", password: "badpass" });

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid credentials");
    })

    test("fails with server error if passport returns an error", async () => {
      passport.authenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          // Simulate a DB or server error
          callback(new Error("DB failure"), null, null);
        };
      });

      const res = await supertest(app)
        .post("/login")
        .send({ email: "a@b.com", password: "pass" });

      // By default, Express sends 500 if you call next(err) without a custom error handler
      expect(res.status).toBe(500);
      expect(res.text).toMatch(/DB failure/); // will match the default error message
    });
    
    test("fails if req.logIn throws an error", async () => {
      passport.authenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          const user = { id: 1, email: "a@b.com" };
          req.logIn = jest.fn((user, cb) => cb(new Error("Session error")));
          callback(null, user, { message: "ok" }); // simulate found user

          // Make req.logIn simulate an error
        };
      });

      const res = await supertest(app)
        .post("/login")
        .send({ email: "a@b.com", password: "pass" });

      // Since your route does `if (err) return next(err);`,
      // Express should send the error through the default handler.
      // In tests, supertest will see a 500 response by default.
      expect(res.status).toBe(500);
      expect(res.text).toMatch(/Session error/);
    });
  });

  describe("POST /logout", () => {
    test("logs out successfully", async () => {

      const res = await supertest(app).post("/logout");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Logout successful");
    });

    test("fails if logOut returns error", async () => {
      logOutMock.mockImplementation((options, cb) => cb(new Error("Logout error"))) ;

      const res = await supertest(app).post("/logout");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Logout failed");
    });

    test("fails if session.destroy returns error", async () => {

      destroyMock.mockImplementation((cb) => cb(new Error("Destroy error")))

      const res = await supertest(app).post("/logout");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Session destruction failed");
    });
  });
});