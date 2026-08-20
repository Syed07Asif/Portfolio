/**
 * Loads .env.local so the data-layer tests reach the same Supabase stack the
 * dev server does. `dotenv/config` alone reads `.env`, which this project
 * does not use — the real keys live in `.env.local` (gitignored).
 */
import { config } from "dotenv";

config({ path: ".env.local" });
