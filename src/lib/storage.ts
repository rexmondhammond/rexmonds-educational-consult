import { useCallback, useEffect, useRef, useState } from "react";

/** localStorage-backed state that never throws (private mode, sandboxed iframes, quota). */
export function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? ({ ...(typeof initial === "object" && initial !== null && !Array.isArray(initial) ? initial : {}), ...JSON.parse(raw) } as T) : initial;
    } catch {
      return initial;
    }
  });

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: keep in-memory state only */
    }
  }, [key, value]);

  const set = useCallback((v: T | ((prev: T) => T)) => setValue(v), []);
  return [value, set];
}

/* ───────────── IndexedDB blob store (recorded lessons, Classroom cache) ───────────── */

const DB_NAME = "rexmond-vault";
const STORE = "blobs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB error"));
  });
}

// In-memory fallback so features still work when IndexedDB is blocked.
const memoryBlobs = new Map<string, Blob>();

export async function putBlob(key: string, blob: Blob): Promise<"idb" | "memory"> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("write failed"));
    });
    db.close();
    return "idb";
  } catch {
    memoryBlobs.set(key, blob);
    return "memory";
  }
}

export async function getBlob(key: string): Promise<Blob | null> {
  const mem = memoryBlobs.get(key);
  if (mem) return mem;
  try {
    const db = await openDb();
    const result = await new Promise<Blob | null>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error("read failed"));
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function deleteBlob(key: string): Promise<void> {
  memoryBlobs.delete(key);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("delete failed"));
    });
    db.close();
  } catch {
    /* nothing to delete */
  }
}

export async function totalBlobBytes(): Promise<number> {
  let total = 0;
  memoryBlobs.forEach((b) => (total += b.size));
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const v = cursor.value as Blob;
          total += v.size;
          cursor.continue();
        } else resolve();
      };
      req.onerror = () => reject(req.error ?? new Error("cursor failed"));
    });
    db.close();
  } catch {
    /* ignore */
  }
  return total;
}

export const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};
