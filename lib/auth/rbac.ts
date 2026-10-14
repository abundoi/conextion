import { UserRole } from "@prisma/client";

export type Role = `${UserRole}`;

export interface AuthContext {
  userId: string;
  firebaseUid: string;
  email: string;
  role: Role;
  accountStatus: string;
}

// Role hierarchy / privilege mapping
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  member: ["profile:read_own", "profile:write_own", "discovery:read", "interaction:create", "support:create_ticket"],
  moderator: ["profile:read_own", "profile:write_own", "moderation:review_photos", "moderation:review_reports"],
  support_agent: [
    "profile:read_own",
    "profile:write_own",
    "support:read_tickets",
    "support:manage_tickets",
    "support:verify_appeal",
    "content:manage_faqs",
  ],
  finance_admin: [
    "profile:read_own",
    "profile:write_own",
    "finance:read_transactions",
    "finance:manage_plans",
    "finance:reconciliation",
    "analytics:read_metrics",
  ],
  safety_admin: [
    "profile:read_own",
    "profile:write_own",
    "moderation:review_photos",
    "moderation:review_reports",
    "safety:suspend_account",
    "safety:ban_account",
    "audit:read_logs",
    "analytics:read_metrics",
    "support:read_tickets",
  ],
  analytics_viewer: [
    "profile:read_own",
    "analytics:read_metrics",
    "analytics:read_retention",
  ],
  super_admin: [
    "profile:read_own",
    "profile:write_own",
    "moderation:review_photos",
    "moderation:review_reports",
    "safety:suspend_account",
    "safety:ban_account",
    "audit:read_logs",
    "finance:read_transactions",
    "finance:manage_plans",
    "finance:reconciliation",
    "admin:manage_roles",
    "admin:system_config",
    "support:read_tickets",
    "support:manage_tickets",
    "content:manage_policies",
    "content:manage_faqs",
    "analytics:read_metrics",
    "analytics:read_retention",
  ],
};

/**
 * Checks whether a given role is permitted to access an operation requiring specific roles.
 */
export function hasRequiredRole(userRole: Role, allowedRoles: Role[]): boolean {
  if (userRole === "super_admin") return true;
  return allowedRoles.includes(userRole);
}

/**
 * Checks whether a role has a specific granular permission.
 */
export function hasPermission(userRole: Role, requiredPermission: string): boolean {
  if (userRole === "super_admin") return true;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(requiredPermission);
}

/**
 * Validates resource ownership to prevent Insecure Direct Object References (IDOR).
 * Allows administrative override for authorized roles (moderator, safety_admin, super_admin).
 */
export function canAccessResource(
  actor: AuthContext,
  resourceOwnerId: string,
  administrativeRoles: Role[] = ["safety_admin", "super_admin"]
): boolean {
  if (actor.userId === resourceOwnerId) {
    return true;
  }
  return administrativeRoles.includes(actor.role);
}

/**
 * Throws or returns an error if authorization fails.
 */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized: Insufficient role permissions.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden: Cross-account resource access is strictly prohibited.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function enforceRole(actor: AuthContext, allowedRoles: Role[]): void {
  if (!hasRequiredRole(actor.role, allowedRoles)) {
    throw new UnauthorizedError(`User with role '${actor.role}' is not authorized for this operation.`);
  }
}

export function enforceOwnership(actor: AuthContext, resourceOwnerId: string, administrativeRoles?: Role[]): void {
  if (!canAccessResource(actor, resourceOwnerId, administrativeRoles)) {
    throw new ForbiddenError("You do not have permission to access or modify this resource.");
  }
}
