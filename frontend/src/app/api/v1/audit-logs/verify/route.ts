import { NextResponse } from "next/server";
import { authenticateAndAuthorize } from "@/lib/server/rbac";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuditChain, verifyAuditRecord, logAudit, type AuditRecord } from "@/lib/server/audit";
import { enforceRateLimit, getRateLimitHeaders } from "@/lib/server/rate-limiter";

export async function POST(req: Request) {
  try {
    const auth = await authenticateAndAuthorize(req, "audit:verify");
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }
    const uid = auth.uid;

    const rlResult = await enforceRateLimit(uid, "AUTH_SENSITIVE");
    if (!rlResult.success) {
      const status = rlResult.errorType === "INFRASTRUCTURE_UNAVAILABLE" ? 503 : 429;
      return NextResponse.json(
        {
          error: {
            code: rlResult.errorType || "RATE_LIMIT_EXCEEDED",
            message: rlResult.reason || "Rate limit exceeded.",
            retryAfter: rlResult.retryAfter,
          },
        },
        { status, headers: getRateLimitHeaders(rlResult) }
      );
    }

    // Fetch the last 200 audit records for this tenant
    const snapshot = await adminDb
      .collection("audit_logs")
      .where("uid", "==", uid)
      .orderBy("timestamp", "desc")
      .limit(200)
      .get();

    const rawDocs = snapshot.docs || [];
    if (rawDocs.length === 0) {
      return NextResponse.json({
        verified: true,
        totalRecords: 0,
        validCount: 0,
        tamperedCount: 0,
        chainIntact: true,
        details: "No audit records found to verify.",
      });
    }

    const records: AuditRecord[] = rawDocs.map((doc: any) => {
      const d = doc.data();
      return {
        id: doc.id,
        uid: d.uid,
        action: d.action,
        details: d.details || {},
        timestamp: d.timestamp,
        previousHash: d.previousHash,
        recordHash: d.recordHash,
        signature: d.signature,
        keyId: d.keyId || "v1",
      };
    });

    const chainResult = verifyAuditChain(records);
    let tamperedCount = 0;

    for (const r of records) {
      if (r.recordHash && r.signature) {
        const single = verifyAuditRecord(r);
        if (!single.valid) tamperedCount++;
      }
    }

    if (!chainResult.valid || tamperedCount > 0) {
      // Log tamper alert to audit trail
      try {
        await logAudit(uid, "INTEGRITY_CHECK_FAILED", {
          totalChecked: records.length,
          tamperedCount,
          reason: chainResult.reason,
          brokenAtId: chainResult.brokenAtId,
        });
      } catch (logErr) {
        console.error("Failed to log integrity check failure:", logErr);
      }

      return NextResponse.json(
        {
          verified: false,
          totalRecords: records.length,
          validCount: chainResult.validCount,
          tamperedCount: tamperedCount || 1,
          chainIntact: false,
          details: chainResult.reason || "Cryptographic integrity check detected tampered records or broken chain.",
        },
        { status: 200 }
      );
    }

    // Log successful verification
    try {
      await logAudit(uid, "AUDIT_VERIFIED", {
        recordsVerified: records.length,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      verified: true,
      totalRecords: records.length,
      validCount: records.length,
      tamperedCount: 0,
      chainIntact: true,
      details: `All ${records.length} records cryptographically verified with valid HMAC signatures and hash chaining.`,
    });
  } catch (error) {
    console.error("POST /api/v1/audit-logs/verify error:", error);
    return NextResponse.json(
      { error: "Internal error during cryptographic audit verification." },
      { status: 500 }
    );
  }
}
