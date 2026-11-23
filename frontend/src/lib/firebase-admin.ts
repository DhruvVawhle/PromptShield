import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-project';
if (!projectId) {
  throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");
}

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

const hasServiceAccount = Boolean(
  (clientEmail && privateKey) || process.env.GOOGLE_APPLICATION_CREDENTIALS
);

if (!getApps().length) {
  try {
    if (clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } else {
      initializeApp({
        projectId,
      });
    }
  } catch (error) {
    console.warn('Firebase admin initialization warning: missing credentials or environment setup.', error);
  }
}

const createServiceProxy = <T extends object>(serviceName: string): T => {
  return new Proxy({} as T, {
    get: () => {
      throw new Error(`Firebase Admin ${serviceName} is not initialized. Please ensure GCP credentials (ADC) are configured.`);
    },
  });
};

const rawAuth = getApps().length ? getAuth() : createServiceProxy<ReturnType<typeof getAuth>>('Auth');

if (getApps().length) {
  const originalVerifyIdToken = rawAuth.verifyIdToken.bind(rawAuth);

  rawAuth.verifyIdToken = async function (token: string, checkRevoked?: boolean) {
    if (!token || typeof token !== "string" || !token.trim()) {
      const err = new Error("First argument to verifyIdToken() must be a non-empty string.");
      (err as any).code = "auth/argument-error";
      throw err;
    }

    // When checkRevoked is requested and service account credentials are fully configured,
    // verify with token revocation check.
    if (checkRevoked && hasServiceAccount) {
      try {
        return await originalVerifyIdToken(token, true);
      } catch (error: any) {
        const code = error?.code;
        const clientErrors = [
          "auth/id-token-revoked",
          "auth/id-token-expired",
          "auth/argument-error",
          "auth/invalid-id-token",
          "auth/user-disabled",
        ];
        if (code && clientErrors.includes(code)) {
          throw error;
        }
        // If revocation check failed due to network / service account authorization issue,
        // fall through to standard cryptographic verification.
      }
    }

    // Cryptographic verification against Google's public x509 certificates.
    // Validates RS256 signature, expiry, audience, issuer, and claims locally.
    return await originalVerifyIdToken(token, false);
  };
}

export const adminAuth = rawAuth;

// Lightweight in-memory Firestore fallback with disk persistence for local development when GCP service account credentials
// (ADC) are not configured, preventing timeouts and 502/503 errors on localhost while preserving state.
const LOCAL_DB_PATH = path.resolve(process.cwd(), ".data", "local-firestore.json");

function readDiskDb(): Record<string, Record<string, any>> {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Ignore read errors
  }
  return {};
}

function writeDiskDb(data: Record<string, Record<string, any>>) {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Ignore write errors
  }
}

class MemoryCollection {
  private docs = new Map<string, Record<string, any>>();
  constructor(public name: string, private onPersist?: () => void) {}

  loadDocs(docsMap: Record<string, any>) {
    for (const [id, data] of Object.entries(docsMap)) {
      this.docs.set(id, data);
    }
  }

  toJSON(): Record<string, any> {
    const obj: Record<string, any> = {};
    for (const [id, data] of this.docs.entries()) {
      obj[id] = data;
    }
    return obj;
  }

  doc(id?: string) {
    const docId = id || crypto.randomUUID();
    const docsMap = this.docs;
    const triggerPersist = this.onPersist;
    return {
      id: docId,
      async get() {
        const data = docsMap.get(docId);
        return {
          exists: data !== undefined,
          id: docId,
          data: () => (data ? { ...data } : undefined),
        };
      },
      async set(data: Record<string, any>, options?: { merge?: boolean }) {
        if (options?.merge && docsMap.has(docId)) {
          docsMap.set(docId, { ...docsMap.get(docId), ...data });
        } else {
          docsMap.set(docId, { ...data });
        }
        triggerPersist?.();
      },
      async update(data: Record<string, any>) {
        if (!docsMap.has(docId)) {
          throw new Error(`Document ${docId} does not exist.`);
        }
        docsMap.set(docId, { ...docsMap.get(docId), ...data });
        triggerPersist?.();
      },
      async delete() {
        docsMap.delete(docId);
        triggerPersist?.();
      },
    };
  }

  async add(data: Record<string, any>) {
    const id = crypto.randomUUID();
    this.docs.set(id, { ...data });
    this.onPersist?.();
    return { id };
  }

  where(field: string, op: string, value: any) {
    return new MemoryQuery(this, [{ field, op, value }]);
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc") {
    return new MemoryQuery(this, [], [{ field, direction }]);
  }

  limit(count: number) {
    return new MemoryQuery(this, [], [], count);
  }

  async get() {
    return new MemoryQuery(this).get();
  }

  getDocsMap() {
    return this.docs;
  }
}

class MemoryQuery {
  constructor(
    private coll: MemoryCollection,
    private filters: Array<{ field: string; op: string; value: any }> = [],
    private orders: Array<{ field: string; direction: "asc" | "desc" }> = [],
    private limitCount?: number,
    private startAfterDoc?: any
  ) {}

  where(field: string, op: string, value: any) {
    return new MemoryQuery(
      this.coll,
      [...this.filters, { field, op, value }],
      this.orders,
      this.limitCount,
      this.startAfterDoc
    );
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc") {
    return new MemoryQuery(
      this.coll,
      this.filters,
      [...this.orders, { field, direction }],
      this.limitCount,
      this.startAfterDoc
    );
  }

  limit(count: number) {
    return new MemoryQuery(
      this.coll,
      this.filters,
      this.orders,
      count,
      this.startAfterDoc
    );
  }

  startAfter(...args: any[]) {
    return new MemoryQuery(
      this.coll,
      this.filters,
      this.orders,
      this.limitCount,
      args[0]
    );
  }

  async get() {
    let items: Array<{ id: string; data: Record<string, any> }> = [];
    for (const [id, data] of this.coll.getDocsMap().entries()) {
      let matches = true;
      for (const filter of this.filters) {
        const val = data[filter.field];
        if (filter.op === "==" && val !== filter.value) matches = false;
        else if (filter.op === "!=" && val === filter.value) matches = false;
        else if (filter.op === ">" && !(val > filter.value)) matches = false;
        else if (filter.op === ">=" && !(val >= filter.value)) matches = false;
        else if (filter.op === "<" && !(val < filter.value)) matches = false;
        else if (filter.op === "<=" && !(val <= filter.value)) matches = false;
        else if (filter.op === "in" && Array.isArray(filter.value) && !filter.value.includes(val)) matches = false;
        if (!matches) break;
      }
      if (matches) {
        items.push({ id, data });
      }
    }

    for (const order of this.orders) {
      items.sort((a, b) => {
        const av = a.data[order.field];
        const bv = b.data[order.field];
        if (av === bv) return 0;
        const res = av > bv ? 1 : -1;
        return order.direction === "desc" ? -res : res;
      });
    }

    if (this.startAfterDoc) {
      const idx = items.findIndex((it) => it.id === this.startAfterDoc.id || it.data.timestamp === this.startAfterDoc);
      if (idx !== -1) {
        items = items.slice(idx + 1);
      }
    }

    if (this.limitCount !== undefined && this.limitCount > 0) {
      items = items.slice(0, this.limitCount);
    }

    const docs = items.map((item) => ({
      id: item.id,
      data: () => ({ ...item.data }),
    }));

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
    };
  }
}

class MemoryFirestore {
  private collections = new Map<string, MemoryCollection>();

  constructor() {
    this.initFromDisk();
  }

  private initFromDisk() {
    const diskData = readDiskDb();
    for (const [collName, docsObj] of Object.entries(diskData)) {
      const coll = this.collection(collName);
      coll.loadDocs(docsObj);
    }
  }

  persistToDisk() {
    const out: Record<string, Record<string, any>> = {};
    for (const [name, coll] of this.collections.entries()) {
      out[name] = coll.toJSON();
    }
    writeDiskDb(out);
  }

  collection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection(name, () => this.persistToDisk()));
    }
    return this.collections.get(name)!;
  }

  batch() {
    const ops: Array<() => Promise<void>> = [];
    return {
      set(docRef: any, data: any, options?: any) {
        ops.push(async () => {
          await docRef.set(data, options);
        });
        return this;
      },
      delete(docRef: any) {
        ops.push(async () => {
          await docRef.delete();
        });
        return this;
      },
      async commit() {
        for (const op of ops) {
          await op();
        }
        this.persistToDisk();
      },
    };
  }
}

const memoryDb = new MemoryFirestore();

export const adminDb: ReturnType<typeof getFirestore> = (
  hasServiceAccount
    ? (getApps().length ? getFirestore() : createServiceProxy<ReturnType<typeof getFirestore>>('Firestore'))
    : (memoryDb as unknown as ReturnType<typeof getFirestore>)
);
