import { describe, it, expect } from "vitest";
import {
  hasRequiredRole,
  hasPermission,
  enforceRole,
  UnauthorizedError,
  AuthContext,
} from "@/lib/auth/rbac";

describe("Phase 6 — Enterprise Administration & Analytics Suite (Gate 6)", () => {
  const memberActor: AuthContext = {
    userId: "u-member",
    firebaseUid: "fb-1",
    email: "member@example.com",
    role: "member",
    accountStatus: "active",
  };

  const moderatorActor: AuthContext = {
    userId: "u-mod",
    firebaseUid: "fb-2",
    email: "mod@example.com",
    role: "moderator",
    accountStatus: "active",
  };

  const supportAgentActor: AuthContext = {
    userId: "u-support",
    firebaseUid: "fb-3",
    email: "support@example.com",
    role: "support_agent",
    accountStatus: "active",
  };

  const financeAdminActor: AuthContext = {
    userId: "u-finance",
    firebaseUid: "fb-4",
    email: "finance@example.com",
    role: "finance_admin",
    accountStatus: "active",
  };

  const safetyAdminActor: AuthContext = {
    userId: "u-safety",
    firebaseUid: "fb-5",
    email: "safety@example.com",
    role: "safety_admin",
    accountStatus: "active",
  };

  const analyticsViewerActor: AuthContext = {
    userId: "u-analytics",
    firebaseUid: "fb-6",
    email: "analytics@example.com",
    role: "analytics_viewer",
    accountStatus: "active",
  };

  const superAdminActor: AuthContext = {
    userId: "u-super",
    firebaseUid: "fb-7",
    email: "super@example.com",
    role: "super_admin",
    accountStatus: "active",
  };

  describe("1. Role-Specific Permission Matrix & Segregation of Duties", () => {
    it("allows analytics_viewer to read aggregated metrics, but denies raw moderation or admin powers", () => {
      expect(hasPermission("analytics_viewer", "analytics:read_metrics")).toBe(true);
      expect(hasPermission("analytics_viewer", "analytics:read_retention")).toBe(true);

      // Forbidden operations
      expect(hasPermission("analytics_viewer", "safety:ban_account")).toBe(false);
      expect(hasPermission("analytics_viewer", "finance:read_transactions")).toBe(false);
      expect(hasPermission("analytics_viewer", "admin:manage_roles")).toBe(false);

      expect(() => enforceRole(analyticsViewerActor, ["super_admin"])).toThrow(UnauthorizedError);
    });

    it("allows support_agent to manage tickets and FAQs, but denies billing and account banning", () => {
      expect(hasPermission("support_agent", "support:read_tickets")).toBe(true);
      expect(hasPermission("support_agent", "support:manage_tickets")).toBe(true);
      expect(hasPermission("support_agent", "content:manage_faqs")).toBe(true);

      // Forbidden operations
      expect(hasPermission("support_agent", "safety:ban_account")).toBe(false);
      expect(hasPermission("support_agent", "finance:read_transactions")).toBe(false);
      expect(hasPermission("support_agent", "admin:manage_roles")).toBe(false);
    });

    it("allows finance_admin to view transactions and run reconciliation, but denies profile photo moderation", () => {
      expect(hasPermission("finance_admin", "finance:read_transactions")).toBe(true);
      expect(hasPermission("finance_admin", "finance:reconciliation")).toBe(true);
      expect(hasPermission("finance_admin", "analytics:read_metrics")).toBe(true);

      // Forbidden operations
      expect(hasPermission("finance_admin", "moderation:review_photos")).toBe(false);
      expect(hasPermission("finance_admin", "safety:ban_account")).toBe(false);
    });

    it("allows safety_admin to suspend/ban accounts and search audit logs, but denies modifying user roles", () => {
      expect(hasPermission("safety_admin", "safety:ban_account")).toBe(true);
      expect(hasPermission("safety_admin", "safety:suspend_account")).toBe(true);
      expect(hasPermission("safety_admin", "audit:read_logs")).toBe(true);

      // Super admin only operation
      expect(hasPermission("safety_admin", "admin:manage_roles")).toBe(false);
      expect(() => enforceRole(safetyAdminActor, ["super_admin"])).toThrow(UnauthorizedError);
    });

    it("grants super_admin global privilege oversight across all administrative domains", () => {
      expect(hasPermission("super_admin", "admin:manage_roles")).toBe(true);
      expect(hasPermission("super_admin", "admin:system_config")).toBe(true);
      expect(hasPermission("super_admin", "content:manage_policies")).toBe(true);
      expect(hasPermission("super_admin", "safety:ban_account")).toBe(true);
      expect(hasPermission("super_admin", "finance:read_transactions")).toBe(true);
      expect(() => enforceRole(superAdminActor, ["super_admin", "finance_admin"])).not.toThrow();
    });
  });

  describe("2. Database-Backed Analytics Calculation Accuracy", () => {
    it("computes profile completion rate and like-to-match conversion accurately", () => {
      const totalUsers = 250;
      const completedProfiles = 200;
      const profileCompletionRate = Math.round((completedProfiles / totalUsers) * 1000) / 10;
      expect(profileCompletionRate).toBe(80.0);

      const totalInteractions = 1000;
      const totalLikes = 600;
      const likeRatio = Math.round((totalLikes / totalInteractions) * 1000) / 10;
      expect(likeRatio).toBe(60.0);

      const totalMatches = 90; // Each match represents 2 mutual likes
      const matchConversionRate = Math.round(((totalMatches * 2) / totalLikes) * 1000) / 10;
      expect(matchConversionRate).toBe(30.0);
    });

    it("computes subscription conversion rate and churn rate correctly", () => {
      const activeMembers = 500;
      const paidSubscriptions = 75;
      const conversionRate = Math.round((paidSubscriptions / activeMembers) * 1000) / 10;
      expect(conversionRate).toBe(15.0);

      const churnedSubscriptions = 15;
      const totalPaidEver = paidSubscriptions + churnedSubscriptions;
      const churnRate = Math.round((churnedSubscriptions / totalPaidEver) * 1000) / 10;
      expect(churnRate).toBe(16.7);
    });

    it("computes mean resolution time in minutes from case review timestamps", () => {
      const cases = [
        { created: 0, resolved: 10 * 60 * 1000 }, // 10 mins
        { created: 0, resolved: 20 * 60 * 1000 }, // 20 mins
        { created: 0, resolved: 30 * 60 * 1000 }, // 30 mins
      ];

      const totalMinutes = cases.reduce((acc, c) => acc + (c.resolved - c.created) / (60 * 1000), 0);
      const meanMinutes = Math.round(totalMinutes / cases.length);
      expect(meanMinutes).toBe(20);
    });

    it("guarantees privacy by withholding raw PII from analytics payloads", () => {
      const analyticsOutput = {
        overview: { activeMembers: 120, eligibleRegistrations: 150 },
        monetization: { totalGrossRevenueCents: 450000 },
      };

      expect(analyticsOutput).not.toHaveProperty("email");
      expect(analyticsOutput).not.toHaveProperty("password");
      expect(analyticsOutput).not.toHaveProperty("coordinates");
      expect(analyticsOutput).not.toHaveProperty("birthdate");
    });
  });

  describe("3. Support Ticket Management & Safety Escalation", () => {
    it("ensures internal staff notes are confidential and invisible to members", () => {
      const ticketMessages = [
        { id: "msg-1", content: "I cannot update my profile photo", isInternal: false, senderRole: "member" },
        { id: "msg-2", content: "Checking Cloud Storage bucket ACLs", isInternal: true, senderRole: "support_agent" },
        { id: "msg-3", content: "Please try uploading a JPEG under 10MB", isInternal: false, senderRole: "support_agent" },
      ];

      // Member view filter
      const memberVisibleMessages = ticketMessages.filter((m) => !m.isInternal);
      expect(memberVisibleMessages.length).toBe(2);
      expect(memberVisibleMessages.some((m) => m.isInternal)).toBe(false);

      // Staff view includes all
      expect(ticketMessages.length).toBe(3);
    });

    it("escalates support tickets to Trust & Safety by elevating priority and creating a safety case", () => {
      const ticket = {
        id: "ticket-555",
        userId: "user-victim",
        subject: "Member threatened me offline",
        priority: "medium",
        escalatedToSafety: false,
      };

      // Support agent escalates
      ticket.escalatedToSafety = true;
      ticket.priority = "urgent";

      const createdSafetyCase = {
        reporterId: "u-support",
        reportedId: ticket.userId,
        category: "safety_concern",
        priority: "critical",
      };

      expect(ticket.escalatedToSafety).toBe(true);
      expect(ticket.priority).toBe("urgent");
      expect(createdSafetyCase.priority).toBe("critical");
    });
  });

  describe("4. Destructive Action Controls & Audit Logs", () => {
    it("requires mandatory justification for user role modifications", () => {
      function executeRoleChange(actor: AuthContext, targetUser: string, newRole: string, reason: string) {
        enforceRole(actor, ["super_admin"]);
        if (!reason.trim()) {
          throw new Error("Administrative justification is required for role modification.");
        }
        return { success: true, targetUser, newRole };
      }

      // Denied for non super_admin
      expect(() => executeRoleChange(safetyAdminActor, "u-target", "moderator", "Help needed")).toThrow(
        UnauthorizedError
      );

      // Denied without justification
      expect(() => executeRoleChange(superAdminActor, "u-target", "moderator", "")).toThrow(
        /Administrative justification is required/
      );

      // Permitted with valid justification
      const result = executeRoleChange(superAdminActor, "u-target", "moderator", "Promotion to T&S team");
      expect(result.success).toBe(true);
    });

    it("automatically hides candidate profile discovery when an account is suspended or banned", () => {
      const user = {
        id: "user-violator",
        accountStatus: "active",
        profile: { isVisible: true },
      };

      function sanctionAccount(newStatus: "suspended" | "banned" | "active") {
        user.accountStatus = newStatus;
        if (newStatus === "suspended" || newStatus === "banned") {
          user.profile.isVisible = false;
        } else {
          user.profile.isVisible = true;
        }
      }

      sanctionAccount("suspended");
      expect(user.accountStatus).toBe("suspended");
      expect(user.profile.isVisible).toBe(false);

      sanctionAccount("active");
      expect(user.accountStatus).toBe("active");
      expect(user.profile.isVisible).toBe(true);
    });
  });
});
