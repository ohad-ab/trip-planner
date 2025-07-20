import express from "express";
import bcrypt from "bcrypt";
import passport from "passport";

const router = express.Router();

/**
 * Auth-related routes: /, /login, /logout, /register
 * @param {pg.Client} db - The connected PostgreSQL client
 */
function authRoutes(db) {
  // Get current user and their trips
  router.get("/", async (req, res) => {
    let result = [];
    if (req.isAuthenticated()) {
      result = await db.query("SELECT * FROM trips WHERE user_id = $1", [req.user.id]);
    }
    res.json({ trips: result.rows, user: req.user });
  });

  // Handle user login
  router.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.json({ success: false, message: info.message });
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json({ success: true, message: "Authentication successful", user });
      });
    })(req, res, next);
  });

  // Handle logout and session destruction
  router.post("/logout", (req, res) => {
    req.logOut({}, (err) => {
      if (err) return res.status(500).json({ success: false, message: "Logout failed" });
      req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false, message: "Session destruction failed" });
        return res.json({ success: true, message: "Logout successful" });
      });
    });
  });

  // Register new user
  router.post("/register", async (req, res) => {
    const { email, password, repeatedPassword, username } = req.body;

    try {
      const existing = await db.query("SELECT * FROM users WHERE email = $1", [email]);

      if (existing.rows.length > 0) {
        return res.json({ success: false, message: "Email already exists in the system" });
      }

      if (password !== repeatedPassword) {
        return res.status(400).json({ error: "The password was not repeated correctly" });
      }

      const hash = await bcrypt.hash(password, 10);
      const result = await db.query(
        "INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING *",
        [email, hash, username]
      );
      const user = result.rows[0];

      req.login(user, (err) => {
        if (err) return res.status(500).json({ error: "Login failed" });
        res.json({ success: true, user });
      });
    } catch (err) {
      console.error("Registration error:", err);
      res.sendStatus(500);
    }
  });

  return router;
};

export default authRoutes