import express from "express";

function poiRoutes(db) {
  const router = express.Router();

 // Add a new POI and link it to a trip day
router.post("/", async (req, res) => {
  try {
    const { name, lat = null, lon = null, cat, day } = req.body;

    if (!name || !day) {
      return res.status(400).json({ error: "Name and day are required" });
    }
    
    // Insert new POI
    const result = await db.query(
      "INSERT INTO pois(name, lat, lon, kind) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, lat, lon, cat]
    );
    const poiId = result.rows[0].id;

    // Link POI to trip day, assign next position
    const inserted = await db.query(
      `INSERT INTO trip_day_pois(trip_day_id, poi_id, position)
       VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM trip_day_pois WHERE trip_day_id = $1), 0))
       RETURNING position`,
      [day, poiId]
    );

    res.status(200).json({ id: poiId, position: inserted.rows[0].position });
  } catch (error) {
    console.error("Add POI error:", error.message);
    res.status(500).json({ error: "Failed to add POI" });
  }
});

  // Delete a POI by id
  router.delete("/", async (req, res) => {
    try {
      const { id } = req.body;
      await db.query("DELETE FROM pois WHERE id = $1", [id]);
      res.sendStatus(200);
    } catch (error) {
      console.error("Delete POI error:", error.message);
      res.sendStatus(500);
    }
  });

  // Update POI details (extend as needed)
  // Could add PUT/PATCH routes here

  return router;
}

export default poiRoutes;