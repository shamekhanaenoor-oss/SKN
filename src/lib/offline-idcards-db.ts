const DB_NAME = "skn_idcards_db";
const DB_VERSION = 3;

interface IdCardCacheEntry {
  entity: string;
  data: any[];
  lastSync: number;
}

interface PhotoCacheEntry {
  url: string;
  base64: string;
  cachedAt: number;
}

interface TemplateCacheEntry {
  key: string;
  entity: string;
  side: "front" | "back";
  base64: string;
  name: string;
  uploadedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("cards")) {
        db.createObjectStore("cards", { keyPath: "entity" });
      }
      if (!db.objectStoreNames.contains("photos")) {
        db.createObjectStore("photos", { keyPath: "url" });
      }
      if (!db.objectStoreNames.contains("templates")) {
        db.createObjectStore("templates", { keyPath: "key" });
      }
    };
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getCachedCards(entity: string): Promise<IdCardCacheEntry | null> {
  try {
    return await withStore<IdCardCacheEntry>("cards", "readonly", (s) => s.get(entity));
  } catch {
    return null;
  }
}

export async function setCachedCards(entity: string, data: any[]): Promise<void> {
  try {
    await withStore<void>("cards", "readwrite", (s) =>
      s.put({ entity, data, lastSync: Date.now() })
    );
  } catch {
    // silent fail
  }
}

export async function getCachedPhoto(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const entry = await withStore<PhotoCacheEntry>("photos", "readonly", (s) => s.get(url));
    return entry ? entry.base64 : null;
  } catch {
    return null;
  }
}

export async function cachePhoto(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const cached = await getCachedPhoto(url);
    if (cached) return cached;

    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    await withStore<void>("photos", "readwrite", (s) =>
      s.put({ url, base64, cachedAt: Date.now() })
    );
    return base64;
  } catch {
    return null;
  }
}

export async function cachePhotos(urls: string[]): Promise<void> {
  await Promise.all(urls.map((url) => cachePhoto(url)));
}

function templateKey(entity: string, side: "front" | "back"): string {
  return `${entity}-${side}`;
}

export async function getTemplate(
  entity: string,
  side: "front" | "back"
): Promise<TemplateCacheEntry | null> {
  try {
    return await withStore<TemplateCacheEntry>("templates", "readonly", (s) =>
      s.get(templateKey(entity, side))
    );
  } catch {
    return null;
  }
}

export async function saveTemplate(
  entity: string,
  side: "front" | "back",
  file: File
): Promise<TemplateCacheEntry | null> {
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const key = templateKey(entity, side);
    const entry: TemplateCacheEntry = {
      key,
      entity,
      side,
      base64,
      name: file.name,
      uploadedAt: Date.now(),
    };
    await withStore<void>("templates", "readwrite", (s) => s.put(entry));
    return entry;
  } catch {
    return null;
  }
}

export async function removeTemplate(entity: string, side: "front" | "back"): Promise<void> {
  try {
    await withStore<void>("templates", "readwrite", (s) => s.delete(templateKey(entity, side)));
  } catch {
    // silent fail
  }
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
