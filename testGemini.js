require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function testGemini() {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: "Recommend 1 science fiction movie.",
  });

  console.log(response.text);
}

testGemini();