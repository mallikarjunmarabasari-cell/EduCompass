import axios from "axios";
import { youtube_v3 } from "googleapis";
import { google } from "googleapis";
import dotenv from "dotenv";
import * as pdfParse from "pdf-parse";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Load .env file only in development (on Render, env vars are set directly)
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Log API key status on startup
console.log(
  "🔑 GEMINI_API_KEY status:",
  GEMINI_API_KEY ? "✅ Set" : "❌ Missing",
);
console.log("🌍 Environment:", process.env.NODE_ENV || "development");

// Initialize YouTube API client
const youtubeService = {
  async getTranscript(videoId) {
    try {
      console.log("📺 Fetching transcript for video:", videoId);

      // Try to import youtube-transcript-api dynamically
      let getTranscript;
      try {
        const youtubeTranscriptApi = await import("youtube-transcript-api");
        getTranscript =
          youtubeTranscriptApi.default?.getTranscript ||
          youtubeTranscriptApi.getTranscript;
      } catch (importErr) {
        console.warn(
          "⚠️ Dynamic import failed, trying require...",
          importErr.message,
        );
        try {
          const yapi = require("youtube-transcript-api");
          getTranscript = yapi.getTranscript || yapi.default?.getTranscript;
        } catch (requireErr) {
          console.error(
            "❌ Failed to import youtube-transcript-api:",
            requireErr.message,
          );
          throw new Error("youtube-transcript-api module not available");
        }
      }

      if (!getTranscript || typeof getTranscript !== "function") {
        console.error(
          "❌ getTranscript is not a function. Module exports:",
          typeof getTranscript,
        );
        throw new Error(
          "getTranscript function not found in youtube-transcript-api",
        );
      }

      // Fetch transcript using youtube-transcript-api library
      const transcript = await getTranscript(videoId);
      const transcriptText = transcript.map((t) => t.text).join(" ");

      console.log("✅ Transcript fetched successfully");
      return transcriptText;
    } catch (error) {
      console.error("Error fetching YouTube transcript:", error.message);
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

    let filePath = pdfPath;
    if (pdfPath.startsWith("/uploads/pdfs")) {
      filePath = path.join(process.cwd(), pdfPath.slice(1));
    } else if (!path.isAbsolute(pdfPath)) {
      filePath = path.join(process.cwd(), pdfPath);
    }

    console.log("📄 Resolved PDF path:", filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found at ${filePath}`);
    }

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

function buildFallbackContent(content, contentType = "text") {
  const cleanedContent = String(content || "").trim();

  const segments = cleanedContent
    .split(/\r?\n+/)
    .flatMap((segment) =>
      segment
        .split(/(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .filter(Boolean);

  const hasUsableContent = segments.length > 0;
  const summarySource = segments.slice(0, 3).join(" ");
  const summary = hasUsableContent
    ? summarySource
    : "No usable content was provided, so this entry was added as a placeholder.";
  const keyPoints = hasUsableContent
    ? segments.slice(0, 5).map((segment) => segment.replace(/^[•\-*]\s*/, ""))
    : [];
  const flashcards = hasUsableContent
    ? segments.slice(0, 5).map((segment, index) => ({
        question: `What is the main point of item ${index + 1}?`,
        answer: segment,
      }))
    : [];

  return {
    summary,
    keyPoints,
    flashcards,
    source: "fallback",
  };
}

// Main AI content generation using Gemini with a fallback path
async function generateAIContent(content, contentType = "text") {
  const fallbackContent = buildFallbackContent(content, contentType);

  if (!GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY missing, using fallback AI content");
    return fallbackContent;
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
      source: "gemini",
    };
  } catch (error) {
    console.warn(
      "⚠️ Gemini generation failed, using fallback AI content:",
      error.message,
    );
    return fallbackContent;
  }
}

// Call Gemini API
async function callGeminiAPI(prompt) {
  try {
    // Validate API key
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
      console.error("❌ GEMINI_API_KEY is not set in environment variables");
      console.error(
        "   On Render: Add GEMINI_API_KEY to Environment Variables",
      );
      console.error("   Locally: Add GEMINI_API_KEY to .env file");
      throw new Error("GEMINI_API_KEY environment variable not configured");
    }

    console.log(
      "🔑 Using GEMINI_API_KEY: " + GEMINI_API_KEY.substring(0, 10) + "...",
    );
    console.log("📝 Prompt length:", prompt.length, "characters");

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

    console.log("✅ Gemini response received, status:", response.status);

    // Validate response structure
    if (!response.data) {
      console.error("❌ Empty response from Gemini API");
      throw new Error("Empty response from Gemini API");
    }

    if (response.data?.error) {
      console.error("❌ Gemini API returned error:", response.data.error);
      throw new Error(`Gemini API Error: ${response.data.error.message}`);
    }

    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const responseText = response.data.candidates[0].content.parts[0].text;
      console.log("✅ Successfully extracted text from Gemini response");
      return responseText;
    }

    console.error(
      "❌ Invalid response structure:",
      JSON.stringify(response.data),
    );
    throw new Error(
      "Invalid response structure from Gemini API - missing candidates/text",
    );
  } catch (error) {
    console.error("❌ Gemini API error:", error.message);

    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", JSON.stringify(error.response.data));

      // Handle specific error codes
      if (error.response.status === 401) {
        console.error("   → Invalid/expired API key");
      } else if (error.response.status === 429) {
        console.error("   → Rate limited (quota exceeded)");
      } else if (error.response.status === 400) {
        console.error(
          "   → Bad request (prompt might be too long or malformed)",
        );
      }
    } else if (error.code) {
      console.error("   Error code:", error.code);
      if (error.code === "ECONNREFUSED") {
        console.error("   → Network connection refused");
      } else if (error.code === "ENOTFOUND") {
        console.error("   → DNS resolution failed");
      } else if (error.code === "ETIMEDOUT") {
        console.error("   → Request timeout (API took too long)");
      }
    }

    // Map common failures to short error codes so callers can respond appropriately
    let code = "AI_CALL_FAILED";
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        code = "AUTH_ERROR";
      } else if (status === 429) {
        code = "RATE_LIMIT";
      } else if (status === 400) {
        code = "BAD_REQUEST";
      } else {
        code = `API_${status}`;
      }
    } else if (error.code) {
      if (error.code === "ECONNREFUSED") code = "NETWORK_ERROR";
      else if (error.code === "ENOTFOUND") code = "DNS_ERROR";
      else if (error.code === "ETIMEDOUT") code = "TIMEOUT";
    }

    const errToThrow = new Error(`Failed to call Gemini API: ${error.message}`);
    // Attach a machine-friendly code to the Error object
    errToThrow.code = code;
    throw errToThrow;
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
  buildFallbackContent,
  generateAIContent,
  extractArticleText,
  extractPDFText,
  youtubeService,
  callGeminiAPI,
};
