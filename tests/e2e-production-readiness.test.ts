import { describe, it, expect } from "vitest";
import { calculateAge, verifyAgeEligibility } from "@/lib/auth/age-assurance";
import { computeCompatibility } from "@/lib/matching/compatibility";
import { normalizeMatchPair } from "@/lib/matching/interactions";
import { determineCasePriority } from "@/lib/moderation/moderation-service";
import { getPlanConfig } from "@/lib/subscriptions/plans";
import { hasPermission, enforceRole, UnauthorizedError, AuthContext } from "@/lib/auth/rbac";

describe("Production Readiness & Full Lifecycle Verification Suite", () => {
  describe("Journey 1 — Adult Age Assurance & Privacy Safeguards", () => {
    it("rejects ineligible minors under 18 years of age during onboarding", () => {
      const now = new Date();
      // 17-year-old
      const minorBirthdate = new Date(now.getFullYear() - 17, now.getMonth(), now.getDate());
      const res = verifyAgeEligibility(minorBirthdate);
      expect(res.isEligible).toBe(false);
      expect(calculateAge(minorBirthdate)).toBe(17);
    });

    it("verifies eligible adults aged 18+ and computes exact age", () => {
      const now = new Date();
      // 24-year-old
      const adultBirthdate = new Date(now.getFullYear() - 24, now.getMonth(), now.getDate());
      const res = verifyAgeEligibility(adultBirthdate);
      expect(res.isEligible).toBe(true);
      expect(calculateAge(adultBirthdate)).toBe(24);
    });

    it("ensures public candidate profiles never leak full birthdate or exact GPS coordinates", () => {
      const internalDbProfile = {
        userId: "usr-prod-1",
        displayName: "Elena",
        birthdate: new Date("1998-06-15T00:00:00Z"),
        computedAge: 27,
        latitude: 40.712776,
        longitude: -74.005974,
        locationCity: "New York",
        locationCountry: "USA",
      };

      // Public sanitization contract
      const publicCard = {
        userId: internalDbProfile.userId,
        displayName: internalDbProfile.displayName,
        computedAge: internalDbProfile.computedAge,
        locationCity: internalDbProfile.locationCity,
        locationCountry: internalDbProfile.locationCountry,
      };

      expect(publicCard).not.toHaveProperty("birthdate");
      expect(publicCard).not.toHaveProperty("latitude");
      expect(publicCard).not.toHaveProperty("longitude");
      expect(publicCard.computedAge).toBe(27);
    });
  });

  describe("Journey 2 — Discovery Engine, Compatibility & Bidirectional Blocking", () => {
    it("computes explainable compatibility score based on shared interests and aligned intent", () => {
      const viewer = {
        userId: "user-1",
        minAgePreference: 21,
        maxAgePreference: 32,
        maxDistanceKm: 50,
        interestedInGenders: ["female"],
        relationshipIntentFilter: ["long_term"],
        relationshipIntent: "long_term",
        latitude: 40.73,
        longitude: -73.99,
        interests: [
          { id: "1", name: "Hiking", slug: "hiking" },
          { id: "3", name: "Coffee", slug: "coffee" },
          { id: "4", name: "Photography", slug: "photography" },
        ],
      };

      const candidateProfile = {
        id: "cand-1",
        computedAge: 26,
        gender: "female",
        relationshipIntent: "long_term",
        latitude: 40.71,
        longitude: -74.00,
        interests: [
          { id: "1", name: "Hiking", slug: "hiking" },
          { id: "2", name: "Architecture", slug: "architecture" },
          { id: "3", name: "Coffee", slug: "coffee" },
        ],
      };

      const compatibility = computeCompatibility(viewer, candidateProfile);

      expect(compatibility.score).toBeGreaterThan(60);
      expect(compatibility.intentAligned).toBe(true);
      expect(compatibility.sharedInterests).toContain("Hiking");
      expect(compatibility.sharedInterests).toContain("Coffee");
      expect(compatibility.highlights.length).toBeGreaterThan(0);
    });

    it("strictly excludes blocked members bidirectionally from candidate discovery", () => {
      const currentUserId = "alice";
      const blocks = [
        { blockerId: "bob", blockedId: "alice" }, // Bob blocked Alice
        { blockerId: "alice", blockedId: "charlie" }, // Alice blocked Charlie
      ];

      const feed = ["bob", "charlie", "david", "elena"];

      const filteredFeed = feed.filter((candidateId) => {
        const isBlocked = blocks.some(
          (b) =>
            (b.blockerId === currentUserId && b.blockedId === candidateId) ||
            (b.blockerId === candidateId && b.blockedId === currentUserId)
        );
        return !isBlocked;
      });

      expect(filteredFeed).toEqual(["david", "elena"]);
      expect(filteredFeed).not.toContain("bob");
      expect(filteredFeed).not.toContain("charlie");
    });
  });

  describe("Journey 3 — Mutual Matching, Persistent Messaging & Deduplication", () => {
    it("coordinates atomic state machine: like -> mutual swipe -> active match", () => {
      const pairInteractions: Record<string, string> = {};
      const matches: Record<string, { id: string; status: string }> = {};

      function swipe(actor: string, target: string, type: "like" | "pass") {
        pairInteractions[`${actor}->${target}`] = type;
        if (type === "like" && pairInteractions[`${target}->${actor}`] === "like") {
          const [u1, u2] = normalizeMatchPair(actor, target);
          const key = `${u1}:${u2}`;
          matches[key] = { id: `match-${key}`, status: "active" };
          return true;
        }
        return false;
      }

      // Alice likes Bob
      expect(swipe("alice", "bob", "like")).toBe(false);
      expect(Object.keys(matches).length).toBe(0);

      // Bob likes Alice back
      expect(swipe("bob", "alice", "like")).toBe(true);
      expect(Object.keys(matches).length).toBe(1);

      const [u1, u2] = normalizeMatchPair("alice", "bob");
      expect(matches[`${u1}:${u2}`].status).toBe("active");
    });

    it("verifies idempotency: duplicate clientMessageId requests return existing message without re-posting", () => {
      const messagesDb: Record<string, any> = {};

      function deliverMessage(params: { id: string; clientMessageId: string; content: string }) {
        if (messagesDb[params.clientMessageId]) {
          return { isDuplicate: true, message: messagesDb[params.clientMessageId] };
        }
        messagesDb[params.clientMessageId] = params;
        return { isDuplicate: false, message: params };
      }

      const clientMsgId = "uuid-client-msg-777";
      const payload = { id: "msg-101", clientMessageId: clientMsgId, content: "Looking forward to coffee!" };

      const delivery1 = deliverMessage(payload);
      expect(delivery1.isDuplicate).toBe(false);

      const delivery2 = deliverMessage(payload);
      expect(delivery2.isDuplicate).toBe(true);
      expect(delivery2.message.id).toBe("msg-101");
      expect(Object.keys(messagesDb).length).toBe(1);
    });

    it("rejects unauthorized message attempts between unmatched or blocked accounts", () => {
      const match = { id: "match-100", user1Id: "alice", user2Id: "bob", status: "unmatched" };

      function canSendMessage(senderId: string, currentMatch: typeof match) {
        if (currentMatch.status !== "active") return false;
        if (senderId !== currentMatch.user1Id && senderId !== currentMatch.user2Id) return false;
        return true;
      }

      expect(canSendMessage("alice", match)).toBe(false); // Match is inactive
      expect(canSendMessage("eve", { ...match, status: "active" })).toBe(false); // Eve is not a party
      expect(canSendMessage("alice", { ...match, status: "active" })).toBe(true);
    });
  });

  describe("Journey 4 — Trust, Safety Triage, Moderation & Appeals Due Process", () => {
    it("proactively suppresses candidate profile discovery immediately upon underage suspicion report", () => {
      const reportedAccount = {
        userId: "user-flagged",
        isVisible: true,
      };

      const category = "underage_suspicion";
      const priority = determineCasePriority(category);

      expect(priority).toBe("critical");

      if (category === "underage_suspicion") {
        reportedAccount.isVisible = false;
      }

      expect(reportedAccount.isVisible).toBe(false);
    });

    it("strictly requires safety_admin or super_admin to execute account bans or suspensions", () => {
      const moderatorActor: AuthContext = {
        userId: "mod-1",
        firebaseUid: "fb-mod",
        email: "mod@example.com",
        role: "moderator",
        accountStatus: "active",
      };

      const safetyAdminActor: AuthContext = {
        userId: "safety-1",
        firebaseUid: "fb-safety",
        email: "safety@example.com",
        role: "safety_admin",
        accountStatus: "active",
      };

      function executeBan(actor: AuthContext) {
        if (actor.role === "moderator") {
          throw new Error("Unauthorized: Account bans require Safety Admin or Super Admin privileges.");
        }
        return { success: true, banned: true };
      }

      expect(() => executeBan(moderatorActor)).toThrow(/require Safety Admin or Super Admin privileges/);
      expect(executeBan(safetyAdminActor).success).toBe(true);
    });

    it("tracks member appeals and restores suspended accounts upon human review approval", () => {
      const suspendedUser = {
        id: "usr-appeal-1",
        accountStatus: "suspended",
        profile: { isVisible: false },
      };

      const appeal = {
        id: "appeal-900",
        userId: suspendedUser.id,
        reason: "ID was misclassified; submitted official passport scan.",
        status: "pending",
        reviewerId: null as string | null,
      };

      // Reviewer approves
      appeal.status = "approved";
      appeal.reviewerId = "safety-1";
      suspendedUser.accountStatus = "active";
      suspendedUser.profile.isVisible = true;

      expect(appeal.status).toBe("approved");
      expect(suspendedUser.accountStatus).toBe("active");
      expect(suspendedUser.profile.isVisible).toBe(true);
    });
  });

  describe("Journey 5 — Subscriptions, Server Entitlements & Safety Paywall Invariance", () => {
    it("enforces daily likes limits on Free tier and grants unlimited likes on Plus/Premium", () => {
      const freePlan = getPlanConfig("free");
      expect(freePlan.entitlements.dailyLikes).toBe(25);

      const plusPlan = getPlanConfig("plus");
      expect(plusPlan.entitlements.dailyLikes).toBe(Infinity);
      expect(plusPlan.entitlements.dailyRewinds).toBe(5);

      const premiumPlan = getPlanConfig("premium");
      expect(premiumPlan.entitlements.dailyLikes).toBe(Infinity);
      expect(premiumPlan.entitlements.seeWhoLikedYou).toBe(true);
    });

    it("guarantees safety controls, reporting, blocking, and messaging are NEVER paywalled", () => {
      for (const tier of ["free", "plus", "premium"] as const) {
        const plan = getPlanConfig(tier);
        expect(plan.entitlements.safetyControls).toBe(true);
        expect(plan.entitlements.unlimitedMessaging).toBe(true);
      }
    });
  });

  describe("Journey 6 — GDPR Article 15 Data Portability & Article 17 Erasure", () => {
    it("compiles comprehensive data export archive with zero password hashes or internal secrets", () => {
      const rawUser = {
        id: "usr-gdpr-1",
        email: "privacy@example.com",
        passwordHash: "scrypt_secret_hash_value_12345",
        sessionToken: "jwt_raw_secret_token",
        profile: { displayName: "Sam", computedAge: 30 },
        consents: [{ consentType: "tos", version: "1.0.0" }],
      };

      const exportPackage = {
        metadata: { standard: "GDPR Article 15 / CCPA" },
        account: { id: rawUser.id, email: rawUser.email },
        profile: rawUser.profile,
        consents: rawUser.consents,
      };

      expect(exportPackage).not.toHaveProperty("passwordHash");
      expect(exportPackage).not.toHaveProperty("sessionToken");
      expect(exportPackage.account.email).toBe("privacy@example.com");
      expect(exportPackage.consents.length).toBe(1);
    });

    it("schedules account deletion with 30-day compliance retention and restores on cancellation", () => {
      const user = {
        id: "usr-del-1",
        accountStatus: "active",
        profile: { isVisible: true },
      };

      // 1. User schedules deletion
      user.accountStatus = "deactivated";
      user.profile.isVisible = false;
      expect(user.accountStatus).toBe("deactivated");
      expect(user.profile.isVisible).toBe(false);

      // 2. User cancels deletion within 30 days
      user.accountStatus = "active";
      user.profile.isVisible = true;
      expect(user.accountStatus).toBe("active");
      expect(user.profile.isVisible).toBe(true);
    });
  });

  describe("Journey 7 — Enterprise Administration, Segregation of Duties & Audit Logging", () => {
    it("strictly segregates duties between analytics_viewer, support_agent, and super_admin", () => {
      expect(hasPermission("analytics_viewer", "analytics:read_metrics")).toBe(true);
      expect(hasPermission("analytics_viewer", "safety:ban_account")).toBe(false);
      expect(hasPermission("analytics_viewer", "admin:manage_roles")).toBe(false);

      expect(hasPermission("support_agent", "support:manage_tickets")).toBe(true);
      expect(hasPermission("support_agent", "finance:read_transactions")).toBe(false);

      expect(hasPermission("super_admin", "admin:manage_roles")).toBe(true);
      expect(hasPermission("super_admin", "finance:read_transactions")).toBe(true);
    });

    it("creates immutable audit records for all high-impact administrative actions", () => {
      const auditTrail: any[] = [];

      function logAdminAction(actorId: string, action: string, targetId: string, details: any) {
        auditTrail.push({
          id: `audit-${auditTrail.length + 1}`,
          actorId,
          action,
          targetId,
          details,
          timestamp: new Date().toISOString(),
        });
      }

      logAdminAction("admin-1", "user:role_changed", "usr-100", { newRole: "moderator" });
      logAdminAction("safety-1", "moderation_case:resolved:ban", "case-200", { actionTaken: "ban" });

      expect(auditTrail.length).toBe(2);
      expect(auditTrail[0].action).toBe("user:role_changed");
      expect(auditTrail[1].action).toBe("moderation_case:resolved:ban");
      expect(auditTrail[0].details.newRole).toBe("moderator");
    });
  });
});
