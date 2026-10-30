// express imports the Express package.
// cors imports the CORS package.

const express = require("express");
const cors = require("cors");

// express() creates an Express application instance.
// Think of 'app' as our backend application. We'll use it to define routes and start the server.
const app = express();

//Here, we're allowing your local development environment and deployed frontend to communicate with our backend.
app.use(
  cors({
    origin: [
      "https://localhost:3000",
      "https://netflix-gpt-flax-zeta.vercel.app/",
    ],
  }),
);

//when someone visits your backend's root URL, they'll receive:TMDB Proxy Server is running!
app.get("/",(req, res) => {
  res.send("TMDB Proxy server is running!");
});


// process.env.PORT allows hosting platforms such as Render to provide their own port.
// || 5000 means we'll use port 5000 when no environment port is provided.
// app.listen() starts our server and makes it listen for incoming requests.
const PORT = process.env.PORT || 5000;

app.listen(PORT,() => {
  console.log(`Server running on Port: ${PORT}`);
});
