import express from "express";
import session from "express-session";
import pg from "pg";
import connectPgSimple from "connect-pg-simple";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import NodeCache from "node-cache";

// Route modules
import authRoutes from "./routes/auth.js";
import tripRoutes from "./routes/trips.js";
import poiRoutes from "./routes/pois.js";
import searchRoutes from "./routes/search.js";

// Initialize app and environment
const app = express();
dotenv.config();
const port = process.env.PORT || 5000;

// Database client setup
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

// Session store configuration
const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({ pool: db }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

// General middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy for authentication
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
      if (!result.rows.length) return done(null, false, { message: "User not found" });

      const user = result.rows[0];
      bcrypt.compare(password, user.password, (err, valid) => {
        if (err) return done(err);
        if (!valid) return done(null, false, { message: "Incorrect password" });
        return done(null, user);
      });
    } catch (err) {
      return done(err);
    }
  })
);
passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((user, cb) => cb(null, user));

// Attach routes
app.use("/", authRoutes(db));
app.use("/trips", tripRoutes(db));
app.use("/poi", poiRoutes(db));
app.use("/search", searchRoutes(db));

// Start server
app.listen(port, () => console.log(`Server listening on port ${port}`));