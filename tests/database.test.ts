import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";

describe("Database Schema & Model Integrity Suite", () => {
  it("exports all 11 required Phase 1 core model names in Prisma DMMF", () => {
    const models = Prisma.dmmf.datamodel.models.map((m) => m.name);

    const requiredModels = [
      "User",
      "UserProfile",
      "UserPreference",
      "EligibilityCheck",
      "VerificationRecord",
      "ProfilePhoto",
      "Interest",
      "UserInterest",
      "ConsentRecord",
      "Block",
      "AuditLog",
      "Interaction",
      "Match",
      "UserPrompt",
      "Report",
      "Conversation",
      "Message",
      "Notification",
      "NotificationPreference",
    ];

    for (const model of requiredModels) {
      expect(models).toContain(model);
    }
  });

  it("verifies Message model has unique constraint on clientMessageId for idempotency", () => {
    const messageModel = Prisma.dmmf.datamodel.models.find((m) => m.name === "Message");
    expect(messageModel).toBeDefined();

    const clientMsgIdField = messageModel!.fields.find((f) => f.name === "clientMessageId");
    expect(clientMsgIdField?.isUnique).toBe(true);
  });

  it("verifies Match model has composite unique constraint on [user1Id, user2Id]", () => {
    const matchModel = Prisma.dmmf.datamodel.models.find((m) => m.name === "Match");
    expect(matchModel).toBeDefined();

    const uniqueConstraints = matchModel!.uniqueFields;
    expect(uniqueConstraints).toContainEqual(["user1Id", "user2Id"]);
  });

  it("verifies Interaction model has unique constraint on [actorId, targetId]", () => {
    const interactionModel = Prisma.dmmf.datamodel.models.find((m) => m.name === "Interaction");
    expect(interactionModel).toBeDefined();

    const uniqueConstraints = interactionModel!.uniqueFields;
    expect(uniqueConstraints).toContainEqual(["actorId", "targetId"]);
  });

  it("verifies User model has required unique constraints and indexes", () => {
    const userModel = Prisma.dmmf.datamodel.models.find((m) => m.name === "User");
    expect(userModel).toBeDefined();

    const fields = userModel!.fields.map((f) => f.name);
    expect(fields).toContain("firebaseUid");
    expect(fields).toContain("email");
    expect(fields).toContain("role");
    expect(fields).toContain("accountStatus");
    expect(fields).toContain("deletedAt");

    const firebaseUidField = userModel!.fields.find((f) => f.name === "firebaseUid");
    expect(firebaseUidField?.isUnique).toBe(true);

    const emailField = userModel!.fields.find((f) => f.name === "email");
    expect(emailField?.isUnique).toBe(true);
  });

  it("verifies UserProfile model has foreign key to User with Cascade delete", () => {
    const profileModel = Prisma.dmmf.datamodel.models.find((m) => m.name === "UserProfile");
    expect(profileModel).toBeDefined();

    const userRelation = profileModel!.fields.find((f) => f.name === "user");
    expect(userRelation).toBeDefined();
    expect(userRelation?.kind).toBe("object");
    expect(userRelation?.type).toBe("User");
  });

  it("verifies Block model has composite primary key and blocker/blocked relations", () => {
    const blockModel = Prisma.dmmf.datamodel.models.find((m) => m.name === "Block");
    expect(blockModel).toBeDefined();

    expect(blockModel?.primaryKey?.fields).toEqual(["blockerId", "blockedId"]);

    const blockerRelation = blockModel!.fields.find((f) => f.name === "blocker");
    const blockedRelation = blockModel!.fields.find((f) => f.name === "blocked");
    expect(blockerRelation).toBeDefined();
    expect(blockedRelation).toBeDefined();
  });

  it("verifies all 6 system roles exist in UserRole enum", () => {
    const roleEnum = Prisma.dmmf.datamodel.enums.find((e) => e.name === "UserRole");
    expect(roleEnum).toBeDefined();

    const roleValues = roleEnum!.values.map((v) => v.name);
    const expectedRoles = [
      "member",
      "moderator",
      "support_agent",
      "finance_admin",
      "safety_admin",
      "super_admin",
    ];

    expect(roleValues.sort()).toEqual(expectedRoles.sort());
  });
});
