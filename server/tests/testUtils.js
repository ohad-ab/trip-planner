import { db } from "../server.js";
import bcrypt from "bcrypt";

// Truncate all tables and reset IDs
export async function resetTables() {
  await db.query(`
    TRUNCATE TABLE trip_day_pois, pois, trips, users RESTART IDENTITY CASCADE;
  `);
}

// Create a test user
export async function createTestUser(email = "test@example.com", password = "pass", username = "test") {
  const hashed = await bcrypt.hash(password, 10);
  const res = await db.query(
    "INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING *",
    [email, hashed, username]
  );
  return res.rows[0];
}

// Create a test trip
export async function createTestTrip(userId, title = "Test Trip", startDate = "2025-01-01", endDate = "2025-01-10") {
  const tripRes = await db.query(
    `INSERT INTO trips (user_id, title, start_date, end_date)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, title, startDate, endDate]
  );
  const trip = tripRes.rows[0];

  const daysRes = await db.query(
    `INSERT INTO trip_days (trip_id, day_number, date, start_time)
     SELECT $1, ROW_NUMBER() OVER () - 1, date::DATE, '09:00:00'::TIME
     FROM generate_series($2::DATE, $3::DATE, interval '1 day') AS date
     RETURNING *`,
    [trip.id, trip.start_date, trip.end_date]
  );
  return { trip, days: daysRes.rows };
}

// Create a test POI
export async function createTestPOI(tripId, name = "POI 1", lat = 10, lon = 10, cat = "hotel") {
  const dayRes = await db.query(
    "SELECT id FROM trip_days WHERE trip_id=$1 ORDER BY day_number ASC LIMIT 1",
    [tripId]
  );
  const tripDayId = dayRes.rows[0].id;
  const poiRes = await db.query(
    "INSERT INTO pois(name, lat, lon, kind) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, lat, lon, cat]
  );
  const poi = poiRes.rows[0];
  await db.query(
    "INSERT INTO trip_day_pois(trip_day_id, poi_id, position) VALUES ($1, $2, 0)",
    [tripDayId, poi.id]
  );
  return poi;
}