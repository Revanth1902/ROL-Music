import MP3Tag from 'mp3tag.js';
import { getSongById, searchSongs } from '../api/apiService';

// Subscribers for download progress toasts across components
const listeners = new Set();

export function subscribeDownloadProgress(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyDownloadProgress(state) {
  listeners.forEach(fn => {
    try {
      fn(state);
    } catch (e) {
      console.warn('[downloadProgress notify error]', e);
    }
  });
}

export const sanitizeFilename = (s) =>
  (s || '')
    .replace(/[&<>"'[\]/\\:;*?|]/g, (c) => ({ '&': 'and' }[c] ?? ''))
    .trim()
    .replace(/  +/g, ' ');

// Resolve song source if not already present
export async function resolveSongSrc(song) {
  if (song?.src) return song;
  if (!song?.id && !song?.title) return song;

  try {
    if (song?.id) {
      const full = await getSongById(song.id);
      if (full?.src) return { ...song, ...full };
    }
    if (song?.title) {
      const res = await searchSongs(`${song.title} ${song.artistName || ''}`.trim(), 0, 5);
      const match = res?.results?.find(s => s.id === song.id) || res?.results?.[0];
      if (match?.src) return { ...song, ...match };
    }
  } catch (err) {
    console.warn('[resolveSongSrc error]', err);
  }
  return song;
}

/**
 * Downloads a song with ID3 tags & cover art directly to local disk as a blob.
 * Avoids opening the MP3 stream in a separate browser tab.
 */
export async function downloadSongWithMetadata(inputSong) {
  if (!inputSong) return;

  const cleanTitle = sanitizeFilename(inputSong.title) || 'Song';
  const cleanArtist = sanitizeFilename(inputSong.artistName) || 'Artist';
  const filename = `${cleanTitle} - ${cleanArtist}.mp3`;

  notifyDownloadProgress({ name: cleanTitle, progress: 5, done: false });

  try {
    let song = inputSong;
    if (!song.src) {
      notifyDownloadProgress({ name: cleanTitle, progress: 15, done: false });
      song = await resolveSongSrc(inputSong);
    }

    if (!song?.src) {
      notifyDownloadProgress(null);
      alert('Unable to resolve audio source for download.');
      return;
    }

    notifyDownloadProgress({ name: cleanTitle, progress: 25, done: false });

    // Fetch the audio stream
    const audioRes = await fetch(song.src);
    if (!audioRes.ok) throw new Error(`HTTP error ${audioRes.status}`);

    const total = Number(audioRes.headers.get('Content-Length')) || 0;
    const reader = audioRes.body?.getReader();

    let chunks = [];
    let received = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) {
          const streamPercent = 25 + Math.round((received / total) * 55); // 25% -> 80%
          notifyDownloadProgress({ name: cleanTitle, progress: streamPercent, done: false });
        }
      }
    } else {
      const arrayBuf = await audioRes.arrayBuffer();
      chunks = [new Uint8Array(arrayBuf)];
      received = arrayBuf.byteLength;
    }

    const audioBuffer = new Uint8Array(received);
    let pos = 0;
    for (const chunk of chunks) {
      audioBuffer.set(chunk, pos);
      pos += chunk.length;
    }

    notifyDownloadProgress({ name: cleanTitle, progress: 85, done: false });

    // Embed ID3 tags
    try {
      const mp3tag = new MP3Tag(audioBuffer.buffer);
      mp3tag.read();
      if (!mp3tag.tags.v2) mp3tag.tags.v2 = {};

      mp3tag.tags.v2.TIT2 = cleanTitle;
      mp3tag.tags.v2.TPE1 = cleanArtist;
      mp3tag.tags.v2.TALB = sanitizeFilename(song.album) || 'ROL Music';
      mp3tag.tags.v2.TCON = song.genre || 'Music';
      mp3tag.tags.v2.TPUB = 'ROL Music';
      mp3tag.tags.v2.TCOP = 'ROL Music';
      mp3tag.tags.v2.TENC = 'ROL Music';
      mp3tag.tags.v2.TCOM = song.composer || cleanArtist;

      if (song.year) mp3tag.tags.v2.TYER = String(song.year);
      if (song.language) mp3tag.tags.v2.TLAN = song.language;

      if (song.cover) {
        try {
          const coverBuffer = await fetch(song.cover).then(r => r.arrayBuffer());
          mp3tag.tags.v2.APIC = [
            {
              format: 'image/jpeg',
              type: 3,
              description: 'Cover',
              data: new Uint8Array(coverBuffer),
            },
          ];
        } catch (coverErr) {
          console.warn('[Cover tagging skipped]', coverErr);
        }
      }

      notifyDownloadProgress({ name: cleanTitle, progress: 95, done: false });
      mp3tag.save();

      const taggedBlob = new window.Blob([mp3tag.buffer], { type: 'audio/mpeg' });
      triggerBlobDownload(taggedBlob, filename);
    } catch (tagErr) {
      console.warn('[Tagging fallback to raw blob]', tagErr);
      const pureBlob = new window.Blob([audioBuffer], { type: 'audio/mpeg' });
      triggerBlobDownload(pureBlob, filename);
    }

    notifyDownloadProgress({ name: cleanTitle, progress: 100, done: true });
    setTimeout(() => notifyDownloadProgress(null), 3500);
  } catch (err) {
    console.error('[Download Song Error]', err);
    notifyDownloadProgress(null);
    // Absolute last fallback if browser blocks stream
    if (inputSong?.src) {
      window.open(inputSong.src, '_blank');
    }
  }
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
