import Cookies from 'js-cookie';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://rolmusicdevbackend.vercel.app/api').replace(/\/+$/, '');

function getAuthHeaders(token = null) {
  const headers = { 'Content-Type': 'application/json' };
  const activeToken = token || Cookies.get('token');
  if (activeToken) headers.Authorization = `Bearer ${activeToken}`;
  return headers;
}

async function request(path, options = {}, token = null) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(token),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }
  return data;
}

export async function loginUser(identifier, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export async function registerUser(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function googleLoginUser(googlePayload) {
  return request('/auth/google', {
    method: 'POST',
    body: JSON.stringify(googlePayload),
  });
}

export async function getCurrentUser(token) {
  return request('/auth/me', { method: 'GET' }, token);
}

export async function getLikedSongs(token) {
  const response = await request('/users/liked-songs', { method: 'GET' }, token);
  return response.data || [];
}

export async function toggleLikeSong(songId, token, isLiked, songData = null) {
  const path = isLiked ? `/songs/${songId}/unlike` : `/songs/${songId}/like`;
  return request(path, {
    method: isLiked ? 'DELETE' : 'POST',
    body: isLiked ? undefined : JSON.stringify(songData || {}),
  }, token);
}

export async function getRecentlyPlayed(token) {
  const response = await request('/users/recently-played', { method: 'GET' }, token);
  return response.data || [];
}

export async function trackSongPlay(songId, token) {
  return request(`/songs/${songId}/play`, { method: 'POST' }, token);
}

export async function createSong(payload, token) {
  return request('/songs', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function getPlaylists(token) {
  const response = await request('/playlists', { method: 'GET' }, token);
  return response.data || [];
}

export async function createPlaylist(payload, token) {
  return request('/playlists', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function addSongToPlaylist(playlistId, songId, token, songData = null) {
  return request(`/playlists/${playlistId}/add-song/${songId}`, {
    method: 'POST',
    body: JSON.stringify(songData || {}),
  }, token);
}

export async function removeSongFromPlaylist(playlistId, songId, token) {
  return request(`/playlists/${playlistId}/remove-song/${songId}`, { method: 'DELETE' }, token);
}

export async function getPlaylistDetails(playlistId, token) {
  const response = await request(`/playlists/${playlistId}`, { method: 'GET' }, token);
  return response.data || null;
}

export async function getPublicPlaylists() {
  const response = await request('/playlists/public', { method: 'GET' });
  return response.data || [];
}
