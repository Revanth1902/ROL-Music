/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import { getCurrentUser, getLikedSongs, loginUser, registerUser, googleLoginUser, toggleLikeSong, getRecentlyPlayed } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loginType, setLoginType] = useState(null);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('Login required for this feature');
  const [likedSongIds, setLikedSongIds] = useState(() => {
    try {
      const cached = localStorage.getItem('rol_liked_song_ids');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);

  const clearAuthState = useCallback(() => {
    Cookies.remove('token');
    Cookies.remove('loginType');
    try { localStorage.removeItem('rol_liked_song_ids'); } catch {}
    setToken(null);
    setUser(null);
    setLikedSongIds([]);
    setRecentlyPlayed([]);
  }, []);

  const openAuthModal = useCallback((message = 'Login required for this feature') => {
    setAuthModalMessage(message);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const refreshLikedSongs = useCallback(async (activeToken = token) => {
    const effectiveToken = activeToken || token || Cookies.get('token');
    if (!effectiveToken) {
      setLikedSongIds([]);
      try { localStorage.removeItem('rol_liked_song_ids'); } catch {}
      return [];
    }

    try {
      const songs = await getLikedSongs(effectiveToken);
      const ids = [];
      (Array.isArray(songs) ? songs : []).forEach(song => {
        const item = song?.song || song;
        if (!item) return;
        if (item.id) ids.push(String(item.id));
        if (item._id) ids.push(String(item._id));
        if (item.sourceId) ids.push(String(item.sourceId));
      });
      const uniqueIds = Array.from(new Set(ids));
      setLikedSongIds(uniqueIds);
      try { localStorage.setItem('rol_liked_song_ids', JSON.stringify(uniqueIds)); } catch {}
      return songs;
    } catch (error) {
      console.warn('[auth] failed to refresh liked songs from backend, keeping cached IDs:', error.message);
      try {
        const cached = localStorage.getItem('rol_liked_song_ids');
        if (cached) return JSON.parse(cached);
      } catch {}
      return [];
    }
  }, [token]);

  const refreshRecentlyPlayed = useCallback(async (activeToken = token) => {
    const effectiveToken = activeToken || token || Cookies.get('token');
    if (!effectiveToken) return [];
    try {
      const data = await getRecentlyPlayed(effectiveToken);
      setRecentlyPlayed(data);
      return data;
    } catch (error) {
      console.error('[auth] failed to refresh recent plays', error);
      return [];
    }
  }, [token]);

  useEffect(() => {
    const restoreSession = async () => {
      const cookieToken = Cookies.get('token');
      const cookieLoginType = Cookies.get('loginType');

      if (cookieLoginType === 'user' && cookieToken) {
        setToken(cookieToken);
        setLoginType('user');
        if (cookieToken.startsWith('google_session_') || cookieToken.startsWith('google_token_')) {
          const savedGUser = localStorage.getItem('rol_google_user');
          if (savedGUser) {
            try { setUser(JSON.parse(savedGUser)); } catch { clearAuthState(); }
          } else {
            setUser({ id: 'google_user', username: 'Google User', email: 'google@gmail.com' });
          }
          await refreshLikedSongs(cookieToken);
          await refreshRecentlyPlayed(cookieToken);
        } else {
          try {
            const response = await getCurrentUser(cookieToken);
            setUser(response.user || null);
            await refreshLikedSongs(cookieToken);
            await refreshRecentlyPlayed(cookieToken);
          } catch {
            clearAuthState();
            setLoginType(null);
          }
        }
      } else if (cookieLoginType === 'guest') {
        setLoginType('guest');
        setUser(null);
      } else {
        setLoginType(null);
      }

      setAuthReady(true);
    };

    restoreSession();
  }, [clearAuthState, refreshLikedSongs, refreshRecentlyPlayed]);

  const login = useCallback(async (identifier, password) => {
    const response = await loginUser(identifier, password);
    Cookies.set('token', response.token, { expires: 7 });
    Cookies.set('loginType', 'user', { expires: 7 });
    setToken(response.token);
    setUser(response.user || null);
    setLoginType('user');
    await refreshLikedSongs(response.token);
    await refreshRecentlyPlayed(response.token);
    return response;
  }, [refreshLikedSongs, refreshRecentlyPlayed]);

  const signup = useCallback(async (payload) => {
    const response = await registerUser(payload);
    Cookies.set('token', response.token, { expires: 7 });
    Cookies.set('loginType', 'user', { expires: 7 });
    setToken(response.token);
    setUser(response.user || null);
    setLoginType('user');
    await refreshLikedSongs(response.token);
    await refreshRecentlyPlayed(response.token);
    return response;
  }, [refreshLikedSongs, refreshRecentlyPlayed]);

  const loginWithGoogle = useCallback(async (googleData = null) => {
    let googleUserObj = null;

    if (googleData?.userInfo) {
      googleUserObj = googleData.userInfo;
    } else if (googleData && typeof googleData === 'object') {
      googleUserObj = googleData;
    }

    try {
      if (googleData?.credential || googleData?.userInfo) {
        const response = await googleLoginUser(googleData);
        if (response?.token) {
          Cookies.set('token', response.token, { expires: 7 });
          Cookies.set('loginType', 'user', { expires: 7 });
          setToken(response.token);
          setUser(response.user || null);
          setLoginType('user');
          setAuthModalOpen(false);
          await refreshLikedSongs(response.token);
          await refreshRecentlyPlayed(response.token);
          return response;
        }
      }
    } catch (err) {
      console.warn('[auth] Real Google backend verification failed, using client Google session fallback:', err.message);
    }

    const userEmail = googleUserObj?.email || 'user.google@gmail.com';
    const userName = googleUserObj?.name || googleUserObj?.given_name || 'Google User';
    const userAvatar = googleUserObj?.picture || '';
    const userId = googleUserObj?.sub || 'google_' + Date.now();

    const gUser = {
      id: userId,
      username: userName,
      name: userName,
      email: userEmail,
      picture: userAvatar,
    };

    const gToken = 'google_session_' + userId;
    Cookies.set('token', gToken, { expires: 7 });
    Cookies.set('loginType', 'user', { expires: 7 });
    localStorage.setItem('rol_google_user', JSON.stringify(gUser));

    setToken(gToken);
    setUser(gUser);
    setLoginType('user');
    setAuthModalOpen(false);
    await refreshLikedSongs(gToken);
    await refreshRecentlyPlayed(gToken);
    return { token: gToken, user: gUser };
  }, [refreshLikedSongs, refreshRecentlyPlayed]);

  const continueAsGuest = useCallback(() => {
    clearAuthState();
    Cookies.set('loginType', 'guest', { expires: 7 });
    setLoginType('guest');
    setAuthModalOpen(false);
  }, [clearAuthState]);

  const logout = useCallback(() => {
    clearAuthState();
    Cookies.set('loginType', 'guest', { expires: 7 });
    setLoginType('guest');
    setAuthModalOpen(false);
  }, [clearAuthState]);

  const isSongLiked = useCallback((song) => {
    if (!song || !likedSongIds || likedSongIds.length === 0) return false;
    const candidates = [
      song.id,
      song._id,
      song.sourceId,
      song.song?.id,
      song.song?._id,
      song.song?.sourceId,
    ].filter(Boolean).map(String);

    return candidates.some(id => likedSongIds.includes(id));
  }, [likedSongIds]);

  const toggleLike = useCallback(async (song) => {
    const effectiveToken = token || Cookies.get('token');
    const effectiveLoginType = loginType || Cookies.get('loginType');

    if (effectiveLoginType !== 'user' || !effectiveToken) {
      openAuthModal('Sign in to like songs and save them to your library');
      return false;
    }

    const songId = song?.id || song?._id || song?.sourceId;
    if (!songId) return false;

    const currentlyLiked = isSongLiked(song);
    const idCandidates = [
      song.id,
      song._id,
      song.sourceId,
      song.song?.id,
      song.song?._id,
      song.song?.sourceId,
    ].filter(Boolean).map(String);

    // Optimistic UI update so the heart responds with 0ms delay!
    setLikedSongIds(prev => {
      let updated;
      if (currentlyLiked) {
        updated = prev.filter(id => !idCandidates.includes(id));
      } else {
        updated = Array.from(new Set([...prev, ...idCandidates]));
      }
      try { localStorage.setItem('rol_liked_song_ids', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      const payload = {
        id: song.id || song._id || song.sourceId,
        sourceId: song.sourceId || song.id || song._id,
        title: song.title || song.name || 'Untitled',
        artist: song.artistName || song.artist || 'Unknown Artist',
        artistName: song.artistName || song.artist || 'Unknown Artist',
        cover: song.cover || song.albumCover || '',
        albumCover: song.albumCover || song.cover || '',
        src: song.src || song.audioUrl || '',
        audioUrl: song.audioUrl || song.src || '',
        duration: Number(song.duration) || 0,
        album: song.album || '',
      };
      await toggleLikeSong(songId, effectiveToken, currentlyLiked, payload);
      await refreshLikedSongs(effectiveToken);
      return true;
    } catch (error) {
      console.warn('[auth] toggleLikeSong backend failed, keeping optimistic state:', error.message);
      return true;
    }
  }, [token, loginType, openAuthModal, isSongLiked, refreshLikedSongs]);

  const value = useMemo(() => ({
    loginType,
    token,
    user,
    authReady,
    authModalOpen,
    authModalMessage,
    likedSongIds,
    recentlyPlayed,
    login,
    signup,
    loginWithGoogle,
    logout,
    continueAsGuest,
    openAuthModal,
    closeAuthModal,
    refreshLikedSongs,
    refreshRecentlyPlayed,
    toggleLike,
    isSongLiked,
  }), [
    loginType,
    token,
    user,
    authReady,
    authModalOpen,
    authModalMessage,
    likedSongIds,
    recentlyPlayed,
    login,
    signup,
    loginWithGoogle,
    logout,
    continueAsGuest,
    openAuthModal,
    closeAuthModal,
    refreshLikedSongs,
    refreshRecentlyPlayed,
    toggleLike,
    isSongLiked,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
