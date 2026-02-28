import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Load from .env.local (Next.js convention)
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
