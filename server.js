require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenAI, Type } = require("@google/genai");

const app = express();

const TMDB_BASE_URL = "https://api.themoviedb.org/3/";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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
      "http://localhost:3000",
      "https://netflix-gpt-flax-zeta.vercel.app",
    ],
  }),
);

app.use(express.json());

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

const searchMoviesOnTMDB = async (movieTitle) => {
  // Use encodeURIComponent to safely handle spaces and special characters
  const encodedQuery = encodeURIComponent(movieTitle + "dfsaf");
  const endpoint = `search/movie?query=${encodedQuery}&include_adult=false&language=en-US&page=1`;
  const results = await fetchFromTMDB(endpoint);
  console.log("Searching for the title: " + movieTitle);
  // If TMDB returns an unexpected response without a results property, movies.filter() will throw an error.Thats why [] is used as a fallback
  const movies = results?.results || [];
  //Finding the movies which match the exact title.
  const exactMatches = movies.filter(
    (movie) =>
      movie.title.toLowerCase() === movieTitle.toLowerCase() ||
      movie.original_title.toLowerCase() === movieTitle.toLowerCase(),
  );

  // 2. If we found exact matches, let's process them
  if (exactMatches.length > 0) {
    // Sort by popularity (highest first) so
    // the most well-known movie is always at the top
    exactMatches.sort((a, b) => b.popularity - a.popularity);
    // If there are more than 3, slice it down to the top 3 most popular ones
    return exactMatches.length > 3 ? exactMatches.slice(0, 3) : exactMatches;
  }

  return movies.length > 0 ? [movies[0]] : [];
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

//TMDB SEARCH ROUTE
app.get("/search", async (req, res) => {
  try {
    //'movie' field in query is just a developer chosen name
    const query = req.query.movie;
    //handling empty queries like "" or "   "
    if (!query || !query.trim()) {
      return res.status(400).json({
        error: "Search query is required",
      });
    }
    const results = await searchMoviesOnTMDB(query);
    res.json(results);
  } catch (error) {
    console.error("Failed to fetch search results :" + error.message);
    res.status(502).json({
      error: "Unable to reach TMDB server",
    });
  }
});

//For getting movie related Videos
app.get(
  "/movie/:movieId/videos",
  handleDynamicTMDBRequest(
    //here,the below callback fn is the 'endpointBuilder(req)' which is called inside handleDynamicTMDBRequest() fn.
    (req) => "movie/" + req.params.movieId + "/videos?language=en-US",
  ),
);

//For getting Show Details
app.get(
  "/tv/:seriesId",
  handleDynamicTMDBRequest(
    //here,the below callback fn is the 'endpointBuilder(req)' which is called inside handleDynamicTMDBRequest() fn.
    (req) => "tv/" + req.params.seriesId + "?language=en-US",
  ),
);
//For getting Show related Videos
app.get(
  "/tv/:seriesId/videos",
  handleDynamicTMDBRequest(
    //here,the below callback fn is the 'endpointBuilder(req)' which is called inside handleDynamicTMDBRequest() fn.
    (req) => "tv/" + req.params.seriesId + "/videos?language=en-US",
  ),
);

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

app.post("/gemini-recommendations", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    //Validate the prompt
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt is required",
      });
    }
    //send prompt to Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `Recommend exactly 5 movies based on this request: ${prompt}.
      Make sure every recommendation is relevant to the user's request.If the user mentions an actor, recommend movies in which that actor actually appears.Do not recommend movies based only on similarities in their titles.`,
      //config ensures the AI response is always an JSON type
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            //'movies' property will have array of recommended movie titles
            movies: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
          },

          required: ["movies"],
        },
      },
    });
    //Send Gemini generated text to the client
    // JSON.parse() converts that Raw string into a JavaScript object.
    const geminiMovieTitles = JSON.parse(response.text).movies;

    const moviePromises = await Promise.allSettled(
      geminiMovieTitles.map(async (movieTitle) => {
        const movies = await searchMoviesOnTMDB(movieTitle);
        return {
          geminiTitle: movieTitle,
          movies: movies,
        };
      }),
    );

    const movieGroups = moviePromises.map((promise, index) => {
      if (promise.status === "fulfilled") {
        return promise.value;
      }
      //Gemini titles array and Promise array are always in same order
      //,so thats why we used promise index for to access geminititles array value.
      //If promise is rejected,then apply the code ahead.
      console.error(
        `TMDB search failed for ${geminiMovieTitles[index]}: ${promise.reason}`,
      );

      return {
        geminiTitle: geminiMovieTitles[index],
        movies: [],
      };
    });

    //Sending both search titles and movie groups to client
    res.json({
      geminiMovieTitles: geminiMovieTitles,
      movieGroups: movieGroups,
    });
  } catch (error) {
    console.error("Gemini Error: " + error.message);
    let errorMessage = error.message;
    let statusCode = error.status || 502;
    try {
      const parsedError = JSON.parse(error.message);
      errorMessage = parsedError.error.message;
      statusCode = parsedError.error.code || statusCode;
    } catch (parseError) {
      //Leave it empty
    }
    res.status(statusCode).json({
      error: errorMessage,
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port: " + PORT);
});
