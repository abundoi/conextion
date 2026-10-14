import { config } from "dotenv";
import path from "path";

// Load test environment
config({ path: path.resolve(process.cwd(), ".env.test") });

// Ensure NODE_ENV is test
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
