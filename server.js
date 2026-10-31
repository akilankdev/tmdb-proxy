require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

const TMDB_BASE_URL = "https://api.themoviedb.org/3/";

//Copied from TMDB API DOCUMENTATION
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
      "https://localhost:3000/",
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
      res.status(error.status || 502);
      //sends the response to frontend
      res.json({
        error: "Unable to connect to TMDB servers",
      });
    }
  };
};

//we are actually passing an actual function here as an argument.This is function currying.
const handleDynamicTMDBRequest = (endpointBuilder) => {
  return async (req, res, next) => {
    try {
      //endpointBuilder is a Fn that gives us the correct dynamic URL path for that specific movie.
      const endpoint = endpointBuilder(req);
      const result = await fetchFromTMDB(endpoint);
      res.json(result);
    } catch (error) {
      console.error("TMDB error: " + error.message);
      res.status(error.status || 502).json({
        error: "Unable to connect to TMDB servers",
      });
    }
  };
};

app.get("/movie/:movieId/videos",handleDynamicTMDBRequest(
  //here,the below callback fn is the 'endpointBuilder(req)' which is called inside handleDynamicTMDBRequest() fn.
  (req) => "movie/"+ req.params.movieId +"/videos?language=en-US"
));

app.get(
  "/top-rated",
  handleTMDBRequest("movie/top_rated?language=en-US&page=1"),
);
app.get("/upcoming", handleTMDBRequest("movie/upcoming?language=en-US&page=1"));
app.get("/popular", handleTMDBRequest("movie/popular?language=en-US&page=1"));
app.get(
  "/now-playing",
  handleTMDBRequest("movie/now_playing?language=en-US&page=1"),
);
app.get(
  "/rated-shows",
  handleTMDBRequest("tv/top_rated?language=en-US&page=1"),
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port: " + PORT);
});
