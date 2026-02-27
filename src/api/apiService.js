/**
 * ROL Music — API Service (v3)
 *
 * Song Play:    https://jiosavvan.vercel.app/songs?id={id}
 * Modules:      https://jiosavvan.vercel.app/modules?language={lang}
 * Album:        https://rol-backend.onrender.com/api/albums?id={id}
 * Artist:       https://rol-backend.onrender.com/api/artists/{artistId}
 * ArtistSongs:  https://rol-backend.onrender.com/api/artists/{artistId}/songs?page={page}
 * Playlist:     https://rol-backend.onrender.com/api/playlists?id={id}&page={page}
 * Search:       https://saavn.sumit.co/api/search/...
 */

const SONG_BASE = 'https://jiosavvan.vercel.app';
const BACKEND_BASE = 'https://rol-backend.onrender.com/api';
const SEARCH_BASE = 'https://saavn.sumit.co/api';

// ── HTML entity decoder ────────────────────────────────
const htmlEntities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#039;': "'", '&apos;': "'",
    '&#x27;': "'", '&#x2F;': '/', '&nbsp;': ' ',
};

export function decodeEntities(str) {
    if (!str || typeof str !== 'string') return str || '';
    return str
        .replace(/&[a-z#0-9]+;/gi, m => htmlEntities[m] ?? m)
        .trim();
}

// ── Image / audio pickers ──────────────────────────────
function pickField(obj, ...keys) {
    for (const k of keys) if (obj && obj[k]) return obj[k];
    return '';
}

function getBestImage(imageArr, prefer = '500x500') {
    if (!Array.isArray(imageArr) || imageArr.length === 0) return '';
    const found = imageArr.find(i => i.quality === prefer) ?? imageArr[imageArr.length - 1];
    return pickField(found, 'url', 'link');        // rol-backend uses .url, jiosavvan uses .link
}

function getBestAudio(downloadUrlArr) {
    if (!Array.isArray(downloadUrlArr) || downloadUrlArr.length === 0) return '';
    const p = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
    for (const q of p) {
        const e = downloadUrlArr.find(i => i.quality === q);
        if (e) return pickField(e, 'url', 'link');
    }
    return pickField(downloadUrlArr[downloadUrlArr.length - 1], 'url', 'link');
}

// ── Generic fetchers ───────────────────────────────────

async function songFetch(path) {
    try {
        const res = await fetch(`${SONG_BASE}${path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.status === 'SUCCESS') return json.data;
        return json;
    } catch (err) {
        console.error('[songFetch]', path, err.message);
        return null;
    }
}

async function backendFetch(path) {
    try {
        const res = await fetch(`${BACKEND_BASE}${path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.success === false) throw new Error(json.message || 'API error');
        return json?.data ?? json;
    } catch (err) {
        console.error('[backendFetch]', path, err.message);
        return null;
    }
}

async function searchFetch(path) {
    try {
        const res = await fetch(`${SEARCH_BASE}${path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json && !json.success) throw new Error(json.message || 'Search error');
        return json?.data ?? null;
    } catch (err) {
        console.error('[searchFetch]', path, err.message);
        return null;
    }
}

// ── Normalizers ────────────────────────────────────────

export function normalizeSong(s) {
    if (!s) return null;
    const cover = getBestImage(s.image);
    const src = getBestAudio(s.downloadUrl);

    // Build artist list: supports {primary:[]}, comma string, or plain array
    let artistArr = [];
    if (Array.isArray(s.artists?.primary) && s.artists.primary.length > 0) {
        artistArr = s.artists.primary;
    } else if (Array.isArray(s.artists?.all) && s.artists.all.length > 0) {
        // fall back to 'all' if primary is empty
        artistArr = s.artists.all.filter(a => a.role === 'singer' || a.role === 'primary_artists');
    } else if (Array.isArray(s.primaryArtists)) {
        artistArr = s.primaryArtists;
    } else if (typeof s.primaryArtists === 'string' && s.primaryArtists) {
        const ids = s.primaryArtistsId?.split(',') || [];
        artistArr = s.primaryArtists.split(',').map((name, i) => ({
            name: name.trim(),
            id: ids[i]?.trim() || '',
        }));
    } else if (typeof s.artists === 'string' && s.artists) {
        artistArr = s.artists.split(',').map(name => ({ name: name.trim(), id: '' }));
    }

    const artistName = artistArr.map(a => decodeEntities(a.name || '')).filter(Boolean).join(', ') || 'Unknown Artist';
    const primaryArtist = artistArr[0] || {};

    return {
        id: s.id,
        title: decodeEntities(s.name || s.title || 'Unknown'),
        artistName,
        artistId: primaryArtist.id || '',
        albumId: s.album?.id || s.albumId || '',
        album: decodeEntities(s.album?.name || (typeof s.album === 'string' ? s.album : '') || ''),
        duration: Number(s.duration) || 0,
        language: s.language || '',
        src,
        cover,
        hasLyrics: Boolean(s.hasLyrics && s.hasLyrics !== 'false'),
        explicitContent: Boolean(s.explicitContent && s.explicitContent !== 0 && s.explicitContent !== '0'),
        playCount: Number(s.playCount) || 0,
        year: s.year || s.releaseDate?.substring(0, 4) || '',
    };
}

export function normalizeAlbum(a) {
    if (!a) return null;
    const primaryArtists = a.artists?.primary || a.artists?.all || [];
    return {
        id: a.id,
        title: decodeEntities(a.name || a.title || 'Unknown Album'),
        artist: Array.isArray(primaryArtists)
            ? primaryArtists.map(x => decodeEntities(x.name || '')).join(', ')
            : decodeEntities(a.primaryArtists || ''),
        year: a.year || a.releaseDate?.substring(0, 4) || '',
        language: a.language || '',
        cover: getBestImage(a.image),
        songCount: Number(a.songCount) || 0,
        songs: (a.songs || []).map(normalizeSong).filter(Boolean),
    };
}

export function normalizePlaylist(p) {
    if (!p) return null;
    return {
        id: p.id,
        title: decodeEntities(p.title || p.name || 'Unknown Playlist'),
        description: decodeEntities(p.description || ''),
        cover: getBestImage(p.image),
        language: p.language || '',
        songCount: Number(p.songCount) || 0,
        songs: (p.songs || []).map(normalizeSong).filter(Boolean),
    };
}

export function normalizeArtist(a) {
    if (!a) return null;
    return {
        id: a.id,
        name: decodeEntities(a.name || 'Unknown Artist'),
        avatar: getBestImage(a.image),  // rol-backend uses .url
        followerCount: Number(a.followerCount) || 0,
        bio: Array.isArray(a.bio)
            ? a.bio.map(b => decodeEntities(b.text || b)).join(' ')
            : decodeEntities(a.bio || ''),
        isVerified: Boolean(a.isVerified),
        dominantLanguage: a.dominantLanguage || '',
        topSongs: (a.topSongs || []).map(normalizeSong).filter(Boolean),
        topAlbums: (a.topAlbums || []).map(normalizeAlbum).filter(Boolean),
    };
}

// For search results – artist only has image field with .url
export function normalizeSearchArtist(a) {
    if (!a) return null;
    const cover = getBestImage(a.image);
    return {
        id: a.id,
        name: decodeEntities(a.name || a.title || 'Unknown Artist'),
        avatar: cover,
        followerCount: Number(a.followerCount) || 0,
        isVerified: Boolean(a.isVerified),
    };
}

// ── SONG ──────────────────────────────────────────────
export async function getSongById(id) {
    if (!id) return null;
    const data = await songFetch(`/songs?id=${id}`);
    if (!data) return null;
    const arr = Array.isArray(data) ? data : [data];
    return arr.map(normalizeSong).find(s => s?.src) || null;
}

// ── MODULES (Home) ─────────────────────────────────────
export async function getModules(language = 'hindi') {
    return songFetch(`/modules?language=${language}`);
}

export async function getModulesMulti(languages = ['hindi']) {
    const results = await Promise.all(
        languages.map(lang => getModules(lang).then(data => ({ language: lang, data })))
    );
    return results.filter(r => r.data !== null);
}

// ── ALBUM ──────────────────────────────────────────────
// GET https://rol-backend.onrender.com/api/albums?id={id}
export async function getAlbumById(id) {
    if (!id) return null;
    const data = await backendFetch(`/albums?id=${id}`);
    return normalizeAlbum(data);
}

// ── ARTIST ────────────────────────────────────────────
// GET https://rol-backend.onrender.com/api/artists/{artistId}
export async function getArtistById(artistId) {
    if (!artistId) return null;
    const data = await backendFetch(`/artists/${artistId}`);
    return normalizeArtist(data);
}

// GET https://rol-backend.onrender.com/api/artists/{artistId}/songs?page={page}
// Response: { success, data: { total, songs: [...] } }
export async function getArtistSongs(artistId, page = 1) {
    if (!artistId) return [];
    const data = await backendFetch(`/artists/${artistId}/songs?page=${page}`);
    if (!data) return [];
    // data is { total, songs: [...] }
    const songs = data.songs || data.results || (Array.isArray(data) ? data : []);
    return songs.map(normalizeSong).filter(Boolean);
}

export async function getAllArtistSongs(artistId, maxPages = 10) {
    const allSongs = [];
    for (let page = 1; page <= maxPages; page++) {
        const songs = await getArtistSongs(artistId, page);
        if (!songs || songs.length === 0) break;
        allSongs.push(...songs);
    }
    return allSongs;
}

// ── PLAYLIST ──────────────────────────────────────────
// GET https://rol-backend.onrender.com/api/playlists?id={id}&page={page}
export async function getPlaylistById(id, page = 1) {
    if (!id) return null;
    const data = await backendFetch(`/playlists?id=${id}&page=${page}`);
    return normalizePlaylist(data);
}

export async function getAllPlaylistSongs(id, maxPages = 20) {
    let meta = null;
    const allSongs = [];
    for (let page = 1; page <= maxPages; page++) {
        const pl = await getPlaylistById(id, page);
        if (!pl) break;
        if (!meta) meta = { id: pl.id, title: pl.title, description: pl.description, cover: pl.cover, language: pl.language };
        if (!pl.songs || pl.songs.length === 0) break;
        allSongs.push(...pl.songs);
        if (pl.songs.length < 10) break;
    }
    return meta ? { ...meta, songs: allSongs, songCount: allSongs.length } : null;
}

// ── SEARCH ────────────────────────────────────────────
export async function globalSearch(query) {
    return searchFetch(`/search?query=${encodeURIComponent(query)}`);
}

export async function searchSongs(query, page = 0, limit = 20) {
    const data = await searchFetch(`/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    if (!data) return { results: [], total: 0 };
    return {
        results: (data.results || []).map(normalizeSong).filter(Boolean),
        total: data.total || 0,
    };
}

export async function searchAlbums(query, page = 0, limit = 20) {
    const data = await searchFetch(`/search/albums?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    if (!data) return { results: [], total: 0 };
    const results = (data.results || []).map(a => normalizeAlbum({
        ...a,
        name: a.name || a.title,
        artists: a.artists,
        image: a.image,
    })).filter(Boolean);
    return { results, total: data.total || 0 };
}

export async function searchArtists(query, page = 0, limit = 20) {
    const data = await searchFetch(`/search/artists?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    if (!data) return { results: [], total: 0 };
    return {
        results: (data.results || []).map(normalizeSearchArtist).filter(Boolean),
        total: data.total || 0,
    };
}

export async function searchPlaylists(query, page = 0, limit = 20) {
    const data = await searchFetch(`/search/playlists?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    if (!data) return { results: [], total: 0 };
    const results = (data.results || []).map(p => normalizePlaylist({
        ...p,
        title: p.title || p.name,
        image: p.image,
    })).filter(Boolean);
    return { results, total: data.total || 0 };
}

// ── LANGUAGE CONFIG ───────────────────────────────────
export const LANGUAGE_MAP = {
    en: 'english', hi: 'hindi', ta: 'tamil', te: 'telugu',
    kn: 'kannada', ml: 'malayalam', mr: 'marathi', pa: 'punjabi',
    gu: 'gujarati', bn: 'bengali', or: 'odia', as: 'assamese',
    bh: 'bhojpuri', ur: 'urdu',
};

export const LANGUAGES = [
    { code: 'hi', label: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
    { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🏳️' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🏳️' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🏳️' },
    { code: 'ml', label: 'Malayalam', native: 'മലയാളം', flag: '🏳️' },
    { code: 'mr', label: 'Marathi', native: 'मराठी', flag: '🏳️' },
    { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🏳️' },
    { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: '🏳️' },
    { code: 'bn', label: 'Bengali', native: 'বাংলা', flag: '🏳️' },
    { code: 'bh', label: 'Bhojpuri', native: 'भोजपुरी', flag: '🏳️' },
    { code: 'ur', label: 'Urdu', native: 'اردو', flag: '🏳️' },
];
