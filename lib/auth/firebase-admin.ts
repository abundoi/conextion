import admin from "firebase-admin";

interface FirebaseAdminConfig {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}

function formatPrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  return key.replace(/\\n/g, "\n");
}

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = formatPrivateKey(rawKey);

  const isRealKey =
    privateKey &&
    privateKey.includes("-----BEGIN PRIVATE KEY-----") &&
    !privateKey.includes("MOCK");

  if (projectId && clientEmail && isRealKey) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch {
      // Fallback to project ID default
    }
  }

  // Fallback to project ID default credentials or test config
  return admin.initializeApp({
    projectId: projectId || "conextion-dev",
  });
}

export const firebaseAdmin = initializeFirebaseAdmin();
export const adminAuth = firebaseAdmin.auth();
export default firebaseAdmin;
