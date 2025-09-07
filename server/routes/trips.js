import express from "express";
import axios from "axios";
import NodeCache from "node-cache";

export const routeCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // Cache expires in 1 hour
const API_URL = "https://api.geoapify.com";

function tripRoutes (db)  {
  const router = express.Router();

  // Get single trip and first day's activities
  router.get("/:id", async (req, res) => {
    try {
      const trip = await db.query("SELECT * FROM trips WHERE user_id=$1 AND id=$2", [req.user.id, req.params.id]);
      const day = await db.query("SELECT id FROM trip_days WHERE trip_id=$1 AND day_number=0", [req.params.id]);
      const activities = await db.query(
        `SELECT pois.*, trip_day_pois.duration, trip_day_pois.id AS trip_day_poi_id
         FROM pois 
         JOIN trip_day_pois ON pois.id=trip_day_pois.poi_id 
         JOIN trip_days ON trip_day_pois.trip_day_id=trip_days.id
         WHERE trip_days.trip_id=$1 AND trip_days.day_number=0
         ORDER BY trip_day_pois.position ASC`,
        [req.params.id]
      );
      res.json({ trip: trip.rows[0], day: day.rows[0].id, activities: activities.rows });
    } catch (error) {
      console.error("Database error:", error.message);
      res.status(504).json({ error: "Database error" });;
    }
  });

  // Get itinerary and cached route estimates
  router.get("/:id/itinerary", async (req, res) => {
    try {
      const acts = await db.query(
        `SELECT tdp.id AS trip_day_poi_id, pois.*, td.day_number, td.start_time, tdp.duration
         FROM pois
         JOIN trip_day_pois AS tdp ON pois.id = tdp.poi_id
         JOIN trip_days AS td ON td.id = tdp.trip_day_id
         WHERE td.trip_id = $1
         ORDER BY td.day_number ASC, tdp.position ASC`,
        [req.params.id]
      );
      if (acts.rows.length === 0) {
        return res.json({ actsPerDay: [], routeEstimates: [] });
      }

      // Group activities per day
      const actsPerDay = acts.rows.reduce((acc, act) => {
        const lastGroup = acc[acc.length - 1];
        if (!lastGroup || lastGroup[0].day_number !== act.day_number) {
          acc.push([act]);
        } else {
          lastGroup.push(act);
        }
        return acc;
      }, []);

      const allDayEstimates = [];

      // Estimate routes between POIs (with cache)
      for (const dayActs of actsPerDay) {
        const dayEstimates = [];

        for (let i = 0; i < dayActs.length - 1; i++) {
          const from = dayActs[i];
          const to = dayActs[i + 1];
          const key = `${from.lat},${from.lon}|${to.lat},${to.lon}`;

          const lat1 = from.lat;
          const lon1 = from.lon;
          const lat2 = to.lat;
          const lon2 = to.lon;

          if (
            !lat1 || !lon1 || !lat2 || !lon2 ||
            isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)
          ) {
            // skip cache or API call, maybe return null or error
            continue;
          }
          if (routeCache.has(key)) {
            console.log("Cache HIT", key);
            dayEstimates.push(routeCache.get(key));
          } else {
            const response = await axios.get(`${API_URL}/v1/routing`, {
              params: {
                waypoints: key,
                mode: "drive",
                apiKey: process.env.API_KEY,
              },
            });

            const props = response.data.features?.[0]?.properties;
            if (props) {
              const estimate = {
                from: from.name,
                to: to.name,
                distance: props.distance,
                time: props.time,
              };
              routeCache.set(key, estimate);
              dayEstimates.push(estimate);
            } else {
              dayEstimates.push(null);
            }
          }
        }

        allDayEstimates.push(dayEstimates);
      }

      res.json({ actsPerDay, routeEstimates: allDayEstimates });
    } catch (error) {
      console.error("Database error:", error.message);
      res.status(500).json({ error: "Failed to fetch itinerary" });
    }
  });

  // Get activities for a specific day
  router.get("/:id/trip_day", async (req, res) => {
    try {
      const day = await db.query("SELECT id FROM trip_days WHERE trip_id=$1 AND day_number=$2", [req.params.id, req.query.day]);
      const activities = await db.query(
        `SELECT pois.*, trip_day_pois.duration, trip_day_pois.id AS trip_day_poi_id
         FROM pois 
         JOIN trip_day_pois ON pois.id=trip_day_pois.poi_id 
         JOIN trip_days ON trip_day_pois.trip_day_id=trip_days.id
         WHERE trip_days.trip_id=$1 AND trip_days.day_number=$2
         ORDER BY trip_day_pois.position ASC`,
        [req.params.id, req.query.day]
      );
      res.json({ day: day.rows[0].id, activities: activities.rows });
    } catch (error) {
      console.error("Database error:", error.message);
      res.status(504).json({ error: "Database error" });
    }
  });

  // Reorder POIs for a given day
  router.post("/update_poi_order", async (req, res) => {
    const { orderedIds, dayId } = req.body;
    for (let i = 0; i < orderedIds.length; i++) {
      await db.query("UPDATE trip_day_pois SET position=$1 WHERE trip_day_id=$2 AND poi_id=$3", [i, dayId, orderedIds[i]]);
    }
    res.sendStatus(200);
  });

  // Update duration or other interval field of an activity
  router.post("/update_activity", async (req, res) => {
    try {
      const { value, act_id, day_id, field } = req.body;
      console.log()
      const update = await db.query(`UPDATE trip_day_pois SET ${field}=$1::interval WHERE trip_day_id=$2 AND poi_id=$3`, [value, day_id, act_id]);
      console.log(update)
      res.sendStatus(200);
    } catch (error) {
      console.error(error.message);
      res.sendStatus(500);
    }
  });

  // Add a new trip with auto-created days
  router.post("/add_trip", async (req, res) => {

    const { title, startDate, endDate } = req.body;
    try {
      const result = await db.query(
        `INSERT INTO trips (user_id, title, start_date, end_date)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [req.user.id, title, startDate, endDate]
      );

      await db.query(
        `INSERT INTO trip_days (trip_id, day_number, date, start_time)
         SELECT $1, ROW_NUMBER() OVER () - 1, date::DATE, '09:00:00'::TIME
         FROM generate_series($2::DATE, $3::DATE, interval '1 day') AS date`,
        [result.rows[0].id, result.rows[0].start_date, result.rows[0].end_date]
      );

      res.status(201).json({ result: result.rows[0] });
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  });

  // Delete a trip by ID
  router.delete("/:id", async (req, res) => {
    try {
      await db.query("DELETE FROM trips WHERE id=$1", [req.params.id]);
      res.sendStatus(204);
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  });

  return router;
};

export default tripRoutes;