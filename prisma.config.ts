import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Load from .env.local (Next.js convention)
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Check your .env.local file.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
