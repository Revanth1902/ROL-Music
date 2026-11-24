/**
 * ROL Music — API Service (v3)
 *
 * Primary API:   https://saavn.sumit.co/api
 * Fallback API:  https://rol-backend.onrender.com/api
 * Tertiary API:  https://jiosavvan.vercel.app
 */

const API_PRIMARY = 'https://saavn.sumit.co/api';
const API_FALLBACK = 'https://rol-backend.onrender.com/api';
const API_TERTIARY = 'https://jiosavvan.vercel.app';

// Compatibility aliases
const SONG_BASE = API_TERTIARY;
const MUSIC_CATALOG_BASE = API_FALLBACK;
const SEARCH_PRIMARY = API_PRIMARY;
const SEARCH_FALLBACK = API_FALLBACK;
const SEARCH_TERTIARY = API_TERTIARY;

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

// ── Unified Multi-Tier API Fetcher with Auto-Fallback ──────
// 1. Primary:   Sumit's Saavn API (saavn.sumit.co/api)
// 2. Fallback:  rol-backend.onrender.com/api (requested by user)
// 3. Tertiary:  jiosavvan.vercel.app

export async function apiFetch(path, { timeoutPrimary = 3500, timeoutFallback = 4500 } = {}) {
    // 1. Primary: Sumit's Saavn API (saavn.sumit.co/api)
    const ctrl1 = new AbortController();
    const timer1 = setTimeout(() => ctrl1.abort(), timeoutPrimary);
    try {
        const res = await fetch(`${API_PRIMARY}${path}`, { signal: ctrl1.signal });
        clearTimeout(timer1);
        if (res.ok) {
            const json = await res.json();
            if (json && json.success !== false && json.status !== 'FAILED') {
                const data = json.data !== undefined ? json.data : json;
                if (data !== null && data !== undefined) return data;
            }
        }
    } catch (err) {
        clearTimeout(timer1);
        console.warn(`[Primary saavn.sumit.co failed on ${path}]:`, err.message);
    }

    // 2. Fallback: rol-backend.onrender.com/api
    const ctrl2 = new AbortController();
    const timer2 = setTimeout(() => ctrl2.abort(), timeoutFallback);
    try {
        const res = await fetch(`${API_FALLBACK}${path}`, { signal: ctrl2.signal });
        clearTimeout(timer2);
        if (res.ok) {
            const json = await res.json();
            if (json && json.success !== false && json.status !== 'FAILED') {
                const data = json.data !== undefined ? json.data : json;
                if (data !== null && data !== undefined) return data;
            }
        }
    } catch (err) {
        clearTimeout(timer2);
        console.warn(`[Fallback rol-backend failed on ${path}]:`, err.message);
    }

    // 3. Tertiary: jiosavvan.vercel.app
    try {
        const res = await fetch(`${API_TERTIARY}${path}`);
        if (res.ok) {
            const json = await res.json();
            const data = json.data !== undefined ? json.data : json;
            if (data !== null && data !== undefined) return data;
        }
    } catch (err) {
        console.warn(`[Tertiary jiosavvan failed on ${path}]:`, err.message);
    }

    return null;
}

const songFetch = (path) => apiFetch(path);
const backendFetch = (path) => apiFetch(path);
const searchFetch = (path) => apiFetch(path);

// ── Normalizers ────────────────────────────────────────

export function normalizeSong(s) {
    if (!s) return null;
    const cover = getBestImage(s.image || s.images) || s.albumCover || s.cover || '';
    const src = getBestAudio(s.downloadUrl || s.download_url) || s.media_url || s.audioUrl || s.src || '';

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
    const normalizedArtists = artistArr.map(a => ({
        id: a.id || '',
        name: decodeEntities(a.name || ''),
        role: a.role || '',
    })).filter(a => a.name);

    return {
        id: s.id,
        title: decodeEntities(s.name || s.title || 'Unknown'),
        artistName,
        artistId: primaryArtist.id || s.artistId || s.artist_id || s.more_info?.artist_id || '',
        artists: normalizedArtists,
        albumId: s.album?.id || s.albumId || s.album_id || s.more_info?.album_id || s.albumid || '',
        album: decodeEntities(s.album?.name || s.more_info?.album || (typeof s.album === 'string' ? s.album : '') || ''),
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
    const primaryArtists = a.artists?.primary || a.artists?.all || (Array.isArray(a.artists) ? a.artists : []) || [];
    return {
        id: a.id,
        title: decodeEntities(a.name || a.title || 'Unknown Album'),
        artist: Array.isArray(primaryArtists)
            ? primaryArtists.map(x => decodeEntities(x.name || '')).join(', ')
            : decodeEntities(a.primaryArtists || ''),
        year: a.year || a.releaseDate?.substring(0, 4) || '',
        language: a.language || '',
        cover: getBestImage(a.image),
        songCount: Number(a.songCount) || (a.songs ? a.songs.length : 0),
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
        name: decodeEntities(a.name || a.title || 'Unknown Artist'),
        avatar: getBestImage(a.image || a.avatar),
        followerCount: Number(a.followerCount || a.fan_count || a.follower_count) || 0,
        bio: Array.isArray(a.bio)
            ? a.bio.map(b => decodeEntities(b.text || b)).join(' ')
            : decodeEntities(a.bio || ''),
        isVerified: Boolean(a.isVerified),
        dominantLanguage: a.dominantLanguage || '',
        topSongs: (a.topSongs || a.songs || a.top_songs || []).map(normalizeSong).filter(Boolean),
        topAlbums: (a.topAlbums || a.albums || a.top_albums || []).map(normalizeAlbum).filter(Boolean),
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
export async function getAlbumById(id) {
    if (!id) return null;

    let data = await apiFetch(`/albums?id=${encodeURIComponent(id)}`);
    if (!data || !data.id) {
        data = await apiFetch(`/albums/${encodeURIComponent(id)}`);
    }
    if (data) {
        const album = normalizeAlbum(data);
        if (album?.id) return album;
    }

    return null;
}

// ── ARTIST ────────────────────────────────────────────
export async function getArtistById(artistId) {
    if (!artistId) return null;
    let data = await apiFetch(`/artists?id=${encodeURIComponent(artistId)}`);
    if (!data || !data.id) {
        data = await apiFetch(`/artists/${encodeURIComponent(artistId)}`);
    }
    if (data) {
        const artist = normalizeArtist(data);
        if (artist?.id) return artist;
    }

    return null;
}

export async function getArtistSongs(artistId, page = 1) {
    if (!artistId) return [];
    let data = await apiFetch(`/artists?id=${encodeURIComponent(artistId)}&page=${page}`);
    if (!data || (Array.isArray(data) && data.length === 0)) {
        data = await apiFetch(`/artists/${encodeURIComponent(artistId)}/songs?page=${page}`);
    }
    if (data) {
        const songs = data.songs || data.results || (Array.isArray(data) ? data : []);
        const normalized = songs.map(normalizeSong).filter(Boolean);
        if (normalized.length > 0) return normalized;
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
export async function getPlaylistById(id, page = 1) {
    if (!id) return null;
    let data = await apiFetch(`/playlists?id=${encodeURIComponent(id)}&page=${page}`);
    if (!data || !data.id) {
        data = await apiFetch(`/playlists/${encodeURIComponent(id)}?page=${page}`);
    }
    if (data) {
        const pl = normalizePlaylist(data);
        if (pl?.id) return pl;
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

// ── LANGUAGE AFFINITY DEFAULTS ────────────────────────
const LANGUAGE_AFFINITY_MAP = {
  hindi: ['Arijit Singh', 'Pritam', 'Atif Aslam', 'Shreya Ghoshal', 'KK', 'Mohit Chauhan', 'Jubin Nautiyal', 'Vishal Mishra'],
  telugu: ['Sid Sriram', 'Anurag Kulkarni', 'Ram Miriyala', 'Devi Sri Prasad', 'Thaman S', 'Armaan Malik', 'Anirudh Ravichander'],
  tamil: ['Anirudh Ravichander', 'Yuvan Shankar Raja', 'Harris Jayaraj', 'Sid Sriram', 'Santhosh Narayanan', 'Pradeep Kumar'],
  punjabi: ['Sidhu Moose Wala', 'Karan Aujla', 'AP Dhillon', 'Diljit Dosanjh', 'Shubh', 'B Praak', 'Guru Randhawa'],
  english: ['The Weeknd', 'Taylor Swift', 'Post Malone', 'Drake', 'Billie Eilish', 'Dua Lipa', 'Ed Sheeran', 'Coldplay'],
  malayalam: ['Sushin Shyam', 'Hesham Abdul Wahab', 'Shaan Rahman', 'Gopi Sundar', 'Vineeth Sreenivasan'],
  kannada: ['Ravi Basrur', 'B. Ajaneesh Loknath', 'Arjun Janya', 'Sanjith Hegde', 'Charan Raj'],
  marathi: ['Ajay-Atul', 'Avadhoot Gupte', 'Swapnil Bandodkar', 'Adarsh Shinde'],
  bengali: ['Anupam Roy', 'Arijit Singh', 'Shreya Ghoshal', 'Rupam Islam', 'Jeet Gannguli'],
  bhojpuri: ['Pawan Singh', 'Khesari Lal Yadav', 'Shilpi Raj', 'Manoj Tiwari'],
};

// ── SPOTIFY-GRADE RELATED ARTISTS MATRIX ────────────────
const RELATED_ARTISTS_MAP = {
  // Hindi / Bollywood Modern & Romantic
  'arijit singh': ['Pritam', 'Atif Aslam', 'Mohit Chauhan', 'Jubin Nautiyal', 'B Praak', 'Armaan Malik', 'Shreya Ghoshal', 'Sachin-Jigar', 'Vishal Mishra', 'KK'],
  'pritam': ['Arijit Singh', 'Vishal-Shekhar', 'Amit Trivedi', 'Sachin-Jigar', 'Shankar-Ehsaan-Loy', 'Mithoon', 'KK', 'Atif Aslam'],
  'atif aslam': ['Arijit Singh', 'Rahat Fateh Ali Khan', 'Mustafa Zahid', 'Ankit Tiwari', 'KK', 'Mohit Chauhan', 'Jal The Band', 'Pritam'],
  'jubin nautiyal': ['Arijit Singh', 'B Praak', 'Sachet Tandon', 'Tulsi Kumar', 'Armaan Malik', 'Stebin Ben', 'Mithoon'],
  'b praak': ['Jaani', 'Jubin Nautiyal', 'Arijit Singh', 'Guru Randhawa', 'Harrdy Sandhu', 'Jasleen Royal', 'Ammy Virk'],
  'shreya ghoshal': ['Sunidhi Chauhan', 'Alka Yagnik', 'Shaan', 'Sonu Nigam', 'Arijit Singh', 'Monali Thakur', 'Shilpa Rao'],
  'sunidhi chauhan': ['Shreya Ghoshal', 'Neha Kakkar', 'Monali Thakur', 'Alka Yagnik', 'Vishal Dadlani'],
  'sonu nigam': ['Shaan', 'Udit Narayan', 'Kumar Sanu', 'Alka Yagnik', 'Shreya Ghoshal', 'A.R. Rahman', 'Abhijeet Bhattacharya', 'KK'],
  'kumar sanu': ['Udit Narayan', 'Alka Yagnik', 'Anuradha Paudwal', 'Sonu Nigam', 'Sadhana Sargam', 'Nadeem-Shravan', 'Abhijeet Bhattacharya'],
  'udit narayan': ['Kumar Sanu', 'Alka Yagnik', 'Kavita Krishnamurthy', 'Sonu Nigam', 'Jatin-Lalit', 'Anuradha Paudwal'],
  'alka yagnik': ['Kumar Sanu', 'Udit Narayan', 'Kavita Krishnamurthy', 'Sonu Nigam', 'Shreya Ghoshal', 'Sadhana Sargam'],
  'kk': ['Mohit Chauhan', 'Shaan', 'Lucky Ali', 'Atif Aslam', 'Pritam', 'Vishal-Shekhar', 'Javed Ali', 'Arijit Singh'],
  'mohit chauhan': ['Lucky Ali', 'KK', 'Papon', 'Arijit Singh', 'A.R. Rahman', 'Rabbi Shergill', 'Shaan'],
  'lucky ali': ['Mohit Chauhan', 'KK', 'Euphoria', 'Silk Route', 'The Local Train', 'Strings', 'Papon'],
  'a.r. rahman': ['Shankar-Ehsaan-Loy', 'Amit Trivedi', 'Mohit Chauhan', 'Harris Jayaraj', 'Javed Ali', 'Hariharan', 'Arijit Singh'],
  'vishal mishra': ['Arijit Singh', 'Jubin Nautiyal', 'B Praak', 'Sachet-Parampara', 'Mithoon', 'Sachin-Jigar'],
  'sachin-jigar': ['Amit Trivedi', 'Pritam', 'Vishal-Shekhar', 'Tanishk Bagchi', 'Arijit Singh'],
  'amit trivedi': ['Sachin-Jigar', 'Shankar-Ehsaan-Loy', 'Sneha Khanwalkar', 'A.R. Rahman', 'Pritam'],
  'armaan malik': ['Amaal Mallik', 'Arijit Singh', 'Darshan Raval', 'Jubin Nautiyal', 'Sanam', 'Sid Sriram'],
  'darshan raval': ['Armaan Malik', 'Asim Azhar', 'Stebin Ben', 'Arijit Singh', 'Jubin Nautiyal'],

  // Hindi Indie / Lo-Fi / Acoustic
  'anuv jain': ['Zaeden', 'King', 'Prateek Kuhad', 'When Chai Met Toast', 'Mitraz', 'The Local Train', 'Twin Strings'],
  'prateek kuhad': ['Anuv Jain', 'When Chai Met Toast', 'The Local Train', 'Lifafa', 'Bharat Chauhan', 'Jasleen Royal'],
  'the local train': ['Parvaaz', 'Lifafa', 'When Chai Met Toast', 'Anuv Jain', 'Indian Ocean', 'Lucky Ali'],
  'king': ['Anuv Jain', 'Zaeden', 'Mitraz', 'Ritviz', 'Jasleen Royal', 'Badshah', 'Paradox'],
  'ritviz': ['Nucleya', 'Lost Stories', 'Mitraz', 'Zaeden', 'OAFF', 'Savera', 'King'],
  'mitraz': ['Zaeden', 'King', 'Anuv Jain', 'Twin Strings', 'Aditya Rikhari', 'Ritviz'],
  'aditya rikhari': ['Mitraz', 'Anuv Jain', 'Zaeden', 'Osho Jain', 'Piyush Bhisekar', 'Twin Strings'],
  'zaeden': ['King', 'Lost Stories', 'Anuv Jain', 'Ritviz', 'Mitraz', 'Twin Strings'],
  'when chai met toast': ['Prateek Kuhad', 'Anuv Jain', 'The Local Train', 'Sanah Moidutty'],

  // Desi Hip-Hop / Rap
  'badshah': ['Yo Yo Honey Singh', 'Raftaar', 'Guru Randhawa', 'Divine', 'King', 'MC Stan', 'Ikka'],
  'yo yo honey singh': ['Badshah', 'Raftaar', 'Guru Randhawa', 'Imran Khan', 'Alfaaz', 'Mika Singh'],
  'divine': ['Naezy', 'Seedhe Maut', 'KR$NA', 'Raftaar', 'EPR', 'MC Stan', 'Prabh Deep'],
  'kr$na': ['Seedhe Maut', 'Divine', 'Raftaar', 'Karma', 'Brodha V', 'Bella', 'Talwiinder'],
  'seedhe maut': ['KR$NA', 'Prabh Deep', 'Chaar Diwaari', 'Talwiinder', 'Frappe Ash', 'Rawal', 'Divine'],
  'mc stan': ['Divine', 'Emiway Bantai', 'Munawar Faruqui', 'Paradox', 'King', 'Raftaar'],
  'emiway bantai': ['MC Stan', 'Divine', 'Raftaar', 'Yo Yo Honey Singh', 'Bohemia', 'Munawar Faruqui'],
  'talwiinder': ['Hasan Raheem', 'Shubh', 'AP Dhillon', 'Wazir Patar', 'NseeB', 'Seedhe Maut'],

  // Punjabi
  'sidhu moose wala': ['Karan Aujla', 'AP Dhillon', 'Diljit Dosanjh', 'Shubh', 'Amrit Maan', 'Parmish Verma', 'Prem Dhillon'],
  'karan aujla': ['Sidhu Moose Wala', 'AP Dhillon', 'Diljit Dosanjh', 'Shubh', 'Jordan Sandhu', 'Jerry'],
  'ap dhillon': ['Gurinder Gill', 'Shubh', 'Diljit Dosanjh', 'Karan Aujla', 'Intense', 'Shinda Kahlon'],
  'diljit dosanjh': ['Amrinder Gill', 'Gippy Grewal', 'Guru Randhawa', 'Garry Sandhu', 'Karan Aujla', 'AP Dhillon'],
  'shubh': ['AP Dhillon', 'Karan Aujla', 'Sidhu Moose Wala', 'Jerry', 'Jordan Sandhu', 'Talwiinder'],
  'guru randhawa': ['Harrdy Sandhu', 'Badshah', 'Jassie Gill', 'Millind Gaba', 'Akhil', 'B Praak'],
  'harrdy sandhu': ['B Praak', 'Jaani', 'Guru Randhawa', 'Jassie Gill', 'Parmish Verma', 'Ammy Virk'],

  // Telugu
  'sid sriram': ['Anurag Kulkarni', 'Ram Miriyala', 'Armaan Malik', 'Hesham Abdul Wahab', 'Anirudh Ravichander', 'Devi Sri Prasad'],
  'anirudh ravichander': ['Devi Sri Prasad', 'Thaman S', 'G.V. Prakash Kumar', 'Harris Jayaraj', 'Santhosh Narayanan'],
  'devi sri prasad': ['Thaman S', 'Anirudh Ravichander', 'Mani Sharma', 'M.M. Keeravaani', 'Mickey J Meyer'],
  'thaman s': ['Devi Sri Prasad', 'Anirudh Ravichander', 'Mani Sharma', 'M.M. Keeravaani', 'G.V. Prakash Kumar'],
  'ram miriyala': ['Mangli', 'Anurag Kulkarni', 'Sid Sriram', 'Rahul Sipligunj', 'Anthony Daasan', 'Devi Sri Prasad'],
  'anurag kulkarni': ['Sid Sriram', 'Ram Miriyala', 'Armaan Malik', 'Haricharan', 'Karthik', 'Thaman S'],
  'm.m. keeravaani': ['Devi Sri Prasad', 'Mani Sharma', 'Ilaiyaraaja', 'A.R. Rahman', 'Thaman S'],

  // Tamil
  'yuvan shankar raja': ['Harris Jayaraj', 'Anirudh Ravichander', 'Santhosh Narayanan', 'Ilaiyaraaja', 'Vidyasagar', 'G.V. Prakash Kumar'],
  'harris jayaraj': ['Yuvan Shankar Raja', 'Anirudh Ravichander', 'A.R. Rahman', 'D. Imman', 'G.V. Prakash Kumar'],
  'santhosh narayanan': ['Anirudh Ravichander', 'Sean Roldan', 'Yuvan Shankar Raja', 'Pradeep Kumar', 'Dhibu Ninan Thomas'],
  'pradeep kumar': ['Sean Roldan', 'Santhosh Narayanan', 'Sid Sriram', 'Dhibu Ninan Thomas', 'Haricharan'],
  'hiphop tamizha': ['Anirudh Ravichander', 'Yuvan Shankar Raja', 'G.V. Prakash Kumar', 'D. Imman'],

  // Malayalam
  'sushin shyam': ['Hesham Abdul Wahab', 'Vishnu Vijay', 'Shaan Rahman', 'Jakes Bejoy', 'Gopi Sundar', 'Rex Vijayan'],
  'hesham abdul wahab': ['Sushin Shyam', 'Sid Sriram', 'Shaan Rahman', 'Gopi Sundar', 'Sachin Warrier'],
  'shaan rahman': ['Sushin Shyam', 'Gopi Sundar', 'Vineeth Sreenivasan', 'Sachin Warrier'],
  'gopi sundar': ['Shaan Rahman', 'Sushin Shyam', 'Jakes Bejoy', 'Deepak Dev'],

  // Kannada
  'ravi basrur': ['B. Ajaneesh Loknath', 'Arjun Janya', 'Charan Raj', 'Sanjith Hegde', 'Vasuki Vaibhav'],
  'b. ajaneesh loknath': ['Ravi Basrur', 'Charan Raj', 'Arjun Janya', 'Midhun Mukundan'],
  'arjun janya': ['Ravi Basrur', 'B. Ajaneesh Loknath', 'Sanjith Hegde', 'V. Harikrishna'],
  'sanjith hegde': ['Charan Raj', 'Vasuki Vaibhav', 'Sid Sriram', 'Raghu Dixit'],

  // Western / Global Pop / Hip-Hop / EDM
  'the weeknd': ['Drake', 'Post Malone', 'Travis Scott', 'Frank Ocean', 'Lana Del Rey', 'Kendrick Lamar', 'Dua Lipa', 'SZA'],
  'taylor swift': ['Olivia Rodrigo', 'Gracie Abrams', 'Sabrina Carpenter', 'Billie Eilish', 'Ed Sheeran', 'Lorde', 'Phoebe Bridgers'],
  'drake': ['Travis Scott', '21 Savage', 'Future', 'The Weeknd', 'J. Cole', 'Kendrick Lamar', 'Kanye West', 'Metro Boomin'],
  'travis scott': ['Drake', 'Don Toliver', 'Playboi Carti', 'Metro Boomin', 'Future', '21 Savage', 'Kendrick Lamar'],
  'post malone': ['The Weeknd', 'Juice WRLD', 'Swae Lee', 'Drake', 'Twenty One Pilots', 'Khalid', 'Kid LAROI'],
  'dua lipa': ['Ariana Grande', 'Katy Perry', 'Ava Max', 'Billie Eilish', 'Bebe Rexha', 'Doja Cat', 'Miley Cyrus'],
  'billie eilish': ['Olivia Rodrigo', 'Finneas', 'Lana Del Rey', 'Girl in Red', 'Lorde', 'Phoebe Bridgers', 'Conan Gray'],
  'olivia rodrigo': ['Billie Eilish', 'Sabrina Carpenter', 'Conan Gray', 'Gracie Abrams', 'Tate McRae', 'Taylor Swift'],
  'sabrina carpenter': ['Olivia Rodrigo', 'Dua Lipa', 'Ariana Grande', 'Tate McRae', 'Madison Beer', 'Camila Cabello'],
  'ed sheeran': ['Shawn Mendes', 'Charlie Puth', 'Justin Bieber', 'James Arthur', 'Lewis Capaldi', 'OneRepublic'],
  'justin bieber': ['Shawn Mendes', 'Charlie Puth', 'Zayn', 'The Weeknd', 'Khalid', 'DJ Snake'],
  'coldplay': ['Imagine Dragons', 'OneRepublic', 'Maroon 5', 'The Chainsmokers', 'Bastille', 'Snow Patrol'],
  'imagine dragons': ['Coldplay', 'OneRepublic', 'Fall Out Boy', 'Panic! At The Disco', 'Twenty One Pilots'],
  'bruno mars': ['Anderson .Paak', 'The Weeknd', 'Justin Timberlake', 'Michael Jackson', 'Mark Ronson'],
  'eminem': ['50 Cent', 'Dr. Dre', 'Snoop Dogg', 'Kendrick Lamar', '2Pac', 'Jay-Z', 'NF'],
  'kendrick lamar': ['J. Cole', 'Kanye West', 'Drake', 'Travis Scott', 'Baby Keem', 'A$AP Rocky'],
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

export async function getSongSuggestions(songId) {
    if (!songId) return [];
    try {
        let data = await apiFetch(`/songs/${encodeURIComponent(songId)}/suggestions`, { timeoutPrimary: 2200, timeoutFallback: 2500 });
        if (!data || (Array.isArray(data) && data.length === 0)) {
            data = await apiFetch(`/songs?id=${encodeURIComponent(songId)}&suggestions=true`, { timeoutPrimary: 2200, timeoutFallback: 2500 });
        }
        if (data) {
            const rawList = Array.isArray(data) ? data : (data.results || data.songs || data.data || []);
            return rawList.map(normalizeSong).filter(Boolean);
        }
    } catch (e) {
        console.warn('[getSongSuggestions error]', e.message);
    }
    return [];
}

// ── SPOTIFY-GRADE CONTINUOUS AUTOPLAY RECOMMENDATIONS ENGINE ───────
export async function getAutoplayRecommendations(currentSong, excludedIds = [], limit = 20) {
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

    // 1. Direct Song Suggestions (AI-matched by JioSaavn)
    if (currentSong.id) {
        try {
            const suggestions = await getSongSuggestions(currentSong.id);
            if (suggestions && suggestions.length > 0) {
                suggestions.slice(0, 6).forEach(addSong);
            }
        } catch (err) {
            console.warn('[Autoplay] suggestions error:', err.message);
        }
    }

    // 2. Album / Soundtrack Companion Tracks (Same film/album atmosphere)
    if (recommendedSongs.length < limit && (currentSong.albumId || currentSong.album)) {
        try {
            if (currentSong.albumId) {
                const album = await getAlbumById(currentSong.albumId);
                if (album?.songs && album.songs.length > 0) {
                    album.songs.slice(0, 5).forEach(addSong);
                }
            } else if (currentSong.album && currentSong.album !== 'Unknown Album') {
                const albumResult = await searchSongs(currentSong.album, 0, 8);
                if (albumResult?.results && albumResult.results.length > 0) {
                    albumResult.results.slice(0, 4).forEach(addSong);
                }
            }
        } catch (err) {
            console.warn('[Autoplay] Album companions error:', err.message);
        }
    }

    // 3. Primary Artist Top Songs
    if (recommendedSongs.length < limit && currentSong.artistId) {
        try {
            const artistSongs = await getArtistSongs(currentSong.artistId, 1);
            if (artistSongs && artistSongs.length > 0) {
                artistSongs.slice(0, 6).forEach(addSong);
            }
        } catch (err) {
            console.warn('[Autoplay] artist top tracks error:', err.message);
        }
    }

    // 4. Peer Artists & Genre Affinity Matrix (Interleaved Round-Robin)
    const rawArtist = currentSong.artistName || currentSong.artist || '';
    const artistList = rawArtist.split(',').map(a => a.trim()).filter(Boolean);
    const mainArtist = artistList[0] || 'Unknown Artist';
    const mainArtistLower = mainArtist.toLowerCase();

    let relatedArtists = RELATED_ARTISTS_MAP[mainArtistLower];
    if (!relatedArtists || relatedArtists.length === 0) {
        const matchKey = Object.keys(RELATED_ARTISTS_MAP).find(k => mainArtistLower.includes(k) || k.includes(mainArtistLower));
        if (matchKey) {
            relatedArtists = RELATED_ARTISTS_MAP[matchKey];
        }
    }

    if (!relatedArtists || relatedArtists.length === 0) {
        relatedArtists = artistList.slice(1);
    }

    const songLang = (currentSong.language || 'hindi').toLowerCase();
    if ((!relatedArtists || relatedArtists.length === 0) && LANGUAGE_AFFINITY_MAP[songLang]) {
        relatedArtists = LANGUAGE_AFFINITY_MAP[songLang];
    }

    const artistQueryPool = [mainArtist, ...(relatedArtists || [])].slice(0, 6);

    try {
        const fetchResults = await Promise.all(
            artistQueryPool.map(async (art) => {
                try {
                    const res = await searchSongs(art, 0, 8);
                    return res?.results || [];
                } catch {
                    return [];
                }
            })
        );

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
        console.warn('[Autoplay] parallel fetch error:', err.message);
    }

    // 5. Language-Locked Discovery Fallback (Prevents genre/language clash)
    if (recommendedSongs.length < limit) {
        try {
            const mappedLang = LANGUAGE_MAP[songLang] || songLang || 'hindi';
            const langResult = await searchSongs(`top ${mappedLang} songs`, 0, 15);
            if (langResult?.results) {
                langResult.results.forEach(addSong);
            }
        } catch (err) {
            console.warn('[Autoplay] Language fallback error:', err.message);
        }
    }

    return recommendedSongs.slice(0, limit);
}



export function normalizeSongTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]|-.*$/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function normalizeArtistName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

export function createDeduplicator(initialItems = []) {
  const seenIds = new Set();
  const seenFps = new Set();
  const add = (item) => {
    if (!item) return false;
    const id = item.id || item.sourceId || item._id;
    const sId = id ? String(id) : null;
    const fp = getSongFingerprint(item);
    if ((sId && seenIds.has(sId)) || (fp && seenFps.has(fp))) {
      return false;
    }
    if (sId) seenIds.add(sId);
    if (fp) seenFps.add(fp);
    return true;
  };
  initialItems.forEach(item => add(item));
  return {
    add,
    has: (item) => {
      if (!item) return false;
      const id = item.id || item.sourceId || item._id;
      const sId = id ? String(id) : null;
      const fp = getSongFingerprint(item);
      return (sId && seenIds.has(sId)) || (fp && seenFps.has(fp));
    }
  };
}
