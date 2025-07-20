import express from "express";
import bodyParser from "body-parser";
import cors from 'cors';
import axios from "axios";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import connectPgSimple from 'connect-pg-simple';
import NodeCache from "node-cache";

const app = express();
const port = process.env.PORT || 5000;
const API_URL = "https://api.geoapify.com"
const saltRounds = 10;
const routeCache = new NodeCache({stdTTL: 60 * 60, checkperiod:600});
const TTL = 1000 * 60 * 60;
env.config();
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

const PgSession = connectPgSimple(session);


app.use(
  session({
    store: new PgSession({pool: db}),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie:{
      maxAge:1000*60*60*24
    }
  })
);



app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(passport.initialize());
app.use(passport.session());

// app.get('*', (req,res)=>{
//   res.sendFile(path.join(__dirname,'client/dist', 'index.html'))
// });

app.get('/', async (req, res) => {
  let result = [];
  if(req.isAuthenticated())
    {
      result = await db.query("SELECT * FROM trips WHERE user_id = $1",[req.user.id]);
      // shows = result.rows;
    }
  res.json({trips:result.rows, user: req.user});
})

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
      if (err) {
          return next(err);
      }
      if (!user) {
          return res.json({ success: false, message: info.message });
      }
      req.logIn(user, (err) => {
          if (err) {
              return next(err);
          }
          return res.json({ success: true, message: 'Authentication successful', user });
      });
  })(req, res, next);
});

app.post('/logout', (req,res)=>{
  req.logOut({}, (err)=>{
    if(err){
      console.log(err);
    }
    req.session.destroy((err) => {
      if (err) {
        console.log('Error during session destruction:', err);
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }
      console.log('Logout successful, session destroyed.');
      return res.json({ success: true, message: 'Logout successful' });
    });
  });
})

app.post('/register', async (req,res)=>{
  const email = req.body.email;
  const password = req.body.password;
  const repeatedPassword = req.body.repeatedPassword;
  const name = req.body.username;
  console.log(email)

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.json({success: false, message:"Email already exists in the system"});
    } else if(password === repeatedPassword){
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING *",
            [email, hash, name]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.json({success: true, user});
          });
        }
      });
    }
    else{
      res.status(400).json({error: 'The password was not repeated correctly'})
    }
  } catch (err) {
    console.log(err);
  }
})

app.get('/trips/:id', async (req, res)=>{
  try {
    const trip = await db.query("SELECT * FROM trips WHERE user_id=$1 AND id=$2",[req.user.id, req.params.id]);
    const day = await db.query("SELECT id FROM trip_days WHERE trip_id=$1 AND day_number=0",[req.params.id]);
    const activities = await db.query("SELECT pois.*, trip_day_pois.duration, trip_day_pois.id AS trip_day_poi_id FROM pois JOIN trip_day_pois ON pois.id=trip_day_pois.poi_id JOIN trip_days ON trip_day_pois.trip_day_id=trip_days.id  WHERE trip_days.trip_id=$1 AND trip_days.day_number=0 ORDER BY trip_day_pois.position ASC",[req.params.id]);
    res.json({trip:trip.rows[0], day:day.rows[0].id, activities:activities.rows});
  } catch (error) {
      console.error("Database error:",error.message);
      res.status(504);
  }
});

app.get('/trips/:id/itinerary',async (req,res)=>{
  try {
    const acts = await db.query('SELECT tdp.id AS trip_day_poi_id, pois.*, td.day_number, td.start_time, tdp.duration FROM pois JOIN trip_day_pois AS tdp ON pois.id=tdp.poi_id JOIN trip_days AS td ON td.id=tdp.trip_day_id WHERE td.trip_id = $1 ORDER BY td.day_number ASC, tdp.position ASC',[req.params.id]);
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

    for(let dayActs of actsPerDay){
      const dayEstimates = [];

      for(let i = 0; i<dayActs.length-1; i++){
        const from = dayActs[i];
        const to = dayActs[i+1];
        const key = `${from.lat},${from.lon}|${to.lat},${to.lon}`;
        if(routeCache.has(key)){
          console.log('Cache HIT '+key)
          dayEstimates.push(routeCache.get(key))
        }
        else{
          console.log("fetching from api")
          const response = await axios.get('https://api.geoapify.com/v1/routing', {params:{waypoints: key, mode: "drive", apiKey: process.env.API_KEY}});
              const props = response.data.features?.[0]?.properties;
              if(props){
                const estimate =  {from:from.name, to:to.name, distance: props.distance, time: props.time };
                routeCache.set(key, estimate);
                dayEstimates.push(estimate);
              }
              else{
                dayEstimates.push(null);
              }
        }
      }
      allDayEstimates.push(dayEstimates)

    }
    res.json({actsPerDay:actsPerDay, routeEstimates:allDayEstimates })
  } catch (error) {
      console.error("Database error:",error.message);
      res.status(500).json({ error: "Failed to fetch itinerary" });
  }
})

app.get('/trips/:id/trip_day', async(req, res)=>{
  try {
    const day = await db.query("SELECT id FROM trip_days WHERE trip_id=$1 AND day_number=$2",[req.params.id, req.query.day]);
    const activities = await db.query("SELECT pois.*, trip_day_pois.duration, trip_day_pois.id AS trip_day_poi_id FROM pois JOIN trip_day_pois ON pois.id=trip_day_pois.poi_id JOIN trip_days ON trip_day_pois.trip_day_id=trip_days.id  WHERE trip_days.trip_id=$1 AND trip_days.day_number=$2 ORDER BY trip_day_pois.position ASC",[req.params.id, req.query.day]);
    res.json({day:day.rows[0].id, activities:activities.rows});
  } catch (error) {
    console.error("Database error:",error.message);
    res.status(504);
  }
});

app.post('/update_poi_order',async (req,res)=>{
  const newOrder = req.body.orderedIds;
  const dayId = req.body.dayId;
  console.log(newOrder, dayId)

  for(let i = 0; i < newOrder.length; i++){
    await db.query('UPDATE trip_day_pois SET position=$1 WHERE trip_day_id=$2 AND poi_id=$3',[i,dayId, newOrder[i]]);
  }
  res.sendStatus(200);
});

app.post('/update_activity',async (req,res)=>{
  try {
    console.log(req.body.value, req.body.act_id, req.body.day_id)
    const result = await db.query(`UPDATE trip_day_pois SET ${req.body.field}=$1::interval WHERE trip_day_id=$2 AND poi_id=$3`,[req.body.value, req.body.day_id, req.body.act_id]);
    res.sendStatus(200)
  } catch (error) {
    console.error(error.message);
    res.sendStatus(500);
  }
})

app.post('/search',async (req,res)=>{
  try {
    const coords = await axios.get(`${API_URL}/v1/geocode/search?text=${req.query.place}&apiKey=${process.env.API_KEY}`)
    const lat = coords.data.features[0].properties.lat;
    const lon = coords.data.features[0].properties.lon;
    console.log(lat, lon)
    console.log(req.query)
    const pois = await axios.get(`${API_URL}/v2/places?categories=${req.query.category}&filter=circle:${lon},${lat},1000&apiKey=${process.env.API_KEY}`)
    res.status(200).json({pois:pois.data.features, center:[lat,lon]});
  } catch (err) {
    console.error('Geoapify API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch POIs from Geoapify' });
  }
})

app.post('/marker', async (req,res)=>{
  try {
    
  } catch (error) {
    
  }
})

app.post('/poi', async (req, res)=>{
  try {
    const result = await db.query("INSERT INTO pois(name, lat, lon, kind) VALUES ($1,$2,$3,$4) RETURNING id",[req.body.name, req.body.lat, req.body.lon, req.body?.cat]);
    const inserted =  await db.query('INSERT INTO trip_day_pois(trip_day_id, poi_id, position) VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM trip_day_pois WHERE trip_day_id = $1),0))',[req.body.day, result.rows[0].id]);
    
    res.status(200).json({id: result.rows[0].id, position:inserted.rows[0].position});
  } catch (error) {
    console.error("Database error:",error.message)
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.delete('/poi', async (req,res)=>{
  try {
    console.log(req.body)
    const result = await db.query('DELETE FROM pois WHERE id=$1',[req.body.id]);
    res.sendStatus(200);
  } catch (error) {
    console.error(error.message);
    res.sendStatus(500);
  }
})


app.post('/add_trip', async (req,res)=>{
  const trip = req.body;
  try {
      const result = await db.query('INSERT INTO trips (user_id, title, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *', [req.user.id, trip.title, trip.startDate, trip.endDate]);
      await db.query("INSERT INTO trip_days (trip_id, day_number, date, start_time) SELECT $1 AS trip_id, ROW_NUMBER() OVER () - 1 AS day_number, date::DATE FROM generate_series($2::DATE, $3::DATE, interval '1 day') AS date, '09:00:00'::TIME AS start_time",[result.rows[0].id, result.rows[0].start_date, result.rows[0].end_date])
      res.status(201).json({result:result.rows[0]});
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.delete('/trips/:id',async (req,res)=>{
  try {
    const result = await db.query('DELETE FROM trips WHERE id=$1',[req.params.id]);
    res.sendStatus(204);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
})


passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            //Error with password check
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              //Passed password check
              return cb(null, user);
            } else {
              //Did not pass password check
              return cb(null, false, {message: "Incorrect password"});
            }
          }
        });
      } else {
        return cb(null, false, { message: "User not found" });
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, ()=>{
  console.log(`server is listening on port ${port}`)
});