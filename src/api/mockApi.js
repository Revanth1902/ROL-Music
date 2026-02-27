const delay = (ms) => new Promise((res) => setTimeout(res, ms))

const songs = [
  {
    id: 'qLb5jMv4',
    title: 'Pattuma ',
    artistId: '455663',
    artistName: 'Anirudh Ravichander',
    albumId: '70160306',
    duration: 210,
    src: 'https://aac.saavncdn.com/587/7b1cd82faf9eb303c5a2796668d304eb_320.mp4',
    cover: 'https://c.saavncdn.com/587/Pattuma-From-Love-Insurance-Kompany-Tamil-2025-20251127162138-500x500.jpg'
  },
  {
    id: 'HtoCuROi',
    title: 'Singari',
    artistId: '14477737',
    artistName: 'Sai Abhyankkar',
    albumId: 'al2',
    duration: 208,
    src: 'https://aac.saavncdn.com/177/c255d0ea02e7e9d6fdda0e38846c421c_320.mp4',
    cover: 'https://c.saavncdn.com/177/Dude-Telugu-Original-Motion-Picture-Soundtrack-Telugu-2025-20251029174900-500x500.jpg'
  }
]

const albums = [
  { id: 'al1', title: 'Summer EP', artistId: 'a1', cover: '/assets/cover1.jpg' },
  { id: 'al2', title: 'Neon Nights', artistId: 'a2', cover: '/assets/cover2.jpg' }
]

const artists = [
  { id: 'a1', name: 'Caturday', avatar: '/assets/artist1.jpg' },
  { id: 'a2', name: 'Neon Rider', avatar: '/assets/artist2.jpg' }
]

const playlists = [
  { id: 'p1', title: 'Chill Vibes', cover: '/assets/playlist1.jpg', songs: ['s1', 's2'] }
]

export const api = {
  getTrending: async () => {
    await delay(300)
    return { songs: songs.slice(0, 10), albums, artists, playlists }
  },
  getSongs: async () => { await delay(200); return songs },
  getSongById: async (id) => { await delay(150); return songs.find(s=>s.id===id) },
  getAlbumById: async (id) => { await delay(150); return albums.find(a=>a.id===id) },
  getArtistById: async (id) => { await delay(150); return artists.find(a=>a.id===id) },
  getPlaylistById: async (id) => { await delay(150); return playlists.find(p=>p.id===id) }
}


// //--------------------------------------------------
// // MOCK DATA (local development fallback)
// //--------------------------------------------------

// const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// const songs = [
//   {
//     id: "s1",
//     title: "Summer of Love",
//     artistId: "a1",
//     artistName: "Caturday",
//     albumId: "al1",
//     duration: 246,
//     src: "/assets/sample.mp3",
//     cover: "/assets/cover1.jpg",
//   },
//   {
//     id: "s2",
//     title: "Night Drive",
//     artistId: "a2",
//     artistName: "Neon Rider",
//     albumId: "al2",
//     duration: 205,
//     src: "/assets/sample.mp3",
//     cover: "/assets/cover2.jpg",
//   },
// ];

// const albums = [
//   { id: "al1", title: "Summer EP", artistId: "a1", cover: "/assets/cover1.jpg" },
//   { id: "al2", title: "Neon Nights", artistId: "a2", cover: "/assets/cover2.jpg" },
// ];

// const artists = [
//   { id: "a1", name: "Caturday", avatar: "/assets/artist1.jpg" },
//   { id: "a2", name: "Neon Rider", avatar: "/assets/artist2.jpg" },
// ];

// const playlists = [
//   { id: "p1", title: "Chill Vibes", cover: "/assets/playlist1.jpg", songs: ["s1", "s2"] },
// ];

// //--------------------------------------------------
// // REAL API HELPERS
// //--------------------------------------------------

// const BASE_URL = "https://saavn.sumit.co";

// /**
//  * Safely fetch JSON from an endpoint.
//  */
// async function apiGet(url) {
//   try {
//     const res = await fetch(url);

//     if (!res.ok) {
//       throw new Error(`HTTP ${res.status}`);
//     }

//     const json = await res.json();

//     if (!json.success) {
//       throw new Error(json.message || "API returned success:false");
//     }

//     return json;
//   } catch (err) {
//     console.error("API ERROR:", err);
//     throw new Error(`API request failed: ${err.message}`);
//   }
// }

// //--------------------------------------------------
// // PAGINATION FOR ARTISTS ONLY
// //--------------------------------------------------

// async function fetchPaginatedSongs(endpoint, id, maxPages = 10) {
//   const all = [];

//   for (let page = 0; page < maxPages; page++) {
//     const url = `${BASE_URL}${endpoint.replace("{id}", id)}?page=${page}`;
//     const json = await apiGet(url);

//     const list = json?.data?.songs ?? [];
//     if (list.length === 0) break;

//     all.push(...list);
//   }

//   return all;
// }

// //--------------------------------------------------
// // REAL API FUNCTIONS
// //--------------------------------------------------

// // ARTIST SONGS
// async function getArtistSongs(artistId) {
//   return await fetchPaginatedSongs("/api/artists/{id}/songs", artistId, 10);
// }

// // PLAYLIST / CHART SONGS
// async function getPlaylistSongs(idOrLink, limit = 50) {
//   const isLink = idOrLink.startsWith("http");
//   const q = isLink ? `link=${encodeURIComponent(idOrLink)}` : `id=${idOrLink}`;

//   const json = await apiGet(`${BASE_URL}/api/playlists?${q}&limit=${limit}`);
//   return json.data?.songs ?? [];
// }

// // ALBUM
// async function getAlbum(idOrLink) {
//   const isLink = idOrLink.startsWith("http");
//   const q = isLink ? `link=${encodeURIComponent(idOrLink)}` : `id=${idOrLink}`;

//   const json = await apiGet(`${BASE_URL}/api/albums?${q}`);
//   return json.data ?? null;
// }

// // SONG DETAILS
// async function getSong(id) {
//   const json = await apiGet(`${BASE_URL}/api/songs/${id}`);
//   return json.data ?? null;
// }

// // LYRICS
// async function getLyrics(id) {
//   const json = await apiGet(`${BASE_URL}/api/lyrics?id=${id}`);
//   return json.data ?? null;
// }

// // SEARCH (Songs)
// async function search(query, limit = 20) {
//   const json = await apiGet(
//     `${BASE_URL}/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`
//   );
//   return json.data ?? [];
// }

// // TRENDING
// async function getTrending() {
//   const json = await apiGet(`${BASE_URL}/api/modules?language=hindi`);
//   return json.data ?? {};
// }

// // MULTI SONG FETCH
// async function getMultipleSongs(ids = []) {
//   const joined = ids.join(",");
//   const json = await apiGet(`${BASE_URL}/api/songs?id=${joined}`);
//   return json.data ?? [];
// }

// //--------------------------------------------------
// // FINAL EXPORT OBJECT (MOCK + REAL API)
// //--------------------------------------------------

// export const api = {
//   // mock
//   delay,
//   songs,
//   albums,
//   artists,
//   playlists,

//   // real API
//   getArtistSongs,
//   getPlaylistSongs,
//   getAlbum,
//   getSong,
//   getLyrics,
//   search,
//   getTrending,
//   getMultipleSongs,
// };
