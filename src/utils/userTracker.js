// User search & listening taste tracking module

const TRACKING_KEY_PREFIX = 'rol_user_taste_';

export const getUserTasteData = (userId = 'guest') => {
  try {
    const raw = localStorage.getItem(`${TRACKING_KEY_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('[userTracker] failed to read taste data:', err);
  }
  return {
    searches: [],       // [{ query, count, timestamp }]
    playedTracks: [],   // [{ songId, title, artist, genre, count, lastPlayed }]
    topArtists: {},     // { "Artist Name": count }
    topGenres: {},      // { "Bollywood": count }
    lastUpdated: Date.now()
  };
};

export const saveUserTasteData = (userId, data) => {
  if (!userId || userId === 'guest') return;
  try {
    data.lastUpdated = Date.now();
    localStorage.setItem(`${TRACKING_KEY_PREFIX}${userId}`, JSON.stringify(data));
  } catch (err) {
    console.warn('[userTracker] failed to save taste data:', err);
  }
};

// Record search query for logged-in user
export const trackUserSearch = (userId, query) => {
  if (!userId || userId === 'guest' || !query || query.trim().length < 2) return;
  const cleanQuery = query.trim().toLowerCase();
  const taste = getUserTasteData(userId);

  const existingIndex = taste.searches.findIndex(s => s.query === cleanQuery);
  if (existingIndex >= 0) {
    taste.searches[existingIndex].count += 1;
    taste.searches[existingIndex].timestamp = Date.now();
  } else {
    taste.searches.unshift({ query: cleanQuery, count: 1, timestamp: Date.now() });
  }

  // Keep top 30 search queries
  taste.searches = taste.searches.slice(0, 30);
  saveUserTasteData(userId, taste);
};

// Record played song for logged-in user
export const trackUserPlay = (userId, song) => {
  if (!userId || userId === 'guest' || !song) return;
  const taste = getUserTasteData(userId);

  const songId = song.id || song.sourceId;
  if (!songId) return;

  // Update playedTracks
  const existingIdx = taste.playedTracks.findIndex(t => String(t.songId) === String(songId));
  if (existingIdx >= 0) {
    taste.playedTracks[existingIdx].count += 1;
    taste.playedTracks[existingIdx].lastPlayed = Date.now();
  } else {
    taste.playedTracks.unshift({
      songId: String(songId),
      title: song.title || song.name || '',
      artist: song.artistName || song.artist || '',
      genre: song.genre || song.language || '',
      count: 1,
      lastPlayed: Date.now()
    });
  }
  taste.playedTracks = taste.playedTracks.slice(0, 50);

  // Update artist frequency
  const artistName = song.artistName || song.artist;
  if (artistName && typeof artistName === 'string') {
    const mainArtist = artistName.split(',')[0].trim();
    taste.topArtists[mainArtist] = (taste.topArtists[mainArtist] || 0) + 1;
  }

  // Update genre frequency
  if (song.genre || song.language) {
    const g = song.genre || song.language;
    taste.topGenres[g] = (taste.topGenres[g] || 0) + 1;
  }

  saveUserTasteData(userId, taste);
};
