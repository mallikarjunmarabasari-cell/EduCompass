import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load .env and then .env.local so local overrides root settings
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../.env");
const envLocalPath = path.resolve(__dirname, "../../.env.local");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log("✅ Supabase client initialized");
