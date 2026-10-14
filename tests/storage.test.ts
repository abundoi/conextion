import { describe, it, expect } from "vitest";
import {
  validateImageUpload,
  generateStoragePath,
  createSignedUploadUrl,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/storage/gcs";

describe("Media Storage & Upload Security Suite", () => {
  it("approves allowed image MIME types within limits", () => {
    const validJpeg = validateImageUpload("image/jpeg", 2 * 1024 * 1024);
    expect(validJpeg.isValid).toBe(true);

    const validPng = validateImageUpload("image/png", 5 * 1024 * 1024);
    expect(validPng.isValid).toBe(true);

    const validWebp = validateImageUpload("image/webp", 8 * 1024 * 1024);
    expect(validWebp.isValid).toBe(true);
  });

  it("rejects unauthorized file MIME types", () => {
    const pdfCheck = validateImageUpload("application/pdf", 1024 * 1024);
    expect(pdfCheck.isValid).toBe(false);
    expect(pdfCheck.error).toContain("Invalid file type");

    const gifCheck = validateImageUpload("image/gif", 1024 * 1024);
    expect(gifCheck.isValid).toBe(false);

    const exeCheck = validateImageUpload("application/x-msdownload", 1024 * 1024);
    expect(exeCheck.isValid).toBe(false);

    const scriptCheck = validateImageUpload("text/javascript", 1024);
    expect(scriptCheck.isValid).toBe(false);
  });

  it("rejects zero-byte files", () => {
    const zeroByte = validateImageUpload("image/jpeg", 0);
    expect(zeroByte.isValid).toBe(false);
    expect(zeroByte.error).toContain("empty");
  });

  it("rejects files exceeding the 10MB threshold", () => {
    const oversize = validateImageUpload("image/jpeg", MAX_FILE_SIZE_BYTES + 1024);
    expect(oversize.isValid).toBe(false);
    expect(oversize.error).toContain("exceeds the 10MB maximum limit");
  });

  it("generates deterministic, user-isolated storage paths", () => {
    const userId = "usr-uuid-12345";
    const path = generateStoragePath(userId, "image/jpeg");

    expect(path.startsWith(`users/${userId}/photos/`)).toBe(true);
    expect(path.endsWith(".jpg")).toBe(true);
  });

  it("creates valid signed upload payload for authorized user", async () => {
    const result = await createSignedUploadUrl("usr-123", "image/webp", 1024 * 500);
    expect(result.uploadUrl).toBeDefined();
    expect(result.storagePath).toContain("users/usr-123/photos/");
    expect(result.expiresInSeconds).toBe(900); // 15 mins
  });
});
