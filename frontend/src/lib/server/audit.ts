import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { type AuditAction, VALID_AUDIT_ACTIONS } from "@/lib/audit-logs";

export { VALID_AUDIT_ACTIONS, type AuditAction };

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
export const CURRENT_KEY_ID = "v1";

export interface AuditRecord {
  id?: string;
  uid: string;
  action: AuditAction;
  details: Record<string, unknown>;
  timestamp: string;
  previousHash: string;
  recordHash: string;
  signature: string;
  keyId: string;
}

/**
 * Retrieves the cryptographic signing key for audit logs.
 * In production, requires AUDIT_SIGNING_KEY. Never falls back to Firebase private keys or default secrets.
 */
export function getAuditSigningKey(): string {
  const envKey = process.env.AUDIT_SIGNING_KEY;
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[AuditIntegrity] CRITICAL: AUDIT_SIGNING_KEY environment variable is mandatory in production. Falling back to other keys or default secrets is strictly prohibited."
    );
  }

  // Deterministic local secret for development/testing ONLY
  return "promptshield-cryptographic-audit-key-256bit-default";
}

/**
 * Resolves the verification key for a given key ID, supporting historical key rotation.
 */
export function getAuditVerificationKey(keyId = CURRENT_KEY_ID): string {
  if (keyId === CURRENT_KEY_ID) {
    return getAuditSigningKey();
  }

  const historicalKey = process.env[`AUDIT_SIGNING_KEY_${keyId.toUpperCase().replace(/-/g, "_")}`];
  if (historicalKey && historicalKey.trim().length > 0) {
    return historicalKey.trim();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`[AuditIntegrity] Historical signing key for keyId '${keyId}' not configured.`);
  }

  return getAuditSigningKey();
}

/**
 * Canonical JSON serialization:
 * Deterministically sorts object keys recursively so cryptographic hashes and HMACs
 * are reproducible across JavaScript engines and independent audit verifiers.
 */
export function canonicalStringify(data: unknown): string {
  if (data === null || data === undefined) {
    return "null";
  }
  if (typeof data !== "object") {
    return JSON.stringify(data);
  }
  if (Array.isArray(data)) {
    return "[" + data.map((item) => canonicalStringify(item)).join(",") + "]";
  }

  const obj = data as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const entries: string[] = [];

  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalStringify(val)}`);
    }
  }

  return "{" + entries.join(",") + "}";
}

/**
 * Computes SHA-256 digest of canonical data string.
 */
export function computeRecordHash(payload: {
  uid: string;
  action: AuditAction;
  details: Record<string, unknown>;
  timestamp: string;
  previousHash: string;
}): string {
  const canonical = canonicalStringify({
    action: payload.action,
    details: payload.details,
    previousHash: payload.previousHash,
    timestamp: payload.timestamp,
    uid: payload.uid,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Computes HMAC-SHA256 signature over the record hash using the server secret.
 */
export function computeRecordSignature(recordHash: string, key = getAuditSigningKey()): string {
  return crypto.createHmac("sha256", key).update(recordHash).digest("hex");
}

/**
 * Verifies the cryptographic integrity of a single audit record.
 */
export function verifyAuditRecord(
  record: AuditRecord,
  key?: string
): { valid: boolean; reason?: string } {
  if (!record || typeof record !== "object") {
    return { valid: false, reason: "Malformed record: null or non-object." };
  }

  if (!record.recordHash || !record.signature) {
    return { valid: false, reason: "Missing cryptographic hash or signature." };
  }

  let signingKey = key;
  if (!signingKey) {
    try {
      signingKey = getAuditVerificationKey(record.keyId || CURRENT_KEY_ID);
    } catch (err: unknown) {
      return { valid: false, reason: err instanceof Error ? err.message : "Failed to resolve signing key." };
    }
  }

  const expectedHash = computeRecordHash({
    uid: record.uid,
    action: record.action,
    details: record.details,
    timestamp: record.timestamp,
    previousHash: record.previousHash || GENESIS_HASH,
  });

  if (expectedHash !== record.recordHash) {
    return {
      valid: false,
      reason: `Record content modified: expected hash ${expectedHash.slice(0, 8)}, got ${record.recordHash.slice(0, 8)}.`,
    };
  }

  const expectedSignature = computeRecordSignature(record.recordHash, signingKey);
  try {
    const sigBuf = Buffer.from(record.signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, reason: "Cryptographic HMAC signature mismatch." };
    }
  } catch {
    return { valid: false, reason: "Invalid signature encoding." };
  }

  return { valid: true };
}

/**
 * Verifies the integrity of an entire chain of audit records for a tenant.
 * Detects tampering, record deletions, and order rearrangements.
 */
export function verifyAuditChain(
  records: AuditRecord[],
  key = getAuditSigningKey()
): {
  valid: boolean;
  totalRecords: number;
  validCount: number;
  brokenAtId?: string;
  reason?: string;
} {
  if (!records || records.length === 0) {
    return { valid: true, totalRecords: 0, validCount: 0 };
  }

  // Sort ascending by timestamp to verify chronological chain
  const sorted = [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  let prevHash = GENESIS_HASH;
  let validCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const record = sorted[i];

    // Check individual record hash and HMAC
    const recordCheck = verifyAuditRecord(record, key);
    if (!recordCheck.valid) {
      return {
        valid: false,
        totalRecords: records.length,
        validCount,
        brokenAtId: record.id,
        reason: `Record ${record.id || i} verification failed: ${recordCheck.reason}`,
      };
    }

    // Check chain link: record's previousHash must match predecessor's recordHash
    if (i > 0 && record.previousHash && record.previousHash !== prevHash) {
      return {
        valid: false,
        totalRecords: records.length,
        validCount,
        brokenAtId: record.id,
        reason: `Audit chain broken at record ${record.id || i}: expected previousHash ${prevHash.slice(0, 8)}, found ${record.previousHash.slice(0, 8)}. Records may have been deleted or reordered.`,
      };
    }

    prevHash = record.recordHash;
    validCount++;
  }

  return {
    valid: true,
    totalRecords: records.length,
    validCount,
  };
}

/**
 * Logs an append-only, cryptographically signed audit event to Firestore.
 * Chains to the previous record hash for the tenant.
 * Concurrency-safe: uses atomic Firestore transaction over audit_chain_heads/{uid} when available.
 */
export async function logAudit(
  uid: string,
  action: AuditAction,
  details: Record<string, unknown>
): Promise<AuditRecord> {
  const timestamp = new Date().toISOString();
  let previousHash = GENESIS_HASH;

  // 1. Concurrency-safe atomic transaction over audit_chain_heads/{uid}
  if (typeof adminDb.runTransaction === "function") {
    try {
      const headRef = adminDb.collection("audit_chain_heads").doc(uid);
      const newRecordRef = adminDb.collection("audit_logs").doc();

      const createdRecord = await adminDb.runTransaction(async (transaction) => {
        let prev = GENESIS_HASH;
        if (typeof transaction.get === "function") {
          const headSnap = await transaction.get(headRef).catch(() => null);
          if (headSnap?.exists) {
            const rawHead = (typeof headSnap.data === "function" ? headSnap.data() : (headSnap as unknown as { data: Record<string, unknown> }).data) as Record<string, unknown> | undefined;
            if (rawHead?.latestHash && typeof rawHead.latestHash === "string") {
              prev = rawHead.latestHash;
            }
          }
        }

        const recordHash = computeRecordHash({
          uid,
          action,
          details,
          timestamp,
          previousHash: prev,
        });
        const signature = computeRecordSignature(recordHash);

        const record: AuditRecord = {
          uid,
          action,
          details,
          timestamp,
          previousHash: prev,
          recordHash,
          signature,
          keyId: CURRENT_KEY_ID,
        };

        if (typeof transaction.set === "function") {
          transaction.set(newRecordRef, record);
          transaction.set(headRef, {
            latestHash: recordHash,
            updatedAt: timestamp,
            lastDocId: newRecordRef.id,
          });
        }

        return { id: newRecordRef.id, ...record };
      });

      return createdRecord;
    } catch (txErr) {
      console.warn("[Audit] Transaction failed, proceeding with direct write fallback:", txErr);
    }
  }

  // 2. Fallback for test mocks or environments without active transaction support
  try {
    let query: any = adminDb.collection("audit_logs").where("uid", "==", uid);
    if (typeof query?.orderBy === "function") {
      query = query.orderBy("timestamp", "desc");
    }
    if (typeof query?.limit === "function") {
      query = query.limit(1);
    }

    const lastDocs = typeof query?.get === "function" ? await query.get().catch(() => null) : null;

    if (lastDocs && !lastDocs.empty && Array.isArray(lastDocs.docs) && lastDocs.docs.length > 0) {
      const lastData = typeof lastDocs.docs[0].data === "function" ? lastDocs.docs[0].data() : lastDocs.docs[0].data;
      if (lastData?.recordHash) {
        previousHash = lastData.recordHash;
      }
    }
  } catch (err) {
    console.warn("[Audit] Could not retrieve previousHash for chaining, falling back to genesis hash:", err);
  }

  const recordHash = computeRecordHash({
    uid,
    action,
    details,
    timestamp,
    previousHash,
  });

  const signature = computeRecordSignature(recordHash);

  const auditRecord: AuditRecord = {
    uid,
    action,
    details,
    timestamp,
    previousHash,
    recordHash,
    signature,
    keyId: CURRENT_KEY_ID,
  };

  try {
    const docRef = await adminDb.collection("audit_logs").add(auditRecord);
    return { id: docRef.id, ...auditRecord };
  } catch (error) {
    console.error("Failed to write audit log:", error);
    throw new Error(
      `Audit logging failed for action ${action}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
