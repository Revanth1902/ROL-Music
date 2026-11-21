import { getUserTasteData } from './userTracker';
import { searchSongs, getTrendingSongs, getSongFingerprint } from '../api/apiService';

/**
 * Generate dynamic "Made for You" personalized tracks for a logged-in user
 */
export const getPersonalizedMix = async (userId, limit = 20) => {
  if (!userId || userId === 'guest') {
    // Fallback for non-logged-in users: return trending
    const trending = await getTrendingSongs();
    return trending.slice(0, limit);
  }

  const taste = getUserTasteData(userId);
  const resultsMap = new Map();
  const addedFps = new Set();

  const addUniqueSongs = (songs) => {
    if (!Array.isArray(songs)) return;
    for (const song of songs) {
      if (!song || !song.id) continue;
      const fp = getSongFingerprint(song);
      if (resultsMap.has(String(song.id)) || (fp && addedFps.has(fp))) continue;
      resultsMap.set(String(song.id), song);
      if (fp) addedFps.add(fp);
    }
  };

  try {
    // 1. Get seed terms from user's recent searches and top artists
    const searchSeeds = (taste.searches || [])
      .sort((a, b) => b.count - a.count || b.timestamp - a.timestamp)
      .map(s => s.query)
      .slice(0, 3);

    const artistSeeds = Object.entries(taste.topArtists || {})
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0])
      .slice(0, 3);

    const querySeeds = [...new Set([...searchSeeds, ...artistSeeds])].slice(0, 4);

    // 2. Query recommendations based on top seeds
    for (const seed of querySeeds) {
      if (resultsMap.size >= limit) break;
      try {
        const searchRes = await searchSongs(seed, 0, 8);
        if (searchRes?.results) {
          addUniqueSongs(searchRes.results);
        }
      } catch (err) {
        console.warn(`[personalizedService] Error fetching seed "${seed}":`, err.message);
      }
    }

    // 3. Supplement with recently played tracks if needed
    if (taste.playedTracks && taste.playedTracks.length > 0) {
      for (const track of taste.playedTracks.slice(0, 5)) {
        if (resultsMap.size >= limit) break;
        if (track.title && track.artist) {
          try {
            const searchRes = await searchSongs(`${track.artist} best songs`, 0, 4);
            if (searchRes?.results) {
              addUniqueSongs(searchRes.results);
            }
          } catch (err) {
            console.warn('[personalizedService] Error fetching artist recs:', err.message);
          }
        }
      }
    }

    // 4. Fill remaining with trending songs if still under limit
    if (resultsMap.size < limit) {
      const trending = await getTrendingSongs();
      addUniqueSongs(trending);
    }

    const mixArray = Array.from(resultsMap.values()).slice(0, limit);
    return mixArray;
  } catch (err) {
    console.error('[personalizedService] failed to generate mix:', err);
    return (await getTrendingSongs()).slice(0, limit);
  }
};
