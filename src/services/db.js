const DB_NAME = 'bookflix_local_db';
const DB_VERSION = 1;

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('bookContents')) {
        db.createObjectStore('bookContents', { keyPath: 'bookId' });
      }
    };
  });
}

export async function getAllCustomBooks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('books', 'readonly');
    const store = tx.objectStore('books');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function saveCustomBook(metadata, content) {
  const db = await openDB();
  
  // Save metadata
  await new Promise((resolve, reject) => {
    const tx = db.transaction('books', 'readwrite');
    const store = tx.objectStore('books');
    const request = store.put(metadata);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });

  // Save content
  await new Promise((resolve, reject) => {
    const tx = db.transaction('bookContents', 'readwrite');
    const store = tx.objectStore('bookContents');
    const request = store.put({
      bookId: metadata.id,
      ...content
    });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  
  return metadata;
}

export async function deleteCustomBook(id) {
  const db = await openDB();
  
  // Delete metadata
  await new Promise((resolve, reject) => {
    const tx = db.transaction('books', 'readwrite');
    const store = tx.objectStore('books');
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });

  // Delete content
  await new Promise((resolve, reject) => {
    const tx = db.transaction('bookContents', 'readwrite');
    const store = tx.objectStore('bookContents');
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getCustomBookContent(bookId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookContents', 'readonly');
    const store = tx.objectStore('bookContents');
    const request = store.get(bookId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
