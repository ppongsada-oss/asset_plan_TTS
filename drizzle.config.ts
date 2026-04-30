import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "/tmp/drizzle",
  dialect: "sqlite",
  driver: "d1-http",
});
