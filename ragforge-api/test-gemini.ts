import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
    throw new Error(
        "GEMINI_API_KEY is missing. Set it in be/.env or in the environment.",
    );
}

const ai = new GoogleGenAI({
    apiKey,
});

const response =
    await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "What is RAG?",
    });

console.log(response.text);