// IndexedDB persistence for matrix file across sessions

const DB_NAME = "tulah-matrix-db";
const STORE_NAME = "matrix-files";
const KEY = "uploaded-matrix";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMatrixFile(file: File): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ name: file.name, buffer: file }, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadMatrixFile(): Promise<File | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => {
        const result = req.result;
        if (!result) { resolve(null); return; }
        const file = new File([result.buffer], result.name, { type: result.buffer.type });
        resolve(file);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearMatrixFile(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(KEY);
    tx.oncomplete = () => resolve();
  });
}
