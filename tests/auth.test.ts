import { describe, it, expect } from "vitest";
import { calculateAge, verifyAgeEligibility } from "@/lib/auth/age-assurance";
import { verifySession } from "@/lib/auth/session";

describe("Authentication & 18+ Age Assurance Suite", () => {
  it("calculates age accurately across leap years and month boundaries", () => {
    const today = new Date("2026-10-14");

    // Born 2008-10-14 -> Exactly 18 today
    expect(calculateAge(new Date("2008-10-14"), today)).toBe(18);

    // Born 2008-10-15 -> 17 years and 364 days (Turns 18 tomorrow)
    expect(calculateAge(new Date("2008-10-15"), today)).toBe(17);

    // Born 2000-01-01 -> 26 years old
    expect(calculateAge(new Date("2000-01-01"), today)).toBe(26);
  });

  it("strictly rejects applicant under 18 years old", () => {
    // 17-year old applicant
    const result = verifyAgeEligibility("2009-05-15");
    expect(result.isEligible).toBe(false);
    expect(result.computedAge).toBeLessThan(18);
    expect(result.reason).toContain("18 years of age or older");
  });

  it("approves eligible adult applicant (>= 18 years old)", () => {
    const result = verifyAgeEligibility("2000-04-12");
    expect(result.isEligible).toBe(true);
    expect(result.computedAge).toBeGreaterThanOrEqual(18);
    expect(result.reason).toBeUndefined();
  });

  it("rejects future or malformed birthdates", () => {
    const futureResult = verifyAgeEligibility("2030-01-01");
    expect(futureResult.isEligible).toBe(false);
    expect(futureResult.reason).toContain("future");

    const invalidResult = verifyAgeEligibility("not-a-date");
    expect(invalidResult.isEligible).toBe(false);
    expect(invalidResult.reason).toContain("Invalid date format");
  });

  it("rejects empty or missing session cookie", async () => {
    const session = await verifySession("");
    expect(session).toBeNull();
  });
});
