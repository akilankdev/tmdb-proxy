require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

const TMDB_BASE_URL = "https://api.themoviedb.org/3/";

const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
  },
};

app.use(
  cors({
    origin: [
      "https://localhost:3000",
      "https://netflix-gpt-flax-zeta.vercel.app/",
    ],
  }),
);

app.get("/", (req, res) => {
  res.send("TMDB Proxy server is running!");
});

const fetchFromTMDB = async (endpoint) => {
  const response = await fetch(TMDB_BASE_URL + endpoint, API_OPTIONS);
  if (!response.ok) {
    const error = new Error("TMDB request failed");
    error.status = response.status;
    throw error;
  }
  return response.json();
};
const handleTMDBRequest = (endpoint) => {
  return async (req, res) => {
    try {
      const result = await fetchFromTMDB(endpoint);
      res.json(result);
    } catch (error) {
      console.error("TMDB error: ", error.message);
      res.status(error.status || 502).json({
        error: "Unable to connect to TMDB servers",
      });
    }
  };
};

app.get("/top-rated",handleTMDBRequest("movie/top_rated?language=en-US&page=1"));
app.get("/upcoming",handleTMDBRequest("movie/upcoming?language=en-US&page=1"));
app.get("/popular",handleTMDBRequest("movie/popular?language=en-US&page=1"));
app.get("/now-playing",handleTMDBRequest("movie/now_playing?language=en-US&page=1"));
app.get("/rated-shows",handleTMDBRequest("tv/top_rated?language=en-US&page=1"));

// app.get("/popular", async (req, res) => {
//   try {
//     const response = await fetch(
//       "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1",
//       API_OPTIONS,
//     );

//     // Check whether TMDB returned a successful response
//     if (!response.ok) {
//       console.error("TMDB response status", response.status);

//       return res.status(response.status).json({
//         error: "Failed to fetch popular movies from TMDB",
//       });
//     }
//     const data = await response.json();
//     // Send TMDB's movie data to our frontend
//     res.json(data);
//   } catch (error) {
//     console.error("Unable to connect to TMDB Servers");

//     res.status(502).json({
//       error: "Unable to connect to TMDB Servers",
//     });
//   }
// });

const PORT = process.env.PORT || 5000;

// Binding to 0.0.0.0 allows Render to receive external requests.
app.listen(PORT, "0.0.0.0", () => {
  // console.log(`Server running on Port: ${PORT}`);
  console.log("Server running on port: " + PORT);
});
