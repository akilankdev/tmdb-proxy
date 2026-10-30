//dotenv is a package that reads the .env file and makes its values available through process.env
require("dotenv").config();
//Now our backend can access the token through process.env.TMDB_ACCESS_TOKEN

const express = require("express");
const cors = require("cors");

const app = express();

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // console.log(`Server running on Port: ${PORT}`);
  console.log("TMDB token loaded:", Boolean(process.env.TMDB_ACCESS_TOKEN));
});
