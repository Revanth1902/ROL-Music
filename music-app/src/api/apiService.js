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
  telugu: ['Sid Sriram', 'Anurag Kulkarni', 'Ram Miriyala', 'Hesham Abdul Wahab', 'Devi Sri Prasad', 'Thaman S', 'Armaan Malik'],
  tamil: ['Anirudh Ravichander', 'Yuvan Shankar Raja', 'Harris Jayaraj', 'Sid Sriram', 'Santhosh Narayanan', 'Pradeep Kumar'],
  punjabi: ['Sidhu Moose Wala', 'Karan Aujla', 'AP Dhillon', 'Diljit Dosanjh', 'Shubh', 'B Praak', 'Guru Randhawa'],
  english: ['The Weeknd', 'Taylor Swift', 'Post Malone', 'Drake', 'Billie Eilish', 'Dua Lipa', 'Ed Sheeran', 'Coldplay'],
  malayalam: ['Sushin Shyam', 'Hesham Abdul Wahab', 'Shaan Rahman', 'Gopi Sundar', 'Vineeth Sreenivasan'],
  kannada: ['Ravi Basrur', 'B. Ajaneesh Loknath', 'Arjun Janya', 'Sanjith Hegde', 'Charan Raj'],
  marathi: ['Ajay-Atul', 'Avadhoot Gupte', 'Swapnil Bandodkar', 'Adarsh Shinde'],
  bengali: ['Anupam Roy', 'Arijit Singh', 'Shreya Ghoshal', 'Rupam Islam', 'Jeet Gannguli'],
  bhojpuri: ['Pawan Singh', 'Khesari Lal Yadav', 'Shilpi Raj', 'Manoj Tiwari'],
};

// ── SPOTIFY-GRADE TASTE CLUSTERS MATRIX ─────────────────
// Curated audience affinity cohorts representing true musical styles and listener transitions
export const TASTE_CLUSTERS = [
  {
    id: 'hindi_romantic',
    lang: 'hindi',
    artists: [
      'arijit singh', 'atif aslam', 'mohit chauhan', 'kk', 'shreya ghoshal', 'jubin nautiyal',
      'vishal mishra', 'mithoon', 'pritam', 'sachin-jigar', 'javed ali', 'papon', 'mustafa zahid',
      'ankit tiwari', 'sachet tandon', 'sachet-parampara', 'stebin ben', 'akhil sachdeva',
      'shilpa rao', 'armaan malik', 'darshan raval', 'amaal mallik', 'asim azhar'
    ],
    peerArtists: ['Arijit Singh', 'Atif Aslam', 'Mohit Chauhan', 'KK', 'Shreya Ghoshal', 'Jubin Nautiyal', 'Vishal Mishra', 'Pritam'],
    targetQueries: ['Arijit Singh romantic hits', 'Atif Aslam love songs', 'Mohit Chauhan romantic hits', 'KK evergreen songs', 'Shreya Ghoshal melodies', 'Vishal Mishra soulful'],
  },
  {
    id: 'hindi_indie',
    lang: 'hindi',
    artists: [
      'anuv jain', 'prateek kuhad', 'zaeden', 'mitraz', 'aditya rikhari', 'the local train',
      'twin strings', 'when chai met toast', 'osho jain', 'piyush bhisekar', 'jasleen royal',
      'bharat chauhan', 'lifafa', 'oaff', 'savera', 'kanishk seth', 'raghav chaitanya',
      'bawari basanti', 'king', 'ritviz'
    ],
    peerArtists: ['Anuv Jain', 'Prateek Kuhad', 'Zaeden', 'Mitraz', 'Aditya Rikhari', 'The Local Train', 'Twin Strings', 'When Chai Met Toast'],
    targetQueries: ['Anuv Jain indie hits', 'Prateek Kuhad acoustic', 'Mitraz chill songs', 'The Local Train top songs', 'Zaeden acoustic songs', 'Hindi indie acoustic hits'],
  },
  {
    id: 'desi_hiphop',
    lang: 'hindi',
    artists: [
      'divine', 'kr$na', 'seedhe maut', 'raftaar', 'badshah', 'yo yo honey singh', 'mc stan',
      'emiway bantai', 'talwiinder', 'paradox', 'chaar diwaari', 'prabh deep', 'karma',
      'bella', 'brodha v', 'naezy', 'epr', 'frappe ash', 'rawal', 'ikka', 'dino james'
    ],
    peerArtists: ['Seedhe Maut', 'KR$NA', 'Divine', 'Raftaar', 'Talwiinder', 'MC Stan', 'Badshah', 'Emiway Bantai'],
    targetQueries: ['Seedhe Maut hits', 'KR$NA rap songs', 'Divine best rap', 'Raftaar hip hop', 'Talwiinder songs', 'Desi hip hop top tracks'],
  },
  {
    id: 'punjabi_urban',
    lang: 'punjabi',
    artists: [
      'sidhu moose wala', 'karan aujla', 'ap dhillon', 'diljit dosanjh', 'shubh', 'wazir patar',
      'prem dhillon', 'jordan sandhu', 'jerry', 'amrit maan', 'b praak', 'jaani', 'harrdy sandhu',
      'guru randhawa', 'parmish verma', 'jassie gill', 'garry sandhu', 'gippy grewal', 'amrinder gill',
      'shinda kahlon', 'gurinder gill', 'intense'
    ],
    peerArtists: ['Sidhu Moose Wala', 'Karan Aujla', 'AP Dhillon', 'Diljit Dosanjh', 'Shubh', 'B Praak', 'Guru Randhawa'],
    targetQueries: ['Karan Aujla hits', 'Sidhu Moose Wala top songs', 'AP Dhillon Punjabi hits', 'Diljit Dosanjh best songs', 'Shubh punjabi songs', 'Punjabi top drill and pop'],
  },
  {
    id: 'bollywood_90s_00s',
    lang: 'hindi',
    artists: [
      'kumar sanu', 'udit narayan', 'alka yagnik', 'sonu nigam', 'sadhana sargam', 'anuradha paudwal',
      'kavita krishnamurthy', 'nadeem-shravan', 'jatin-lalit', 'abhijeet bhattacharya', 'lucky ali',
      'shaan', 'babul supriyo', 'hariharan', 'alisha chinai', 'altaf raja'
    ],
    peerArtists: ['Kumar Sanu', 'Udit Narayan', 'Alka Yagnik', 'Sonu Nigam', 'Sadhana Sargam', 'Lucky Ali', 'Shaan'],
    targetQueries: ['Kumar Sanu romantic 90s', 'Udit Narayan evergreen hits', 'Alka Yagnik 90s melodies', 'Sonu Nigam best romantic songs', '90s Bollywood evergreen romantic songs'],
  },
  {
    id: 'telugu_melodic',
    lang: 'telugu',
    artists: [
      'sid sriram', 'anurag kulkarni', 'ram miriyala', 'hesham abdul wahab', 'haricharan', 'karthik',
      'mickey j meyer', 'm.m. keeravaani', 'armaan malik', 'sanjith hegde', 'chinmayi',
      'chitra', 's.p. balasubrahmanyam'
    ],
    peerArtists: ['Sid Sriram', 'Anurag Kulkarni', 'Hesham Abdul Wahab', 'Ram Miriyala', 'Haricharan', 'Karthik', 'Mickey J Meyer'],
    targetQueries: ['Sid Sriram Telugu melodies', 'Anurag Kulkarni love songs', 'Hesham Abdul Wahab Telugu hits', 'Ram Miriyala melodies', 'Telugu soulful melodies'],
  },
  {
    id: 'telugu_mass',
    lang: 'telugu',
    artists: [
      'devi sri prasad', 'thaman s', 'anirudh ravichander', 'rahul sipligunj', 'mangli',
      'anthony daasan', 'nakash aziz', 'daler mehndi'
    ],
    peerArtists: ['Devi Sri Prasad', 'Thaman S', 'Anirudh Ravichander', 'Rahul Sipligunj', 'Mangli'],
    targetQueries: ['Devi Sri Prasad mass hits', 'Thaman S beat songs', 'Telugu party mass songs', 'Anirudh Telugu songs'],
  },
  {
    id: 'tamil_modern',
    lang: 'tamil',
    artists: [
      'anirudh ravichander', 'yuvan shankar raja', 'harris jayaraj', 'santhosh narayanan',
      'pradeep kumar', 'sean roldan', 'd. imman', 'g.v. prakash kumar', 'hiphop tamizha',
      'dhibu ninan thomas', 'vijay antony', 'a.r. rahman'
    ],
    peerArtists: ['Anirudh Ravichander', 'Yuvan Shankar Raja', 'Harris Jayaraj', 'Santhosh Narayanan', 'Pradeep Kumar', 'Sean Roldan'],
    targetQueries: ['Anirudh Ravichander Tamil hits', 'Yuvan Shankar Raja melodies', 'Harris Jayaraj classic hits', 'Pradeep Kumar soulful Tamil', 'Santhosh Narayanan top songs'],
  },
  {
    id: 'malayalam_melodic',
    lang: 'malayalam',
    artists: [
      'sushin shyam', 'hesham abdul wahab', 'shaan rahman', 'gopi sundar', 'vineeth sreenivasan',
      'jakes bejoy', 'rex vijayan', 'vishnu vijay', 'deepak dev', 'job kurian'
    ],
    peerArtists: ['Sushin Shyam', 'Hesham Abdul Wahab', 'Shaan Rahman', 'Gopi Sundar', 'Vineeth Sreenivasan'],
    targetQueries: ['Sushin Shyam hits', 'Hesham Abdul Wahab Malayalam songs', 'Shaan Rahman melodious songs', 'Malayalam acoustic melodies'],
  },
  {
    id: 'kannada_hits',
    lang: 'kannada',
    artists: [
      'ravi basrur', 'b. ajaneesh loknath', 'arjun janya', 'charan raj', 'sanjith hegde',
      'vasuki vaibhav', 'raghu dixit', 'midhun mukundan', 'v. harikrishna'
    ],
    peerArtists: ['Ravi Basrur', 'B. Ajaneesh Loknath', 'Arjun Janya', 'Charan Raj', 'Sanjith Hegde'],
    targetQueries: ['Ravi Basrur hits', 'Ajaneesh Loknath songs', 'Charan Raj Kannada melodies', 'Sanjith Hegde Kannada songs'],
  },
  {
    id: 'western_pop',
    lang: 'english',
    artists: [
      'the weeknd', 'drake', 'post malone', 'travis scott', 'sza', 'billie eilish',
      'olivia rodrigo', 'taylor swift', 'sabrina carpenter', 'dua lipa', 'frank ocean',
      'justin bieber', 'ariana grande', 'bruno mars', 'khalid', 'ed sheeran', 'charlie puth'
    ],
    peerArtists: ['The Weeknd', 'Post Malone', 'Drake', 'SZA', 'Billie Eilish', 'Olivia Rodrigo', 'Dua Lipa', 'Taylor Swift'],
    targetQueries: ['The Weeknd top hits', 'Post Malone popular songs', 'SZA best tracks', 'Billie Eilish popular', 'Modern Pop hits'],
  },
  {
    id: 'western_rock',
    lang: 'english',
    artists: [
      'coldplay', 'imagine dragons', 'onerepublic', 'maroon 5', 'the chainsmokers',
      'bastille', 'arctic monkeys', 'the neighbourhood', 'twenty one pilots', 'fall out boy'
    ],
    peerArtists: ['Coldplay', 'Imagine Dragons', 'OneRepublic', 'Maroon 5', 'The Chainsmokers'],
    targetQueries: ['Coldplay best songs', 'Imagine Dragons top hits', 'OneRepublic popular songs', 'Modern alternative rock hits'],
  }
];

// Flat fallback related artist map for fast O(1) lookups
const RELATED_ARTISTS_MAP = {
  // Hindi / Bollywood
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

  // Hindi Indie
  'anuv jain': ['Zaeden', 'King', 'Prateek Kuhad', 'When Chai Met Toast', 'Mitraz', 'The Local Train', 'Twin Strings'],
  'prateek kuhad': ['Anuv Jain', 'When Chai Met Toast', 'The Local Train', 'Lifafa', 'Bharat Chauhan', 'Jasleen Royal'],
  'the local train': ['Parvaaz', 'Lifafa', 'When Chai Met Toast', 'Anuv Jain', 'Indian Ocean', 'Lucky Ali'],
  'king': ['Anuv Jain', 'Zaeden', 'Mitraz', 'Ritviz', 'Jasleen Royal', 'Badshah', 'Paradox'],
  'ritviz': ['Nucleya', 'Lost Stories', 'Mitraz', 'Zaeden', 'OAFF', 'Savera', 'King'],
  'mitraz': ['Zaeden', 'King', 'Anuv Jain', 'Twin Strings', 'Aditya Rikhari', 'Ritviz'],
  'aditya rikhari': ['Mitraz', 'Anuv Jain', 'Zaeden', 'Osho Jain', 'Piyush Bhisekar', 'Twin Strings'],
  'zaeden': ['King', 'Lost Stories', 'Anuv Jain', 'Ritviz', 'Mitraz', 'Twin Strings'],
  'when chai met toast': ['Prateek Kuhad', 'Anuv Jain', 'The Local Train', 'Sanah Moidutty'],

  // Desi Hip-Hop
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
  'sid sriram': ['Anurag Kulkarni', 'Ram Miriyala', 'Hesham Abdul Wahab', 'Armaan Malik', 'Haricharan', 'Devi Sri Prasad'],
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

  // Western Pop / R&B / Rock
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

// ── VIBE / TASTE CLUSTER DETECTOR ───────────────────────
export function findTasteCluster(song) {
  if (!song) return TASTE_CLUSTERS[0];
  const songLang = (song.language || 'hindi').toLowerCase().trim();
  const rawArtist = (song.artistName || song.artist || '').toLowerCase();
  const allArtists = Array.isArray(song.artists) ? song.artists.map(a => (a.name || '').toLowerCase()) : [];
  const searchString = `${rawArtist} ${allArtists.join(' ')}`;
  const songYear = parseInt(song.year || 0, 10);

  // Evergreen 90s/2000s check: Hindi song pre-2008 with vintage singers
  if (songLang === 'hindi' && songYear && songYear < 2008) {
    const ninetiesCluster = TASTE_CLUSTERS.find(c => c.id === 'bollywood_90s_00s');
    if (ninetiesCluster && ninetiesCluster.artists.some(a => searchString.includes(a))) {
      return ninetiesCluster;
    }
  }

  // Exact artist match within language clusters first
  for (const cluster of TASTE_CLUSTERS) {
    const langMatch = !cluster.lang || cluster.lang === songLang || (songLang === 'urdu' && cluster.lang === 'hindi');
    if (langMatch) {
      for (const artist of cluster.artists) {
        if (searchString.includes(artist)) {
          return cluster;
        }
      }
    }
  }

  // Cross-language artist match
  for (const cluster of TASTE_CLUSTERS) {
    for (const artist of cluster.artists) {
      if (searchString.includes(artist)) {
        return cluster;
      }
    }
  }

  // Fallback to primary language cluster
  return TASTE_CLUSTERS.find(c => c.lang === songLang) || TASTE_CLUSTERS[0];
}

// ── SONG FINGERPRINTING & DEDUPLICATION ─────────────────
export function normalizeSongTitle(title) {
  if (!title || typeof title !== 'string') return '';
  return title
    .toLowerCase()
    // Strip parenthesized / bracketed content like (From "Brahmastra"), [Lofi], (Slowed + Reverb)
    .replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/gu, '')
    // Strip trailing descriptions after separators
    .replace(/[-–—|:].*$/gu, '')
    // Strip common release noise words that might be unbracketed
    .replace(/\b(feat|ft|featuring|from|ost|soundtrack|version|reprise|remix|lofi|lo fi|slowed|reverb|acoustic|live|instrumental|audio|video|lyric|lyrics|full song|clean version|explicit|deluxe|remastered|remaster|hd)\b/gi, '')
    // Preserve all Unicode letters, numbers, and combining vowel marks across Indic & world scripts
    .replace(/[^\p{L}\p{N}\p{M}]/gu, '')
    .trim();
}

export function normalizeArtistName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/gu, '')
    .replace(/\b(feat|ft|featuring|with|and|by)\b/gi, '')
    .replace(/[^\p{L}\p{N}\p{M}]/gu, '')
    .trim();
}

export function getSongFingerprint(song) {
  if (!song) return '';
  const cleanTitle = normalizeSongTitle(song.title || song.name || '');
  const rawArtist = song.artistName || song.artist || song.primaryArtists || '';
  const firstArtist = (typeof rawArtist === 'string' ? rawArtist.split(',')[0] : '') || '';
  const cleanArtist = normalizeArtistName(firstArtist);
  return cleanTitle ? `${cleanTitle}::${cleanArtist}` : '';
}

export function areLanguagesCompatible(langA, langB) {
  if (!langA || !langB) return true;
  const a = langA.toLowerCase().trim();
  const b = langB.toLowerCase().trim();
  if (a === b) return true;
  if ((a === 'hindi' && b === 'urdu') || (a === 'urdu' && b === 'hindi')) return true;
  return false;
}

/**
 * Airtight Deduplicator: guards against duplicate IDs, identical audio streams (src),
 * duplicate clean core titles (e.g. "Kesariya" vs "Kesariya - Lofi Flip"), and title::artist fingerprints.
 */
export function createDeduplicator(initialItems = []) {
  const seenIds = new Set();
  const seenAudioUrls = new Set();
  const seenFingerprints = new Set();
  const seenTitles = new Set();

  const register = (item) => {
    if (!item) return;
    if (typeof item === 'string' || typeof item === 'number') {
      seenIds.add(String(item));
      return;
    }
    if (item.id) seenIds.add(String(item.id));
    if (item.sourceId) seenIds.add(String(item.sourceId));
    if (item._id) seenIds.add(String(item._id));
    if (item.src) seenAudioUrls.add(String(item.src));

    const cleanT = normalizeSongTitle(item.title || item.name || '');
    if (cleanT && cleanT.length >= 3) {
      seenTitles.add(cleanT);
    }

    const fp = getSongFingerprint(item);
    if (fp) seenFingerprints.add(fp);
  };

  initialItems.forEach(register);

  const isDuplicate = (song) => {
    if (!song) return true;
    const sId = String(song.id || song.sourceId || song._id || '');
    if (sId && seenIds.has(sId)) return true;

    if (song.src && seenAudioUrls.has(String(song.src))) return true;

    const cleanT = normalizeSongTitle(song.title || song.name || '');
    // For core titles with 3+ characters (e.g. "Kesariya", "Starboy", "Apna Bana Le"):
    // Never allow two versions of the same song in the queue!
    if (cleanT && cleanT.length >= 3 && seenTitles.has(cleanT)) {
      return true;
    }

    // For short titles (< 3 chars, e.g. "Tu", "Ma"), check title + artist fingerprint
    const fp = getSongFingerprint(song);
    if (fp && seenFingerprints.has(fp)) {
      return true;
    }

    return false;
  };

  const add = (song) => {
    if (isDuplicate(song)) return false;
    register(song);
    return true;
  };

  return { register, isDuplicate, add };
}

export function deduplicateSongList(songs = [], existingItems = []) {
  if (!Array.isArray(songs)) return [];
  const dedup = createDeduplicator(existingItems);
  return songs.filter(s => dedup.add(s));
}

export async function getSongSuggestions(songId) {
  if (!songId) return [];
  try {
    let data = await apiFetch(`/songs/${encodeURIComponent(songId)}/suggestions?limit=20`);
    if (!data || (Array.isArray(data) && data.length === 0)) {
      data = await apiFetch(`/songs/${encodeURIComponent(songId)}/suggestions`);
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
      data = await apiFetch(`/songs?id=${encodeURIComponent(songId)}&suggestions=true`);
    }
    if (data) {
      const rawList = Array.isArray(data) ? data : (data.results || data.songs || data.data || []);
      return rawList.map(normalizeSong).filter(s => s && s.src);
    }
  } catch (e) {
    console.warn('[getSongSuggestions error]', e.message);
  }
  return [];
}

// ── SPOTIFY-GRADE CONTINUOUS AUTOPLAY & RADIO RECOMMENDATIONS ENGINE ───────
export async function getAutoplayRecommendations(currentSong, excludedInput = [], limit = 20) {
  if (!currentSong) return [];

  const rawArtist = currentSong.artistName || currentSong.artist || '';
  const artistList = rawArtist.split(',').map(a => a.trim()).filter(Boolean);
  const mainArtist = artistList[0] || '';
  const songLang = (currentSong.language || 'hindi').toLowerCase().trim();

  // 1. Initialize Deduplicator with all excluded context (current song, active queue, history)
  const initialExcluded = [currentSong, ...(Array.isArray(excludedInput) ? excludedInput : [])];
  const deduplicator = createDeduplicator(initialExcluded);

  // 2. Classify audience taste cluster
  const cluster = findTasteCluster(currentSong);

  // Buckets for Spotify-grade listening curve interleaving
  const suggestionBucket = [];
  const albumBucket = [];
  const artistBucket = [];
  const peerBuckets = [];
  const fallbackBucket = [];

  const filterAndFormat = (song, tier) => {
    if (!song || !song.id || !song.title || !song.src) return null;
    if (song.language && !areLanguagesCompatible(songLang, song.language)) return null;
    if (deduplicator.isDuplicate(song)) return null;

    deduplicator.add(song);
    return {
      ...song,
      isAutoplayItem: true,
      radioSeedSong: currentSong.title,
      recommendationTier: tier,
    };
  };

  // ── TIER 1: JioSaavn Collaborative Filtering Suggestions ──────────────
  if (currentSong.id) {
    try {
      const rawSuggestions = await getSongSuggestions(currentSong.id);
      if (rawSuggestions && rawSuggestions.length > 0) {
        for (const s of rawSuggestions) {
          const item = filterAndFormat(s, 'suggestion');
          if (item) suggestionBucket.push(item);
          if (suggestionBucket.length >= 10) break;
        }
      }
    } catch (err) {
      console.warn('[Autoplay] suggestions error:', err.message);
    }
  }

  // ── TIER 2: Sibling Album / OST Companions (Atmospheric cohort) ─────────
  if (currentSong.albumId || currentSong.album) {
    try {
      let albumTracks = [];
      if (currentSong.albumId) {
        const album = await getAlbumById(currentSong.albumId);
        if (album?.songs && album.songs.length > 0) {
          albumTracks = album.songs;
        }
      }
      if (albumTracks.length === 0 && currentSong.album && currentSong.album !== 'Unknown Album') {
        const albumResult = await searchSongs(currentSong.album, 0, 6);
        albumTracks = albumResult?.results || [];
      }

      for (const s of albumTracks) {
        const item = filterAndFormat(s, 'album');
        if (item) albumBucket.push(item);
        if (albumBucket.length >= 3) break;
      }
    } catch (err) {
      console.warn('[Autoplay] Album companions error:', err.message);
    }
  }

  // ── TIER 3: Primary Artist Signature Top Hits ──────────────────────────
  if (mainArtist) {
    try {
      const artistRes = await searchSongs(mainArtist, 0, 6);
      if (artistRes?.results) {
        for (const s of artistRes.results) {
          const item = filterAndFormat(s, 'artist');
          if (item) artistBucket.push(item);
          if (artistBucket.length >= 3) break;
        }
      }
    } catch (err) {
      console.warn('[Autoplay] artist top tracks error:', err.message);
    }
  }

  // ── TIER 4: Spotify Affinity Peer Artists ──────────────────────────────
  // Select peer artists that match this audience taste cluster and differ from seed artist
  const clusterPeers = (cluster?.peerArtists || []).filter(p => !p.toLowerCase().includes(mainArtist.toLowerCase()));
  const chosenPeers = clusterPeers.length > 0 ? clusterPeers.slice(0, 4) : (LANGUAGE_AFFINITY_MAP[songLang] || []).slice(0, 4);

  for (const peer of chosenPeers) {
    try {
      const peerRes = await searchSongs(peer, 0, 5);
      const peerSongs = [];
      if (peerRes?.results) {
        for (const s of peerRes.results) {
          const item = filterAndFormat(s, 'peer');
          if (item) peerSongs.push(item);
          if (peerSongs.length >= 3) break;
        }
      }
      if (peerSongs.length > 0) {
        peerBuckets.push(peerSongs);
      }
    } catch (err) {
      console.warn('[Autoplay] peer artist error:', err.message);
    }
  }

  // ── TIER 5: Vibe-Specific Targeted Fallback (Never generic chart noise!) ───
  const totalGathered = suggestionBucket.length + albumBucket.length + artistBucket.length + peerBuckets.reduce((acc, b) => acc + b.length, 0);
  if (totalGathered < limit) {
    const targetQueries = cluster?.targetQueries || [`${mainArtist} hits`, `top ${songLang} melodies`];
    for (const q of targetQueries.slice(0, 2)) {
      try {
        const fallbackRes = await searchSongs(q, 0, 6);
        if (fallbackRes?.results) {
          for (const s of fallbackRes.results) {
            const item = filterAndFormat(s, 'vibe_fallback');
            if (item) fallbackBucket.push(item);
            if (fallbackBucket.length >= 6) break;
          }
        }
      } catch (err) {
        console.warn('[Autoplay] targeted fallback error:', err.message);
      }
    }
  }

  // ── TIER 6: Spotify Radio Flow Curve (Interleaving) ─────────────────────
  // Interleave tracks round-robin so the user experiences an authentic DJ/radio flow:
  // Suggestion -> Peer 1 -> Album track -> Suggestion -> Peer 2 -> Artist hit -> Peer 3...
  const finalInterleaved = [];
  let sIdx = 0;
  let albIdx = 0;
  let artIdx = 0;
  const peerIdxs = peerBuckets.map(() => 0);

  while (finalInterleaved.length < limit) {
    let addedInRound = false;

    // 1. Direct Suggestion (Immediate continuity)
    if (sIdx < suggestionBucket.length) {
      finalInterleaved.push(suggestionBucket[sIdx++]);
      addedInRound = true;
      if (finalInterleaved.length >= limit) break;
    }

    // 2. Peer Artist 1
    if (peerBuckets.length > 0 && peerIdxs[0] < peerBuckets[0].length) {
      finalInterleaved.push(peerBuckets[0][peerIdxs[0]++]);
      addedInRound = true;
      if (finalInterleaved.length >= limit) break;
    }

    // 3. Album Companion Track (OST atmospheric immersion)
    if (albIdx < albumBucket.length) {
      finalInterleaved.push(albumBucket[albIdx++]);
      addedInRound = true;
      if (finalInterleaved.length >= limit) break;
    }

    // 4. Direct Suggestion 2
    if (sIdx < suggestionBucket.length) {
      finalInterleaved.push(suggestionBucket[sIdx++]);
      addedInRound = true;
      if (finalInterleaved.length >= limit) break;
    }

    // 5. Peer Artist 2
    if (peerBuckets.length > 1 && peerIdxs[1] < peerBuckets[1].length) {
      finalInterleaved.push(peerBuckets[1][peerIdxs[1]++]);
      addedInRound = true;
      if (finalInterleaved.length >= limit) break;
    }

    // 6. Primary Artist Hit Track
    if (artIdx < artistBucket.length) {
      finalInterleaved.push(artistBucket[artIdx++]);
      addedInRound = true;
      if (finalInterleaved.length >= limit) break;
    }

    // 7. Remaining Peer Artists (3 and 4)
    for (let p = 2; p < peerBuckets.length; p++) {
      if (peerIdxs[p] < peerBuckets[p].length) {
        finalInterleaved.push(peerBuckets[p][peerIdxs[p]++]);
        addedInRound = true;
        if (finalInterleaved.length >= limit) break;
      }
    }

    // 8. Targeted Vibe Fallback
    if (fallbackBucket.length > 0) {
      const fbItem = fallbackBucket.shift();
      if (fbItem) {
        finalInterleaved.push(fbItem);
        addedInRound = true;
        if (finalInterleaved.length >= limit) break;
      }
    }

    if (!addedInRound) break;
  }

  return finalInterleaved.slice(0, limit);
}



