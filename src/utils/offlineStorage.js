/**
 * In-App IndexedDB Offline Storage Utility
 * Allows web application users to save audio tracks and metadata locally for offline playback
 */

const DB_NAME = 'ROLMusicOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_tracks';

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveSongOffline = async (song) => {
  if (!song || !song.id || !song.src) {
    throw new Error('Invalid song object for offline storage');
  }

  const db = await openDB();

  // Fetch audio blob
  const response = await fetch(song.src);
  const audioBlob = await response.blob();

  const record = {
    id: String(song.id),
    title: song.title || 'Untitled',
    artist: song.artistName || song.artist || 'Unknown Artist',
    album: song.album || '',
    cover: song.cover || '',
    duration: song.duration || 0,
    audioBlob: audioBlob,
    savedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
};

export const getOfflineSongs = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = req.result || [];
        // Map stored records into playable song objects with Blob URLs
        const playableSongs = records.map(r => ({
          id: r.id,
          title: r.title,
          artistName: r.artist,
          album: r.album,
          cover: r.cover,
          duration: r.duration,
          src: URL.createObjectURL(r.audioBlob),
          isOffline: true,
          savedAt: r.savedAt,
        }));
        resolve(playableSongs);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[offlineStorage] failed to get offline songs:', err);
    return [];
  }
};

export const isSongSavedOffline = async (songId) => {
  if (!songId) return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(songId));

      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
};

export const removeOfflineSong = async (songId) => {
  if (!songId) return false;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(String(songId));

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
};
