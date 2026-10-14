import { Storage } from "@google-cloud/storage";
import crypto from "crypto";
import { logger } from "../logging/logger";

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface UploadUrlRequest {
  userId: string;
  contentType: string;
  fileSizeBytes: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  storagePath: string;
  expiresInSeconds: number;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateImageUpload(contentType: string, fileSizeBytes: number): FileValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(contentType as AllowedMimeType)) {
    return {
      isValid: false,
      error: `Invalid file type: '${contentType}'. Only JPEG, PNG, and WebP images are permitted.`,
    };
  }

  if (fileSizeBytes <= 0) {
    return {
      isValid: false,
      error: "Invalid file size: Uploaded file is empty.",
    };
  }

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds the 10MB maximum limit. Received: ${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB`,
    };
  }

  return { isValid: true };
}

export function generateStoragePath(userId: string, contentType: string): string {
  const extensionMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extensionMap[contentType] || "bin";
  const uniqueId = crypto.randomUUID();
  return `users/${userId}/photos/${uniqueId}.${ext}`;
}

export async function createSignedUploadUrl(
  userId: string,
  contentType: string,
  fileSizeBytes: number
): Promise<UploadUrlResponse> {
  const validation = validateImageUpload(contentType, fileSizeBytes);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const storagePath = generateStoragePath(userId, contentType);
  const bucketName = process.env.GCS_BUCKET_NAME || "conextion-dev-private-media";
  const expiresInSeconds = 15 * 60; // 15 minutes

  // If in test or development without active GCS credentials, return structured development signed URL
  if (process.env.NODE_ENV === "test" || !process.env.FIREBASE_PRIVATE_KEY?.includes("BEGIN PRIVATE KEY")) {
    const mockSignedUrl = `https://storage.googleapis.com/${bucketName}/${storagePath}?X-Goog-Signature=mock_signature&expires=${expiresInSeconds}`;
    return {
      uploadUrl: mockSignedUrl,
      storagePath,
      expiresInSeconds,
    };
  }

  try {
    const storage = new Storage({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
    });

    const [uploadUrl] = await storage.bucket(bucketName).file(storagePath).getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + expiresInSeconds * 1000,
      contentType,
    });

    return {
      uploadUrl,
      storagePath,
      expiresInSeconds,
    };
  } catch (error) {
    logger.error("Failed to generate Google Cloud Storage signed upload URL", error, {
      userId,
      storagePath,
    });
    throw new Error("Unable to initialize secure file upload.");
  }
}
