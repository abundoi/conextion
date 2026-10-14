import { describe, it, expect } from "vitest";
import {
  hasRequiredRole,
  hasPermission,
  canAccessResource,
  enforceRole,
  enforceOwnership,
  UnauthorizedError,
  ForbiddenError,
  AuthContext,
} from "@/lib/auth/rbac";

describe("Centralized RBAC & Authorization Suite", () => {
  const memberActor: AuthContext = {
    userId: "user-100",
    firebaseUid: "fb-100",
    email: "member@example.com",
    role: "member",
    accountStatus: "active",
  };

  const moderatorActor: AuthContext = {
    userId: "mod-200",
    firebaseUid: "fb-200",
    email: "mod@example.com",
    role: "moderator",
    accountStatus: "active",
  };

  const safetyAdminActor: AuthContext = {
    userId: "safety-300",
    firebaseUid: "fb-300",
    email: "safety@example.com",
    role: "safety_admin",
    accountStatus: "active",
  };

  const superAdminActor: AuthContext = {
    userId: "super-400",
    firebaseUid: "fb-400",
    email: "admin@example.com",
    role: "super_admin",
    accountStatus: "active",
  };

  describe("Role & Permission Hierarchy", () => {
    it("allows member to manage their own profile and view discovery", () => {
      expect(hasPermission("member", "profile:read_own")).toBe(true);
      expect(hasPermission("member", "discovery:read")).toBe(true);
    });

    it("prevents standard member from accessing moderation or admin permissions", () => {
      expect(hasPermission("member", "moderation:review_photos")).toBe(false);
      expect(hasPermission("member", "safety:ban_account")).toBe(false);
      expect(hasPermission("member", "admin:manage_roles")).toBe(false);

      expect(() => enforceRole(memberActor, ["moderator", "super_admin"])).toThrow(UnauthorizedError);
    });

    it("allows moderator to review photos and reports, but not ban accounts", () => {
      expect(hasPermission("moderator", "moderation:review_photos")).toBe(true);
      expect(hasPermission("moderator", "safety:ban_account")).toBe(false);
      expect(hasRequiredRole("moderator", ["moderator"])).toBe(true);
    });

    it("allows safety_admin to ban accounts and view audit logs", () => {
      expect(hasPermission("safety_admin", "safety:ban_account")).toBe(true);
      expect(hasPermission("safety_admin", "audit:read_logs")).toBe(true);
      expect(hasRequiredRole("safety_admin", ["safety_admin", "super_admin"])).toBe(true);
    });

    it("super_admin has comprehensive access across all permissions and roles", () => {
      expect(hasPermission("super_admin", "admin:manage_roles")).toBe(true);
      expect(hasRequiredRole("super_admin", ["moderator"])).toBe(true);
      expect(hasRequiredRole("super_admin", ["finance_admin"])).toBe(true);
      expect(() => enforceRole(superAdminActor, ["safety_admin"])).not.toThrow();
    });
  });

  describe("Cross-Account Access Denial & IDOR Protection", () => {
    it("permits member to access their own private resource", () => {
      expect(canAccessResource(memberActor, "user-100")).toBe(true);
      expect(() => enforceOwnership(memberActor, "user-100")).not.toThrow();
    });

    it("strictly denies member from accessing another member's private resource", () => {
      expect(canAccessResource(memberActor, "user-999")).toBe(false);
      expect(() => enforceOwnership(memberActor, "user-999")).toThrow(ForbiddenError);
    });

    it("permits authorized safety_admin or super_admin to inspect resources for safety investigations", () => {
      expect(canAccessResource(safetyAdminActor, "user-999")).toBe(true);
      expect(canAccessResource(superAdminActor, "user-999")).toBe(true);
      expect(() => enforceOwnership(safetyAdminActor, "user-999")).not.toThrow();
    });
  });
});
