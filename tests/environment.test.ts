import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Environment Separation & Secret Hygiene Suite", () => {
  it("ensures sensitive server credentials are never exposed via NEXT_PUBLIC_ prefix", () => {
    const envExamplePath = path.resolve(process.cwd(), ".env.example");
    const content = fs.readFileSync(envExamplePath, "utf-8");

    // Check that private keys and database URLs are NOT prefixed with NEXT_PUBLIC_
    expect(content).toMatch(/^DATABASE_URL=/m);
    expect(content).not.toMatch(/^NEXT_PUBLIC_DATABASE_URL=/m);

    expect(content).toMatch(/^FIREBASE_PRIVATE_KEY=/m);
    expect(content).not.toMatch(/^NEXT_PUBLIC_FIREBASE_PRIVATE_KEY=/m);

    expect(content).toMatch(/^SESSION_SECRET=/m);
    expect(content).not.toMatch(/^NEXT_PUBLIC_SESSION_SECRET=/m);
  });

  it("verifies .gitignore strictly ignores .env secrets and credentials", () => {
    const gitignorePath = path.resolve(process.cwd(), ".gitignore");
    const content = fs.readFileSync(gitignorePath, "utf-8");

    expect(content).toContain(".env");
    expect(content).toContain(".env.local");
    expect(content).toContain("*.pem");
    expect(content).toContain("*.key");
    expect(content).toContain("service-account*.json");
  });

  it("verifies required configuration keys exist in .env.example", () => {
    const envExamplePath = path.resolve(process.cwd(), ".env.example");
    const content = fs.readFileSync(envExamplePath, "utf-8");

    const requiredKeys = [
      "NEXT_PUBLIC_APP_URL",
      "DATABASE_URL",
      "DIRECT_URL",
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
      "GCS_BUCKET_NAME",
      "SESSION_SECRET",
    ];

    for (const key of requiredKeys) {
      expect(content).toContain(key);
    }
  });
});
