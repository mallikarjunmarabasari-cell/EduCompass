import axios from "axios";
import { youtube_v3 } from "googleapis";
import { google } from "googleapis";
import dotenv from "dotenv";
import * as pdfParse from "pdf-parse";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { getTranscript } = require("youtube-transcript-api");

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Initialize YouTube API client
const youtubeService = {
  async getTranscript(videoId) {
    try {
      console.log("📺 Fetching transcript for video:", videoId);

      // Fetch transcript using youtube-transcript-api library
      const transcript = await getTranscript(videoId);
      const transcriptText = transcript.map((t) => t.text).join(" ");

      console.log("✅ Transcript fetched successfully");
      return transcriptText;
    } catch (error) {
      console.error("Error fetching YouTube transcript:", error);
      throw new Error("Failed to fetch YouTube transcript");
    }
  },

  extractVideoId(url) {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  },
};

// Article text extraction using fetch and basic HTML parsing
async function extractArticleText(url) {
  try {
    console.log("📄 Extracting article text from:", url);

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    // Basic HTML text extraction - remove scripts, styles, and excessive whitespace
    let text = response.data
      .replace(/<script[^>]*>.*?<\/script>/gs, "")
      .replace(/<style[^>]*>.*?<\/style>/gs, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Limit to first 5000 characters for API efficiency
    return text.substring(0, 5000);
  } catch (error) {
    console.error("Error extracting article text:", error.message);
    throw new Error("Failed to extract article text");
  }
}

// PDF text extraction
async function extractPDFText(pdfPath) {
  try {
    console.log("📄 Extracting text from PDF:", pdfPath);

    // Read the PDF file
    const filePath = path.join(process.cwd(), pdfPath);
    const fileBuffer = fs.readFileSync(filePath);

    // Parse PDF - pdfParse.default is the actual function when using import * as pdfParse
    const data = await pdfParse.default(fileBuffer);

    // Extract text from all pages
    let extractedText = data.text;

    // Clean up the text
    extractedText = extractedText
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim();

    // Limit to first 5000 characters for API efficiency
    const limitedText = extractedText.substring(0, 5000);

    console.log(
      `✅ PDF text extracted successfully (${limitedText.length} characters)`,
    );

    return limitedText;
  } catch (error) {
    console.error("Error extracting PDF text:", error.message);
    throw new Error("Failed to extract PDF text");
  }
}

// Main AI content generation using Gemini
async function generateAIContent(content, contentType = "text") {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured in environment variables");
  }

  try {
    console.log("🤖 Generating AI content using Gemini...");

    // Generate summary
    const summaryResponse = await callGeminiAPI(
      `Summarize the following ${contentType} in exactly 5 concise sentences:\n\n${content}`,
    );
    const summary = summaryResponse;

    // Generate key points
    const keyPointsResponse = await callGeminiAPI(
      `Extract 5 main takeaways from the following ${contentType} as bullet points:\n\n${content}`,
    );
    const keyPoints = parseKeyPoints(keyPointsResponse);

    // Generate flashcards
    const flashcardsResponse = await callGeminiAPI(
      `Generate 5 Q&A pairs for revision based on the following ${contentType}. Format as JSON array with {question, answer} objects:\n\n${content}`,
    );
    const flashcards = parseFlashcards(flashcardsResponse);

    return {
      summary,
      keyPoints,
      flashcards,
    };
  } catch (error) {
    console.error("❌ Error generating AI content:", error.message);
    throw error;
  }
}

// Call Gemini API
async function callGeminiAPI(prompt) {
  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      },
      {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text;
    }

    throw new Error("Invalid response from Gemini API");
  } catch (error) {
    console.error("Gemini API error:", error.message);
    throw new Error(`Failed to call Gemini API: ${error.message}`);
  }
}

// Parse key points from AI response
function parseKeyPoints(response) {
  try {
    // Split by newlines and filter bullet points
    const lines = response
      .split("\n")
      .map((line) => line.replace(/^[•\-*]\s+/, "").trim())
      .filter((line) => line.length > 0 && line.length < 200);

    return lines.slice(0, 5);
  } catch {
    return [];
  }
}

// Parse flashcards from AI response
function parseFlashcards(response) {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: parse manually from text
    const pairs = [];
    const parts = response.split(/(?:Q|Q\.|Question|Question\s*\d+)[:\s]+/i);

    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i] && parts[i + 1]) {
        const questionMatch = parts[i].match(/([^A]+?)(?=A[:\s]|Answer)/i);
        const answerMatch = parts[i + 1]?.match(/([^Q]+?)(?=Q|$)/i);

        if (questionMatch && answerMatch) {
          pairs.push({
            question: questionMatch[1].trim(),
            answer: answerMatch[1].trim(),
          });
        }
      }
    }

    return pairs.slice(0, 5);
  } catch (error) {
    console.error("Error parsing flashcards:", error);
    return [];
  }
}

export {
  generateAIContent,
  extractArticleText,
  extractPDFText,
  youtubeService,
  callGeminiAPI,
};
