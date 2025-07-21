import express from "express";
import axios from "axios";

function searchRoutes(){
  const router = express.Router();
  const API_URL = "https://api.geoapify.com";

  router.post("/", async (req, res) => {
    try {
      const coords = await axios.get(`${API_URL}/v1/geocode/search`, {
        params: {
          text: req.query.place,
          apiKey: process.env.API_KEY,
        },
      });

      const lat = coords.data.features[0]?.properties.lat;
      const lon = coords.data.features[0]?.properties.lon;

      if (!lat || !lon) {
        return res.status(404).json({ error: "Place not found" });
      }

      const pois = await axios.get(`${API_URL}/v2/places`, {
        params: {
          categories: req.query.category,
          filter: `circle:${lon},${lat},1000`,
          apiKey: process.env.API_KEY,
        },
      });

      res.status(200).json({ pois: pois.data.features, center: [lat, lon] });
    } catch (err) {
      console.error("Geoapify API error:", err.response?.data || err.message);
      res.status(500).json({ error: "Failed to fetch POIs from Geoapify" });
    }
  });
  return router;
}


export default searchRoutes;