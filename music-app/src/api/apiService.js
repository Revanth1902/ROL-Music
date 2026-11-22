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
const MUSIC_CATALOG_BASE = 'https://rol-backend.onrender.com/api';
const SEARCH_PRIMARY = 'https://saavn.sumit.co/api';
const SEARCH_FALLBACK = 'https://rol-backend.onrender.com/api';
const SEARCH_TERTIARY = 'https://jiosavvan.vercel.app';

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // Fail fast if Render backend is sleeping
    try {
        const res = await fetch(`${MUSIC_CATALOG_BASE}${path}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.success === false) throw new Error(json.message || 'API error');
        return json?.data ?? json;
    } catch (err) {
        clearTimeout(timeoutId);

        console.error('[backendFetch]', path, err.message);
        return null; // Will trigger fallback in consumer if available
    }
}

async function searchFetch(path) {
    // 1. Try Primary Search API (saavn.sumit.co) with fast 3.2s abort
    const controller1 = new AbortController();
    const timeoutId1 = setTimeout(() => controller1.abort(), 3200);
    try {
        const res = await fetch(`${SEARCH_PRIMARY}${path}`, { signal: controller1.signal });
        clearTimeout(timeoutId1);
        if (res.ok) {
            const json = await res.json();
            if (json && json.success !== false) {
                const data = json.data ?? json;
                if (data) return data;
            }
        }
    } catch (err) {
        clearTimeout(timeoutId1);
        console.warn('[searchFetch Primary failed, switching to Fallback]', path, err.message);
    }

    // 2. Try Fallback Search API: https://rol-backend.onrender.com/api (requested by user)
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 4000);
    try {
        const res = await fetch(`${SEARCH_FALLBACK}${path}`, { signal: controller2.signal });
        clearTimeout(timeoutId2);
        if (res.ok) {
            const json = await res.json();
            if (json && json.success !== false) {
                const data = json.data ?? json;
                if (data) return data;
            }
        }
    } catch (err) {
        clearTimeout(timeoutId2);
        console.warn('[searchFetch Fallback failed]', path, err.message);
    }

    // 3. Try Tertiary JioSaavn directly
    try {
        const res = await fetch(`${SEARCH_TERTIARY}${path}`);
        if (res.ok) {
            const json = await res.json();
            return json?.data ?? json;
        }
    } catch (err) {
        console.warn('[searchFetch Tertiary failed]', path, err.message);
    }

    return null;
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

// ── BATCH song fetch — up to 50 IDs per request ───────
// POST-friendly: jiosavvan supports /songs?id=id1,id2,...
export async function getSongsByIds(ids = []) {
    if (!ids.length) return [];
    const CHUNK = 50;
    const results = [];

    for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK).join(',');
        try {
            const data = await songFetch(`/songs?id=${chunk}`);
            if (!data) continue;
            const arr = Array.isArray(data) ? data : [data];
            arr.forEach(s => {
                const n = normalizeSong(s);
                if (n) results.push(n);
            });
        } catch { /* skip failed chunks */ }
    }
    return results;
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

export async function getTrendingSongs(language = 'hindi') {
    try {
        const modules = await getModules(language);
        const rawSongs = modules?.trending?.songs || [];
        const songs = rawSongs.map(normalizeSong).filter(Boolean);
        if (songs.length > 0) return songs;
        const searchRes = await searchSongs('trending Hindi songs', 0, 20);
        return searchRes?.results || [];
    } catch {
        const searchRes = await searchSongs('top songs', 0, 20);
        return searchRes?.results || [];
    }
}

// ── ALBUM ──────────────────────────────────────────────
// Layer 1: backend (rol-backend) — has richer data for most IDs
// Layer 2: jiosavvan /albums?id= — handles "i-XXXXX" style IDs from modules
export async function getAlbumById(id) {
    if (!id) return null;

    // Layer 1: try our backend first
    const backendData = await backendFetch(`/albums?id=${id}`);
    if (backendData) {
        const album = normalizeAlbum(backendData);
        if (album?.id) return album;
    }

    // Layer 2: fallback to jiosavvan directly (handles "i-XXXX" IDs from modules)
    try {
        const res = await fetch(`${SONG_BASE}/albums?id=${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // jiosavvan album schema: { data: { id, name, songs: [...], ... } }
        const raw = json?.data ?? json;
        if (!raw?.id) return null;

        // Songs inside the jiosavvan album response
        const songs = (raw.songs || []).map(s => normalizeSong(s)).filter(Boolean);
        const cover = getBestImage(raw.image);
        const primaryArtists = raw.artists?.primary || raw.artists?.all || [];
        return {
            id: raw.id,
            title: decodeEntities(raw.name || raw.title || 'Unknown Album'),
            artist: Array.isArray(primaryArtists)
                ? primaryArtists.map(x => decodeEntities(x.name || '')).join(', ')
                : decodeEntities(raw.primaryArtists || ''),
            year: raw.year || raw.releaseDate?.substring(0, 4) || '',
            language: raw.language || '',
            cover,
            songCount: Number(raw.songCount) || songs.length,
            songs,
        };
    } catch (err) {
        console.error('[getAlbumById jiosavvan fallback]', id, err.message);
    }

    return null;
}

// ── ARTIST ────────────────────────────────────────────
// GET https://rol-backend.onrender.com/api/artists/{artistId}
export async function getArtistById(artistId) {
    if (!artistId) return null;
    const data = await backendFetch(`/artists/${artistId}`);
    if (data) {
        const artist = normalizeArtist(data);
        if (artist?.id) return artist;
    }

    // Fallback: query JioSaavn directly
    try {
        const res = await fetch(`${SONG_BASE}/artists?id=${encodeURIComponent(artistId)}`);
        if (res.ok) {
            const json = await res.json();
            const raw = json?.data ?? json;
            if (raw?.id) return normalizeArtist(raw);
        }
    } catch (err) {
        console.warn('[getArtistById fallback error]', err.message);
    }

    return null;
}

// GET https://rol-backend.onrender.com/api/artists/{artistId}/songs?page={page}
// Response: { success, data: { total, songs: [...] } }
export async function getArtistSongs(artistId, page = 1) {
    if (!artistId) return [];
    const data = await backendFetch(`/artists/${artistId}/songs?page=${page}`);
    if (data) {
        const songs = data.songs || data.results || (Array.isArray(data) ? data : []);
        const normalized = songs.map(normalizeSong).filter(Boolean);
        if (normalized.length > 0) return normalized;
    }

    // Fallback: query JioSaavn directly
    try {
        const res = await fetch(`${SONG_BASE}/artists/${encodeURIComponent(artistId)}/songs?page=${page}`);
        if (res.ok) {
            const json = await res.json();
            const raw = json?.data ?? json;
            const songs = raw?.songs || raw?.results || (Array.isArray(raw) ? raw : []);
            return songs.map(normalizeSong).filter(Boolean);
        }
    } catch (err) {
        console.warn('[getArtistSongs fallback error]', err.message);
    }

    return [];
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
    if (data) {
        const pl = normalizePlaylist(data);
        if (pl?.id) return pl;
    }

    // Fallback: query JioSaavn directly
    try {
        const res = await fetch(`${SONG_BASE}/playlists?id=${encodeURIComponent(id)}&page=${page}`);
        if (res.ok) {
            const json = await res.json();
            const raw = json?.data ?? json;
            if (raw?.id) return normalizePlaylist(raw);
        }
    } catch (err) {
        console.warn('[getPlaylistById fallback error]', err.message);
    }

    return null;
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
    const rawList = data.results || data.songs || (Array.isArray(data) ? data : []);
    return {
        results: rawList.map(normalizeSong).filter(Boolean),
        total: data.total || rawList.length,
    };
}

export async function searchAlbums(query, page = 0, limit = 20) {
    const data = await searchFetch(`/search/albums?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    if (!data) return { results: [], total: 0 };
    const rawList = data.results || data.albums || (Array.isArray(data) ? data : []);
    const results = rawList.map(a => normalizeAlbum({
        ...a,
        name: a.name || a.title,
        artists: a.artists,
        image: a.image,
    })).filter(Boolean);
    return { results, total: data.total || rawList.length };
}

export async function searchArtists(query, page = 0, limit = 20) {
    const data = await searchFetch(`/search/artists?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    if (!data) return { results: [], total: 0 };
    const rawList = data.results || data.artists || (Array.isArray(data) ? data : []);
    return {
        results: rawList.map(normalizeSearchArtist).filter(Boolean),
        total: data.total || rawList.length,
    };
}

export async function searchPlaylists(query, page = 0, limit = 20) {
    const data = await searchFetch(`/search/playlists?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    if (!data) return { results: [], total: 0 };
    const rawList = data.results || data.playlists || (Array.isArray(data) ? data : []);
    const results = rawList.map(p => normalizePlaylist({
        ...p,
        title: p.title || p.name,
        image: p.image,
    })).filter(Boolean);
    return { results, total: data.total || rawList.length };
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

// ── SPOTIFY-GRADE RELATED ARTISTS MATRIX ────────────────
const RELATED_ARTISTS_MAP = {
  // Hindi / Bollywood
  'arijit singh': ['Pritam', 'Atif Aslam', 'Mohit Chauhan', 'Jubin Nautiyal', 'B Praak', 'Armaan Malik', 'Shreya Ghoshal', 'Sachin-Jigar'],
  'pritam': ['Arijit Singh', 'Vishal-Shekhar', 'Amit Trivedi', 'Sachin-Jigar', 'Shankar-Ehsaan-Loy', 'Mithoon', 'KK'],
  'atif aslam': ['Arijit Singh', 'Rahat Fateh Ali Khan', 'Mustafa Zahid', 'Ankit Tiwari', 'KK', 'Mohit Chauhan'],
  'jubin nautiyal': ['Arijit Singh', 'B Praak', 'Sachet Tandon', 'Tulsi Kumar', 'Armaan Malik'],
  'b praak': ['Jaani', 'Jubin Nautiyal', 'Arijit Singh', 'Guru Randhawa', 'Harrdy Sandhu'],
  'shreya ghoshal': ['Sunidhi Chauhan', 'Alka Yagnik', 'Shaan', 'Sonu Nigam', 'Arijit Singh'],
  'sonu nigam': ['Shaan', 'Udit Narayan', 'Kumar Sanu', 'Alka Yagnik', 'Shreya Ghoshal', 'A.R. Rahman'],
  'a.r. rahman': ['Arijit Singh', 'Shankar-Ehsaan-Loy', 'Amit Trivedi', 'Mohit Chauhan', 'Harris Jayaraj'],
  'badshah': ['Yo Yo Honey Singh', 'Raftaar', 'Guru Randhawa', 'Divine', 'King', 'MC Stan'],
  'king': ['Anuv Jain', 'Zaeden', 'Mitraz', 'Ritviz', 'Jasleen Royal', 'Kaka'],
  'anuv jain': ['Zaeden', 'King', 'Prateek Kuhad', 'When Chai Met Toast', 'Mitraz', 'The Local Train'],
  'prateek kuhad': ['Anuv Jain', 'When Chai Met Toast', 'The Local Train', 'Lifafa'],

  // English / Western / Pop / Hip-Hop
  'the weeknd': ['Drake', 'Post Malone', 'Travis Scott', 'Frank Ocean', 'Lana Del Rey', 'Kendrick Lamar', 'Dua Lipa'],
  'taylor swift': ['Olivia Rodrigo', 'Gracie Abrams', 'Sabrina Carpenter', 'Billie Eilish', 'Ed Sheeran', 'Lorde'],
  'drake': ['Travis Scott', '21 Savage', 'Future', 'The Weeknd', 'J. Cole', 'Kendrick Lamar', 'Kanye West'],
  'travis scott': ['Drake', 'Don Toliver', 'Playboi Carti', 'Metro Boomin', 'Future', '21 Savage'],
  'post malone': ['The Weeknd', 'Juice WRLD', 'Swae Lee', 'Drake', 'Twenty One Pilots', 'Khalid'],
  'dua lipa': ['Ariana Grande', 'Katy Perry', 'Ava Max', 'Billie Eilish', 'Bebe Rexha', 'Doja Cat'],
  'billie eilish': ['Olivia Rodrigo', 'Finneas', 'Lana Del Rey', 'Girl in Red', 'Lorde', 'Phoebe Bridgers'],
  'ed sheeran': ['Shawn Mendes', 'Charlie Puth', 'Justin Bieber', 'James Arthur', 'Lewis Capaldi', 'OneRepublic'],
  'coldplay': ['Imagine Dragons', 'OneRepublic', 'Maroon 5', 'The Chainsmokers', 'Bastille'],
  'imagine dragons': ['Coldplay', 'OneRepublic', 'Fall Out Boy', 'Panic! At The Disco', 'Twenty One Pilots'],

  // Punjabi
  'sidhu moose wala': ['Karan Aujla', 'AP Dhillon', 'Diljit Dosanjh', 'Shubh', 'Amrit Maan', 'Parmish Verma'],
  'karan aujla': ['Sidhu Moose Wala', 'AP Dhillon', 'Diljit Dosanjh', 'Shubh', 'Jordan Sandhu'],
  'ap dhillon': ['Gurinder Gill', 'Shubh', 'Diljit Dosanjh', 'Karan Aujla', 'Intense'],
  'diljit dosanjh': ['Amrinder Gill', 'Gippy Grewal', 'Guru Randhawa', 'Garry Sandhu'],

  // South Indian (Telugu / Tamil / Kannada / Malayalam)
  'sid sriram': ['Armaan Malik', 'Anurag Kulkarni', 'Ram Miriyala', 'Hesham Abdul Wahab', 'Anirudh Ravichander'],
  'anirudh ravichander': ['Devi Sri Prasad', 'Thaman S', 'G.V. Prakash Kumar', 'Harris Jayaraj', 'Santhosh Narayanan'],
  'devi sri prasad': ['Thaman S', 'Anirudh Ravichander', 'Mani Sharma', 'M.M. Keeravaani'],
  'thaman s': ['Devi Sri Prasad', 'Anirudh Ravichander', 'Mani Sharma', 'M.M. Keeravaani'],
};

// ── SONG FINGERPRINTING & DEDUPLICATION ─────────────────
export function getSongFingerprint(song) {
    if (!song) return '';
    const cleanTitle = (song.title || song.name || '')
        .toLowerCase()
        .replace(/\(.*?\)|\[.*?\]|-.*$/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();

    const primaryArtist = (song.artistName || song.artist || '')
        .toLowerCase()
        .split(',')[0]
        .replace(/[^a-z0-9]/g, '')
        .trim();

    return cleanTitle ? `${cleanTitle}|${primaryArtist}` : '';
}

// ── SPOTIFY-GRADE AUTOPLAY RECOMMENDATIONS ENGINE ───────
export async function getAutoplayRecommendations(currentSong, excludedIds = [], limit = 15) {
    if (!currentSong) return [];

    const excludedSet = new Set((excludedIds || []).map(id => String(id)));
    const addedIds = new Set();
    const addedFingerprints = new Set();

    if (currentSong.id) excludedSet.add(String(currentSong.id));
    const currentFp = getSongFingerprint(currentSong);
    if (currentFp) addedFingerprints.add(currentFp);

    const recommendedSongs = [];

    const addSong = (song) => {
        if (!song || !song.id || !song.title) return false;
        const sId = String(song.id);
        const fp = getSongFingerprint(song);

        // Strict Deduplication: ID AND Fingerprint (Title + Primary Artist)
        if (excludedSet.has(sId) || addedIds.has(sId) || (fp && addedFingerprints.has(fp))) {
            return false;
        }

        addedIds.add(sId);
        if (fp) addedFingerprints.add(fp);

        recommendedSongs.push({
            ...song,
            isAutoplayItem: true,
            radioSeedSong: currentSong.title,
        });
        return true;
    };

    // 1. Primary Artist parsing
    const rawArtist = currentSong.artistName || currentSong.artist || '';
    const artistList = rawArtist.split(',').map(a => a.trim()).filter(Boolean);
    const mainArtist = artistList[0] || 'Unknown Artist';
    const mainArtistLower = mainArtist.toLowerCase();

    // 2. Look up related artists from matrix or fallback
    let relatedArtists = RELATED_ARTISTS_MAP[mainArtistLower];
    if (!relatedArtists || relatedArtists.length === 0) {
        relatedArtists = artistList.slice(1);
    }

    // Always include main artist for seed pool
    const artistQueryPool = [mainArtist, ...(relatedArtists || [])].slice(0, 6);

    // 3. Parallel fetch of songs across related artists
    try {
        const fetchResults = await Promise.all(
            artistQueryPool.map(async (art) => {
                try {
                    const res = await searchSongs(art, 0, 10);
                    return res?.results || [];
                } catch {
                    return [];
                }
            })
        );

        // Interleave songs for balanced Spotify Radio sequence (1 from each artist per round)
        let maxSongsPerArtist = Math.max(0, ...fetchResults.map(r => r.length));
        for (let round = 0; round < maxSongsPerArtist; round++) {
            for (let i = 0; i < fetchResults.length; i++) {
                const song = fetchResults[i][round];
                if (song) addSong(song);
                if (recommendedSongs.length >= limit) break;
            }
            if (recommendedSongs.length >= limit) break;
        }
    } catch (err) {
        console.warn('[SpotifyRadio Engine] parallel fetch error:', err.message);
    }

    // 4. Album matching fallback if pool is still small
    if (recommendedSongs.length < limit && (currentSong.albumId || currentSong.album)) {
        try {
            if (currentSong.albumId) {
                const album = await getAlbumById(currentSong.albumId);
                if (album?.songs) {
                    album.songs.forEach(addSong);
                }
            }
            if (recommendedSongs.length < limit && currentSong.album) {
                const albumResult = await searchSongs(currentSong.album, 0, 10);
                if (albumResult?.results) {
                    albumResult.results.forEach(addSong);
                }
            }
        } catch (err) {
            console.warn('[SpotifyRadio Engine] Album fallback error:', err.message);
        }
    }

    // 5. Language discovery fallback if pool is under limit
    if (recommendedSongs.length < limit) {
        try {
            const lang = (currentSong.language || 'hindi').toLowerCase();
            const mappedLang = LANGUAGE_MAP[lang] || lang || 'hindi';
            const langResult = await searchSongs(mappedLang, 0, 15);
            if (langResult?.results) {
                langResult.results.forEach(addSong);
            }
        } catch (err) {
            console.warn('[SpotifyRadio Engine] Language fallback error:', err.message);
        }
    }

    return recommendedSongs.slice(0, limit);
}


