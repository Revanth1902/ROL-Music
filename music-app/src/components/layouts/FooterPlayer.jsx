// ===================== IMPORTS =====================
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { searchArtists, searchAlbums } from "../../api/apiService";
import { downloadSongWithMetadata, subscribeDownloadProgress } from "../../utils/downloadSong";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Box, Typography, Menu, MenuItem, LinearProgress, CircularProgress, Dialog, DialogTitle, DialogContent, TextField, Button, IconButton, Grow } from "@mui/material";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import SearchIcon from "@mui/icons-material/Search";
import { useAuth } from "../../contexts/AuthContext";
import { getPlaylists, createPlaylist, addSongToPlaylist } from "../../api/authApi";

// MUI Icons
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import RepeatIcon from "@mui/icons-material/Repeat";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import DownloadIcon from "@mui/icons-material/Download";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ShareIcon from "@mui/icons-material/Share";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LyricsIcon from "@mui/icons-material/Lyrics";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import { MdDragHandle } from 'react-icons/md';
import rolLogo from '../../assets/rol-logo1.png';
import SeekBar from "../ui/SeekBar"
import WaveProgressBar from "../ui/WaveProgressBar";
import SongActions from "../ui/SongActions";
import ThreeDotMenu from "../ui/ThreeDotMenu";
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";
import { useQueue } from "../../contexts/QueueContext";
import { shareSong } from "../../utils/share";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import MP3Tag from 'mp3tag.js';

import DownloadForOfflineIcon from "@mui/icons-material/DownloadForOffline";

import { triggerHaptic } from "../../utils/haptics";
import { saveSongOffline, isSongSavedOffline } from "../../utils/offlineStorage";

import "../styles/footerPlayer.css";


// ===================== MAIN COMPONENT =====================
export default function FooterPlayer() {

  const {
    current, playing, audioLoading, playSong, togglePlay, progress, duration, seek, toggleLoop, loop, volume, setVolume, isMuted, toggleMute,
    analyserNode, pannerVal, setPannerVal, playPrevious, playNext
  } = useAudioPlayer();
  const { queue, setQueue, reorderQueue, removeFromQueue, isShuffle, toggleShuffle, isAutoPlay, toggleAutoPlay, pushToHistory } = useQueue();

  const [openFull, setOpenFull] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showQueue, setShowQueue] = useState(false);
  const [dlState, setDlState] = useState(null); // { name, progress 0-100, done }
  const [lyricsData, setLyricsData] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState(false);
  const [showDesktopLyrics, setShowDesktopLyrics] = useState(false);
  const [isLyricsFlipped, setIsLyricsFlipped] = useState(false);

  const [showVisualizer, setShowVisualizer] = useState(true);
  const [isSavedOffline, setIsSavedOffline] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const isHistoryPushedRef = useRef(false);
  const prevPathRef = useRef(location.pathname);

  // Auth & Like / Playlist states
  const { loginType, token, toggleLike, isSongLiked, openAuthModal } = useAuth();
  const isLiked = useMemo(() => isSongLiked(current), [isSongLiked, current]);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  // Playlist Dialog State
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistFeedback, setPlaylistFeedback] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistPrivacy, setNewPlaylistPrivacy] = useState('private');
  const [addingToId, setAddingToId] = useState(null);
  const [addedSuccessId, setAddedSuccessId] = useState(null);
  const [playlistTab, setPlaylistTab] = useState(0);
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [targetSongForPlaylist, setTargetSongForPlaylist] = useState(null);

  const handleLike = async (e) => {
    e?.stopPropagation();
    if (loginType !== 'user') {
      openAuthModal('Sign in to like songs and save them to your library');
      triggerHaptic(15);
      return;
    }

    if (!current || isLikeLoading) return;
    setIsLikeLoading(true);
    setLikeAnim(true);
    triggerHaptic(25);

    try {
      await toggleLike(current);
    } catch (err) {
      console.warn('[handleLike error]', err);
    } finally {
      setIsLikeLoading(false);
      setTimeout(() => setLikeAnim(false), 600);
    }
  };

  const handleOpenPlaylist = async (e, specificSong = null, initialTab = 0) => {
    e?.stopPropagation();
    if (loginType !== 'user') {
      openAuthModal('Sign in to create custom playlists and add songs');
      triggerHaptic(15);
      return;
    }

    const songTarget = specificSong || current;
    setTargetSongForPlaylist(songTarget);
    setPlaylistModalOpen(true);
    setPlaylistTab(initialTab);
    setPlaylistSearch('');
    setPlaylistFeedback('');
    setPlaylistLoading(true);
    try {
      const data = await getPlaylists(token);
      setUserPlaylists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[getPlaylists error]', err);
    } finally {
      setPlaylistLoading(false);
    }
  };

  // Listen to global open playlist event (ThreeDotMenu, SongCard, Playlists page, etc.)
  useEffect(() => {
    const handleOpenModalEvent = (e) => {
      const detail = e.detail;
      const songToUse = detail?.title ? detail : (detail?.song || current);
      const tabToUse = detail?.tab !== undefined ? detail.tab : (songToUse ? 0 : 1);
      handleOpenPlaylist(null, songToUse, tabToUse);
    };
    window.addEventListener('rol_open_playlist_modal', handleOpenModalEvent);
    return () => window.removeEventListener('rol_open_playlist_modal', handleOpenModalEvent);
  }, [current, loginType, token]);

  const handleAddToExistingPlaylist = async (playlistId, playlistTitle) => {
    const activeSong = targetSongForPlaylist || current;
    if (!activeSong) return;
    setAddingToId(playlistId);
    setPlaylistFeedback('');
    try {
      await addSongToPlaylist(playlistId, activeSong.id || activeSong._id || activeSong.sourceId, token, activeSong);
      setAddedSuccessId(playlistId);
      setPlaylistFeedback(`Added to "${playlistTitle}"!`);
      triggerHaptic(20);
      setTimeout(() => {
        setPlaylistModalOpen(false);
        setAddedSuccessId(null);
        setAddingToId(null);
        setTargetSongForPlaylist(null);
      }, 900);
    } catch (err) {
      setPlaylistFeedback(err.message || 'Could not add song to playlist');
      setAddingToId(null);
    }
  };

  const handleCreateAndAddPlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setPlaylistLoading(true);
    setPlaylistFeedback('');
    const activeSong = targetSongForPlaylist || current;
    try {
      const created = await createPlaylist({ playlistName: newPlaylistName.trim(), privacy: newPlaylistPrivacy }, token);
      const targetId = created?.data?._id || created?.data?.id || created?._id || created?.id;
      if (targetId && activeSong) {
        await addSongToPlaylist(targetId, activeSong.id || activeSong._id || activeSong.sourceId, token, activeSong);
      }
      setPlaylistFeedback(`Playlist "${newPlaylistName.trim()}" created!`);
      setNewPlaylistName('');
      triggerHaptic(25);
      const updated = await getPlaylists(token);
      setUserPlaylists(Array.isArray(updated) ? updated : []);
      setTimeout(() => {
        setPlaylistModalOpen(false);
        setTargetSongForPlaylist(null);
      }, 900);
    } catch (err) {
      setPlaylistFeedback(err.message || 'Could not create playlist');
    } finally {
      setPlaylistLoading(false);
    }
  };

  // Subscribe to global download progress (ThreeDotMenu, FooterPlayer, etc.)
  useEffect(() => {
    const unsub = subscribeDownloadProgress(setDlState);
    return () => unsub();
  }, []);

  // Clean close of fullscreen player (user action via chevron or swipe-down)
  const closeFullscreen = useCallback(() => {
    if (isHistoryPushedRef.current) {
      isHistoryPushedRef.current = false;
      try {
        window.history.back();
      } catch (err) {
        console.warn('[FooterPlayer] history.back error:', err);
      }
    }
    setOpenFull(false);
    setShowQueue(false);
    setIsLyricsFlipped(false);
  }, []);

  const artistList = useMemo(() => {
    if (!current) return [];
    if (Array.isArray(current.artists) && current.artists.length > 0) {
      return current.artists;
    }
    if (current.artistName) {
      return current.artistName.split(',').map((name, i) => ({
        id: i === 0 ? (current.artistId || '') : '',
        name: name.trim(),
      })).filter(a => a.name);
    }
    return [];
  }, [current]);

  const navigateFromFullscreen = useCallback((targetUrl) => {
    // 1. Dismiss fullscreen UI state cleanly
    setOpenFull(false);
    setShowQueue(false);
    setIsLyricsFlipped(false);

    // 2. If a state was pushed to history to allow back-button to close fullscreen,
    // replace that state with the target URL so we do not cause popstate race conditions
    // or trigger an unintended history.back()
    if (isHistoryPushedRef.current) {
      isHistoryPushedRef.current = false;
      navigate(targetUrl, { replace: true });
    } else {
      navigate(targetUrl);
    }
  }, [navigate]);

  const handleArtistClick = async (artist) => {
    if (!artist) return;
    const name = typeof artist === 'string' ? artist : artist.name;
    if (!name) return;

    let targetId = typeof artist === 'object' ? artist.id : '';
    if (!targetId && current?.artistId && (name.toLowerCase() === (current.artistName || '').toLowerCase() || (current.artists?.[0]?.name || '').toLowerCase() === name.toLowerCase())) {
      targetId = current.artistId;
    }

    if (targetId) {
      navigateFromFullscreen(`/artist/${targetId}`);
      return;
    }

    try {
      const res = await searchArtists(name, 0, 1);
      const firstArtist = res?.results?.[0];
      if (firstArtist?.id) {
        navigateFromFullscreen(`/artist/${firstArtist.id}`);
        return;
      }
    } catch (e) {
      console.warn('[handleArtistClick search error]', e);
    }

    navigateFromFullscreen(`/songs?q=${encodeURIComponent(name)}`);
  };

  const handleAlbumClick = async () => {
    if (!current) return;
    const albumId = current.albumId;
    const albumName = current.album;

    if (albumId) {
      navigateFromFullscreen(`/album/${albumId}`);
      return;
    }

    if (albumName) {
      try {
        const res = await searchAlbums(albumName, 0, 1);
        const firstAlbum = res?.results?.[0];
        if (firstAlbum?.id) {
          navigateFromFullscreen(`/album/${firstAlbum.id}`);
          return;
        }
      } catch (e) {
        console.warn('[handleAlbumClick search error]', e);
      }
      navigateFromFullscreen(`/songs?q=${encodeURIComponent(albumName)}`);
    }
  };

  // When openFull becomes true, push a state into browser history so back button closes it without route change
  useEffect(() => {
    if (openFull) {
      if (!isHistoryPushedRef.current) {
        try {
          window.history.pushState(
            { ...window.history.state, rolFullscreenPlayer: true },
            '',
            window.location.href
          );
          isHistoryPushedRef.current = true;
        } catch (err) {
          console.warn('[FooterPlayer] pushState error:', err);
        }
      }
    }
  }, [openFull]);

  // Handle browser/mobile back button (popstate event)
  useEffect(() => {
    const handlePopState = () => {
      if (isHistoryPushedRef.current || openFull) {
        isHistoryPushedRef.current = false;
        setOpenFull(false);
        setShowQueue(false);
        setIsLyricsFlipped(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [openFull]);

  // Support for Capacitor native Android hardware back button
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backHandler = null;
    const registerCapacitorBack = async () => {
      try {
        backHandler = await CapApp.addListener('backButton', () => {
          if (openFull) {
            closeFullscreen();
          } else if (window.history.length > 1) {
            window.history.back();
          } else {
            CapApp.exitApp();
          }
        });
      } catch (e) {
        console.warn('[FooterPlayer] Capacitor backButton listener error:', e);
      }
    };
    registerCapacitorBack();

    return () => {
      if (backHandler?.remove) backHandler.remove();
    };
  }, [openFull, closeFullscreen]);

  // Auto-close fullscreen if user navigates to another page (e.g., from 3-dot menu)
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      if (openFull) {
        isHistoryPushedRef.current = false;
        setOpenFull(false);
        setShowQueue(false);
        setIsLyricsFlipped(false);
      }
    }
  }, [location.pathname, openFull]);

  // Cleanup history entry on unmount
  useEffect(() => {
    return () => {
      if (isHistoryPushedRef.current) {
        isHistoryPushedRef.current = false;
        try {
          window.history.back();
        } catch {}
      }
    };
  }, []);

  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (current?.id) {
      isSongSavedOffline(current.id).then(setIsSavedOffline).catch(console.error);
    }
  }, [current?.id]);

  const handleSaveOffline = async () => {
    if (!current) return;
    triggerHaptic(25);
    try {
      if (isSavedOffline) {
        setIsSavedOffline(false);
      } else {
        await saveSongOffline(current);
        setIsSavedOffline(true);
      }
    } catch (err) {
      console.warn('[FooterPlayer] offline save failed:', err.message);
    }
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      triggerHaptic(20);
      if (diffX < 0) playNext();
      else playPrevious();
    } else if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX)) {
      // Vertical swipe down to minimize
      triggerHaptic(20);
      closeFullscreen();
    }
  };

  const titleRef = useRef();
  const artistRef = useRef();
  const firstPlayRef = useRef(true);
  
  const activeLyricRef = useRef(null);
  const desktopActiveLyricRef = useRef(null);

  // Auto-scroll active lyrics
  useEffect(() => {
    if (activeLyricRef.current && isLyricsFlipped) {
      activeLyricRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [progress, isLyricsFlipped]);

  useEffect(() => {
    if (desktopActiveLyricRef.current && showDesktopLyrics) {
      desktopActiveLyricRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [progress, showDesktopLyrics]);

  // ===================== AUTO-OPEN FULLSCREEN (MOBILE FIRST PLAY) =====================
  useEffect(() => {
    if (current && firstPlayRef.current) {
      firstPlayRef.current = false;
      if (window.innerWidth <= 768) {
        requestAnimationFrame(() => setOpenFull(true));
      }
    }
  }, [current]);

  const progressPercent = duration
    ? Math.min((progress / duration) * 100, 100)
    : 0;



  // ===================== MEDIA SESSION =====================
  useEffect(() => {
    if (!current) return;
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: current.title,
        artist: current.artistName,
        album: current.album || "ROL Music",
        artwork: [{ src: current.cover, sizes: "512x512", type: "image/png" }],
      });
      navigator.mediaSession.setActionHandler("play", togglePlay);
      navigator.mediaSession.setActionHandler("pause", togglePlay);
      navigator.mediaSession.setActionHandler("nexttrack", playNext);
      navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, playing, queue, togglePlay]);

  // Fetch Lyrics
  useEffect(() => {
    if (!current) return;

    let isMounted = true;
    const cleanTitle = (current.title || "").replace(/\s*\(From.*?\)\s*/i, "").trim();

    const fetchLyrics = async () => {
      setLyricsData(null);
      setLyricsError(false);
      setLyricsLoading(true);

      try {
        const q = encodeURIComponent(cleanTitle);
        const r = await fetch(`https://lrclib.net/api/search?q=${q}`);
        const data = await r.json();
        if (!isMounted) return;

        if (data && data.length > 0) {
          const searchTitle = cleanTitle.toLowerCase();
          const searchArtist = (current.artistName || "").toLowerCase();

          let track = data[0];
          let bestScore = -1;

          for (const item of data) {
            let score = 0;
            const itemTitle = (item.trackName || item.name || "").toLowerCase();
            const itemArtist = (item.artistName || "").toLowerCase();

            if (itemTitle === searchTitle) score += 20;
            else if (itemTitle.includes(searchTitle) || searchTitle.includes(itemTitle)) score += 10;
            else score -= 10;

            if (searchArtist && (itemArtist.includes(searchArtist) || searchArtist.includes(itemArtist) || itemArtist === searchArtist)) {
              score += 20;
            }

            if (item.syncedLyrics) score += 5;

            if (score > bestScore) {
              bestScore = score;
              track = item;
            }
          }

          let synced = null;
          if (track.syncedLyrics) {
            synced = [];
            track.syncedLyrics.split('\n').forEach(line => {
              const m = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
              if (m) {
                synced.push({
                  time: parseInt(m[1], 10) * 60 + parseFloat(m[2]),
                  text: m[3].trim()
                });
              }
            });
          }
          setLyricsData({ plain: track.plainLyrics, synced });
        } else {
          setLyricsError(true);
        }
      } catch (e) {
        if (isMounted) {
          console.error("Lyrics Error:", e);
          setLyricsError(true);
        }
      } finally {
        if (isMounted) setLyricsLoading(false);
      }
    };

    fetchLyrics();

    return () => { isMounted = false; };
  }, [current]);

  // ===================== MARQUEE =====================
  useEffect(() => {
    if (!current) return;
    const setup = (el) => {
      if (!el) return;
      const parent = el.parentElement;
      if (!parent) return;
      if (el.scrollWidth > parent.clientWidth) {
        const distance = el.scrollWidth - parent.clientWidth;
        const dur = Math.max(3, distance / 40);
        el.style.setProperty('--scroll-distance', `-${distance}px`);
        el.style.animation = `marquee-scroll ${dur}s linear infinite alternate`;
      } else {
        el.style.animation = "none";
        el.style.transform = "translateX(0)";
      }
    };
    setTimeout(() => {
      setup(titleRef.current);
      setup(artistRef.current);
    }, 100);
  }, [current]);


  // ===================== DOWNLOAD WITH METADATA + PROGRESS =====================
  const downloadSong = (song) => {
    if (!song) return;
    downloadSongWithMetadata(song);
  };


  if (!current) return null;

  // ===================== QUEUE DRAG =====================
  const onDragEnd = (result) => {
    if (!result.destination) return;
    reorderQueue(result.source.index, result.destination.index);
  };

  // ===================== MENU =====================
  const openMenu = (e, id) => {
    setSelectedId(id);
    setMenuAnchor(e.currentTarget);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setSelectedId(null);
  };

  const selectedSong = queue.find(s => s.id === selectedId);

  // ===================== UI =====================
  return (
    <>
      {/* DOWNLOAD PROGRESS TOAST */}
      {dlState && (
        <Box sx={{
          position: 'fixed', bottom: 88, right: 16, zIndex: 9999,
          background: 'rgba(15,18,32,0.96)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(108,99,255,0.35)',
          borderRadius: '14px', padding: '12px 16px',
          minWidth: 260, maxWidth: 320,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'fadeSlideUp 0.3s ease',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {dlState.done
              ? <CheckCircleIcon sx={{ color: '#1db954', fontSize: '1.1rem' }} />
              : <DownloadIcon sx={{ color: '#a78bfa', fontSize: '1.1rem' }} />
            }
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dlState.done ? 'Downloaded!' : `Downloading: ${dlState.name}`}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={dlState.progress}
            sx={{
              borderRadius: 4, height: 5,
              backgroundColor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': {
                background: dlState.done
                  ? 'linear-gradient(90deg, #1db954, #14a849)'
                  : 'linear-gradient(90deg, #6c63ff, #a78bfa)',
                borderRadius: 4,
                transition: 'transform 0.15s linear',
              },
            }}
          />
          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', mt: 0.5 }}>
            {dlState.done ? 'Saved with metadata & cover art' : `${dlState.progress}% — with metadata & cover art`}
          </Typography>
        </Box>
      )}

      {/* MOBILE MINI PLAYER */}
      <Box
        className="mobile-mini-player"
        onClick={() => setOpenFull(true)}
        style={{ '--mini-progress': `${progressPercent}%` }}
      >
        <img src={current.cover} className="mini-cover" alt={current.title}
          onError={e => e.target.style.display = 'none'} />

        <div className="mini-info">
          <div className="mini-title">{current.title}</div>
          <div className="mini-artist">{current.artistName}</div>
        </div>

        <div className="mini-controls">
          <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress
              variant="determinate"
              value={progressPercent}
              size={44}
              thickness={3}
              sx={{ color: "#6c63ff", position: "absolute", left: 0, top: 0 }}
            />
            <Box
              onClick={e => { e.stopPropagation(); togglePlay(); }}
              sx={{
                width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', cursor: 'pointer', zIndex: 1,
              }}
            >
              {audioLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : playing ? <PauseIcon /> : <PlayArrowIcon />}
            </Box>
          </Box>

          <Box
            onClick={e => { e.stopPropagation(); playNext(); }}
            sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
          >
            <SkipNextIcon />
          </Box>
        </div>
      </Box>


      {/* DESKTOP PLAYER */}
      <Box className="footer-player-desktop">
        {/* LEFT */}
        <Box className="footer-left">
          <img
            src={current.cover}
            className="footer-cover"
            alt={current.title}
            onError={e => e.target.style.display = 'none'}
            onClick={() => setOpenFull(true)}
            title="Expand player"
          />
          <div className="marqueemaincontainer">
            <div className="marquee-container">
              <div className="marquee" ref={titleRef}>
                <Typography className="footer-title">{current.title}</Typography>
              </div>
            </div>
            <div className="marquee-container">
              <div className="marquee artist" ref={artistRef}>
                <Typography className="footer-artist">
                  {artistList && artistList.length > 0 ? (
                    artistList.map((artist, idx) => (
                      <React.Fragment key={artist.name + idx}>
                        <span
                          className="footer-clickable-artist"
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArtistClick(artist);
                          }}
                        >
                          {artist.name}
                        </span>
                        {idx < artistList.length - 1 && <span className="footer-artist-sep">, </span>}
                      </React.Fragment>
                    ))
                  ) : current?.artistName ? (
                    <span
                      className="footer-clickable-artist"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArtistClick({ name: current.artistName, id: current.artistId });
                      }}
                    >
                      {current.artistName}
                    </span>
                  ) : null}
                </Typography>
              </div>
            </div>
          </div>

          <div className="footer-left-actions">
            <button
              className={`fp-action-btn fp-like-btn ${isLiked ? 'liked' : ''} ${likeAnim ? 'like-pop' : ''}`}
              onClick={handleLike}
              title={loginType === 'user' ? (isLiked ? 'Unlike song' : 'Like song') : 'Log in to like song'}
              aria-label={isLiked ? 'Unlike song' : 'Like song'}
            >
              {isLikeLoading ? (
                <CircularProgress size={18} thickness={4.5} sx={{ color: '#ff3366' }} />
              ) : isLiked ? (
                <FavoriteIcon sx={{ fontSize: '1.25rem', color: '#ff3366' }} />
              ) : (
                <FavoriteBorderIcon sx={{ fontSize: '1.25rem' }} />
              )}
            </button>

            <button
              className="fp-action-btn fp-playlist-btn"
              onClick={handleOpenPlaylist}
              title={loginType === 'user' ? 'Add to Playlist' : 'Log in to add to playlist'}
              aria-label="Add to Playlist"
            >
              <PlaylistAddIcon sx={{ fontSize: '1.25rem' }} />
            </button>
          </div>
        </Box>

        {/* CENTER */}
        <Box className="footer-center">
          <Box className="footer-controls">
            <button
              className={`fp-ctrl-btn ${isShuffle ? 'fp-ctrl-active' : ''}`}
              onClick={toggleShuffle}
              title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
            >
              <ShuffleIcon sx={{ fontSize: '1.2rem' }} />
            </button>

            <button className="fp-ctrl-btn" onClick={playPrevious} title="Previous">
              <SkipPreviousIcon sx={{ fontSize: '1.5rem' }} />
            </button>

            <button
              className="fp-play-btn"
              onClick={togglePlay}
              title={playing ? 'Pause' : 'Play'}
            >
              {audioLoading ? (
                <CircularProgress size={20} sx={{ color: '#0a0c18' }} />
              ) : playing ? (
                <PauseIcon sx={{ fontSize: '1.5rem' }} />
              ) : (
                <PlayArrowIcon sx={{ fontSize: '1.5rem' }} />
              )}
            </button>

            <button className="fp-ctrl-btn" onClick={playNext} title="Next">
              <SkipNextIcon sx={{ fontSize: '1.5rem' }} />
            </button>

            <button
              className={`fp-ctrl-btn ${loop ? 'fp-ctrl-active' : ''}`}
              onClick={toggleLoop}
              title={loop ? 'Repeat On' : 'Repeat Off'}
            >
              <RepeatIcon sx={{ fontSize: '1.2rem' }} />
            </button>
          </Box>

          <SeekBar progress={progress} duration={duration} onSeek={seek} />
        </Box>

        {/* RIGHT */}
        <Box className="footer-right">
          <button
            className={`fp-ctrl-btn ${isAutoPlay ? 'fp-ctrl-active' : ''}`}
            onClick={toggleAutoPlay}
            title={isAutoPlay ? 'Autoplay On (Similar songs auto-queued)' : 'Autoplay Off'}
          >
            <AutoAwesomeIcon sx={{ fontSize: '1.2rem' }} />
          </button>

          <button
            className={`fp-ctrl-btn ${showDesktopLyrics ? 'fp-ctrl-active' : ''}`}
            onClick={() => { setShowDesktopLyrics(!showDesktopLyrics); setShowQueue(false); }}
            title="Lyrics"
          >
            <LyricsIcon sx={{ fontSize: '1.2rem' }} />
          </button>

          <button className="fp-ctrl-btn" onClick={() => downloadSong(current)} title="Download MP3">
            <DownloadIcon sx={{ fontSize: '1.2rem' }} />
          </button>

          <button
            className={`fp-ctrl-btn fp-queue-btn ${showQueue ? 'fp-ctrl-active' : ''}`}
            onClick={() => { setShowQueue(prev => !prev); setShowDesktopLyrics(false); }}
            title={`Queue (${queue.length} songs)`}
          >
            <QueueMusicIcon sx={{ fontSize: '1.2rem' }} />
            {queue.length > 0 && <span className="fp-queue-badge">{queue.length}</span>}
          </button>

          {/* Volume Control */}
          <div className="fp-volume-wrap">
            <button
              className={`fp-ctrl-btn ${isMuted ? 'fp-ctrl-active' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeOffIcon sx={{ fontSize: '1.2rem' }} />
              ) : volume < 0.5 ? (
                <VolumeDownIcon sx={{ fontSize: '1.2rem' }} />
              ) : (
                <VolumeUpIcon sx={{ fontSize: '1.2rem' }} />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="fp-vol-slider"
              style={{
                '--vol-percent': `${(isMuted ? 0 : volume) * 100}%`,
              }}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
        </Box>
      </Box>


      {/* MOBILE FULLSCREEN PLAYER — PREMIUM */}
      {openFull && (
        <div className="fullscreen-player" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {/* ── Blurred background ── */}
          <div className="fs-bg">
            <img src={current.cover} className="fs-bg-img" alt="" aria-hidden />
            <div className="fs-bg-overlay" />
          </div>

          {/* ── Content ── */}
          <div className="fs-content">
            {/* Top bar */}
            <div className="fs-topbar">
              <button className="fs-chevron-btn" onClick={closeFullscreen} aria-label="Close">
                <KeyboardArrowDownIcon sx={{ fontSize: '2rem' }} />
              </button>
              <span className="fs-topbar-label">Now Playing</span>
              <ThreeDotMenu song={current} />
            </div>

            {/* Tab switcher */}
            <div className="fs-tabs">
              <button
                className={`fs-tab ${!showQueue ? 'active' : ''}`}
                onClick={() => { setShowQueue(false); setIsLyricsFlipped(false); }}
              >
                Song
              </button>
              <button
                className={`fs-tab ${showQueue ? 'active' : ''}`}
                onClick={() => setShowQueue(true)}
              >
                Queue {queue.length > 0 && `(${queue.length})`}
              </button>
            </div>

            <div className="fs-slider-container">
              <div className={`fs-slider ${showQueue ? 'show-queue' : 'show-song'}`}>

                {/* ── VIEW: SONG ── */}
                <div className="fs-view-song">
                  {/* ── Album Art (Flip Container) ── */}
                  <div className={`fs-art-flip-container ${isLyricsFlipped ? "flipped" : ""}`}>
                    <div className="fs-art-flipper">
                      {/* Front: Image */}
                      <div className="fs-art-front">
                        <div className="fs-art-wrap">
                          <img
                            src={current.cover}
                            className="fs-art"
                            alt={current.title}
                            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=♪&background=1a1040&color=a78bfa&size=320` }}
                          />
                          {/* ROL watermark */}
                          <img src={rolLogo} className="fs-art-logo" alt="ROL" aria-hidden />
                        </div>
                      </div>

                      {/* Back: Lyrics */}
                      <div className="fs-art-back">
                        <div className="mobile-lyrics-container">
                          {lyricsLoading && <div className="lyrics-loader"><div className="heart-pulse-loader" style={{ margin: '0 auto' }}></div><p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Fetching lyrics...</p></div>}
                          {lyricsError && <div className="lyrics-error" style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: '0.9rem', padding: '20px 0' }}>No lyrics available for this song</div>}
                          {lyricsData?.synced ? (
                            <div className="synced-lyrics-mobile">
                              {lyricsData.synced.map((lrc, i) => {
                                const isActive = progress >= lrc.time && (!lyricsData.synced[i + 1] || progress < lyricsData.synced[i + 1].time);
                                return (
                                  <p 
                                    key={i} 
                                    className={`m-lrc-line ${isActive ? "active" : ""}`}
                                    ref={isActive ? activeLyricRef : null}
                                  >
                                    {lrc.text || <br />}
                                  </p>
                                );
                              })}
                            </div>
                          ) : lyricsData?.plain ? (
                            <div className="m-plain-lyrics" style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingBottom: '40px' }}>{lyricsData.plain}</div>
                          ) : (
                            !lyricsLoading && !lyricsError && <div className="m-plain-lyrics" style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '40px' }}>Lyrics not found</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Song Info ── */}
                  <div className="fs-info">
                    <div className="fs-info-text">
                      <div className="fs-song-title">{current.title}</div>
                      <div className="fs-song-artist">
                        {artistList && artistList.length > 0 ? (
                          artistList.map((artist, idx) => (
                            <React.Fragment key={artist.name + idx}>
                              <span
                                className="fs-clickable-artist"
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArtistClick(artist);
                                }}
                              >
                                {artist.name}
                              </span>
                              {idx < artistList.length - 1 && <span className="fs-artist-sep">, </span>}
                            </React.Fragment>
                          ))
                        ) : current?.artistName ? (
                          <span
                            className="fs-clickable-artist"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArtistClick({ name: current.artistName, id: current.artistId });
                            }}
                          >
                            {current.artistName}
                          </span>
                        ) : null}
                      </div>
                      {current?.album && (
                        <div
                          className="fs-song-album fs-clickable-album"
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAlbumClick();
                          }}
                        >
                          {current.album}
                        </div>
                      )}
                    </div>

                    {/* ── Info Actions (Like & Playlist for Fullscreen Player) ── */}
                    <div className="fs-info-actions">
                      <button
                        className={`fs-action-icon-btn fs-like-btn ${isLiked ? 'liked' : ''} ${likeAnim ? 'fs-like-pop' : ''}`}
                        onClick={handleLike}
                        title={loginType === 'user' ? (isLiked ? 'Unlike song' : 'Like song') : 'Log in to like song'}
                        aria-label={isLiked ? 'Unlike song' : 'Like song'}
                      >
                        {isLikeLoading ? (
                          <div className="fs-like-loading-wrap">
                            <CircularProgress size={24} thickness={4.5} sx={{ color: '#ff3366', position: 'absolute' }} />
                            <FavoriteIcon className="fs-like-pulse-icon" />
                          </div>
                        ) : isLiked ? (
                          <FavoriteIcon sx={{ fontSize: '1.45rem', color: '#ff3366' }} />
                        ) : (
                          <FavoriteBorderIcon sx={{ fontSize: '1.45rem' }} />
                        )}
                      </button>

                      <button
                        className="fs-action-icon-btn fs-playlist-btn"
                        onClick={handleOpenPlaylist}
                        title={loginType === 'user' ? 'Add to Playlist' : 'Log in to add to playlist'}
                        aria-label="Add to Playlist"
                      >
                        <PlaylistAddIcon sx={{ fontSize: '1.45rem' }} />
                      </button>
                    </div>
                  </div>

                  {/* ── Wave Seekbar ── */}
                  <div className="fs-seek-wrap">
                    <WaveProgressBar progress={progress} duration={duration} onSeek={seek} />
                  </div>

                  {/* ── 1st Row Controls (Primary Playback) ── */}
                  <div className="fs-controls fs-controls-row-1">
                    <button
                      className={`fs-ctrl-btn ${isShuffle ? 'active' : ''}`}
                      onClick={toggleShuffle}
                      title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
                    >
                      <ShuffleIcon sx={{ fontSize: '1.4rem' }} />
                    </button>

                    <button className="fs-ctrl-btn" onClick={playPrevious} title="Previous">
                      <SkipPreviousIcon sx={{ fontSize: '2rem' }} />
                    </button>

                    <button
                      className="fs-play-btn"
                      onClick={togglePlay}
                      title={playing ? 'Pause' : 'Play'}
                    >
                      {audioLoading
                        ? <div className="heart-pulse-loader"></div>
                        : playing ? <PauseIcon sx={{ fontSize: '2rem' }} /> : <PlayArrowIcon sx={{ fontSize: '2rem' }} />
                      }
                    </button>

                    <button className="fs-ctrl-btn" onClick={playNext} title="Next">
                      <SkipNextIcon sx={{ fontSize: '2rem' }} />
                    </button>

                    <button
                      className={`fs-ctrl-btn ${loop ? 'active' : ''}`}
                      onClick={toggleLoop}
                      title="Repeat"
                    >
                      <RepeatIcon sx={{ fontSize: '1.4rem' }} />
                    </button>
                  </div>

                  {/* ── 2nd Row Controls (Feature & Utility Actions) ── */}
                  <div className="fs-controls fs-controls-row-2">
                    <button
                      className={`fs-ctrl-btn ${isAutoPlay ? 'active' : ''}`}
                      onClick={toggleAutoPlay}
                      title={isAutoPlay ? 'Autoplay On' : 'Autoplay Off'}
                    >
                      <AutoAwesomeIcon sx={{ fontSize: '1.3rem' }} />
                    </button>

                    <button
                      className="fs-ctrl-btn"
                      onClick={() => downloadSong(current)}
                      title="Download MP3"
                    >
                      <DownloadIcon sx={{ fontSize: '1.3rem' }} />
                    </button>

                    <button
                      className={`fs-ctrl-btn ${isSavedOffline ? 'active' : ''}`}
                      onClick={handleSaveOffline}
                      title={isSavedOffline ? 'Saved Offline' : 'Save for Offline Playback'}
                    >
                      <DownloadForOfflineIcon sx={{ fontSize: '1.3rem' }} />
                    </button>

                    <button
                      className={`fs-ctrl-btn ${isLyricsFlipped ? 'active' : ''}`}
                      onClick={() => setIsLyricsFlipped(l => !l)}
                      title={isLyricsFlipped ? 'Back to Cover' : 'Show Lyrics'}
                    >
                      <LyricsIcon sx={{ fontSize: '1.3rem' }} />
                    </button>
                  </div>

                  {/* ── Actions ── */}
                  <div className="fs-actions">
                    <button className="fs-action-btn" onClick={() => setShowQueue(true)}>
                      <QueueMusicIcon className="fa-icon" />
                      <span>Queue</span>
                    </button>
                    <button className="fs-action-btn" onClick={handleOpenPlaylist}>
                      <PlaylistAddIcon className="fa-icon" />
                      <span>Playlist</span>
                    </button>
                    <button className="fs-action-btn" onClick={() => shareSong(current)}>
                      <ShareIcon className="fa-icon" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>

                {/* ── VIEW: QUEUE ── */}
                <div className="fs-view-queue">
                  <div className="fs-queue-strip">
                    <div className="fs-queue-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Up Next — {queue.length} songs</span>
                      <Box
                        onClick={toggleAutoPlay}
                        sx={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          px: 1.2, py: 0.3,
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: isAutoPlay ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255,255,255,0.08)',
                          color: isAutoPlay ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                          border: `1px solid ${isAutoPlay ? 'rgba(167, 139, 250, 0.4)' : 'transparent'}`,
                        }}
                      >
                        <AutoAwesomeIcon sx={{ fontSize: '0.85rem' }} />
                        Autoplay: {isAutoPlay ? 'ON' : 'OFF'}
                      </Box>
                    </div>
                    {queue.length === 0 ? (
                      <div className="fs-queue-empty">
                        <QueueMusicIcon sx={{ fontSize: '2.5rem', opacity: 0.2, mb: 1 }} />
                        <p>Queue is empty.</p>
                        <p>Add songs using the ⋮ menu on any song.</p>
                      </div>
                    ) : (
                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="fs-queue">
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              style={{ paddingBottom: 80 }}
                            >
                              {queue.map((track, i) => (
                                <Draggable key={`${track.id}-${i}`} draggableId={`fs-q-${track.id}-${i}`} index={i}>
                                  {(drag, snapshot) => (
                                    <div
                                      ref={drag.innerRef}
                                      {...drag.draggableProps}
                                      className={`fs-queue-item${snapshot.isDragging ? ' fs-queue-dragging' : ''}`}
                                      onClick={() => { if (current) pushToHistory(current); playSong(track, false); setQueue(queue.slice(i + 1)); }}
                                    >
                                      {/* Drag handle */}
                                      <div
                                        {...drag.dragHandleProps}
                                        className="fs-queue-drag-handle"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <MdDragHandle />
                                      </div>

                                      <div className="fs-queue-thumb-wrap">
                                        <img
                                          src={track.cover}
                                          className="fs-queue-thumb"
                                          alt={track.title}
                                          onError={e => e.target.style.display = 'none'}
                                        />
                                        <img src={rolLogo} className="img-rol-badge" alt="" aria-hidden />
                                      </div>

                                      <div className="fs-queue-info">
                                        <div className="fs-queue-title">{track.title}</div>
                                        <div className="fs-queue-artist">
                                          {track.artistName}
                                          {track.isAutoplayItem && (
                                            <span style={{ marginLeft: 6, fontSize: '0.68rem', color: '#a78bfa', background: 'rgba(167,139,250,0.15)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                                              ✨ Radio
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <button
                                        className="fs-queue-remove"
                                        onClick={e => { e.stopPropagation(); removeFromQueue(track.id); }}
                                        title="Remove"
                                      >
                                        <CloseIcon sx={{ fontSize: '0.9rem' }} />
                                      </button>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP LYRICS */}
      {showDesktopLyrics && (
        <Box className="desktop-lyrics">
          <h4>Lyrics — {current.title}</h4>
          <Box className="lyrics-content">
            {lyricsLoading && <div className="lyrics-loader"><div className="heart-pulse-loader" style={{ margin: '20px auto' }}></div><p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>Fetching lyrics...</p></div>}
            {lyricsError && <div className="lyrics-error" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '20px' }}>No lyrics available for this song</div>}
            {lyricsData?.synced ? (
              <div className="synced-lyrics-desktop">
                {lyricsData.synced.map((lrc, i) => {
                  const isActive = progress >= lrc.time && (!lyricsData.synced[i + 1] || progress < lyricsData.synced[i + 1].time);
                  return (
                    <p 
                      key={i} 
                      className={`lrc-line ${isActive ? "active" : ""}`}
                      ref={isActive ? desktopActiveLyricRef : null}
                    >
                      {lrc.text || <br />}
                    </p>
                  );
                })}
              </div>
            ) : lyricsData?.plain ? (
              <div className="plain-lyrics" style={{ whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>{lyricsData.plain}</div>
            ) : null}
          </Box>
        </Box>
      )}

      {/* DESKTOP QUEUE */}
      {showQueue && (
        <Box className="desktop-queue">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', m: 0 }}>
              Up Next — {queue.length} songs
            </Typography>
            <Box
              onClick={toggleAutoPlay}
              title="Toggle Autoplay similar songs when queue ends"
              sx={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                px: 1.2, py: 0.3,
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 600,
                background: isAutoPlay ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255,255,255,0.08)',
                color: isAutoPlay ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${isAutoPlay ? 'rgba(167, 139, 250, 0.4)' : 'transparent'}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: isAutoPlay ? 'rgba(167, 139, 250, 0.3)' : 'rgba(255,255,255,0.15)',
                }
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: '0.85rem' }} />
              Autoplay: {isAutoPlay ? 'ON' : 'OFF'}
            </Box>
          </Box>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="queue">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {queue.slice(0, 15).map((track, i) => (
                    <Draggable key={track.id} draggableId={track.id} index={i}>
                      {(drag) => (
                        <Box
                          className="queue-item"
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          {...drag.dragHandleProps}
                        >
                          <img
                            src={track.cover}
                            className="queue-img"
                            alt={track.title}
                            onError={e => e.target.style.display = 'none'}
                          />
                          <div className="queue-info">
                            <div className="queue-title">{track.title}</div>
                            <div className="queue-artist">
                              {track.artistName}
                              {track.isAutoplayItem && (
                                <span style={{ marginLeft: 6, fontSize: '0.68rem', color: '#a78bfa', background: 'rgba(167,139,250,0.15)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                                  ✨ Radio
                                </span>
                              )}
                            </div>
                          </div>
                          <Box
                            sx={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#fff' }, display: 'flex', alignItems: 'center', p: 0.5 }}
                            onClick={(e) => openMenu(e, track.id)}
                          >
                            <MoreVertIcon fontSize="small" />
                          </Box>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {queue.length === 0 && (
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', textAlign: 'center', mt: 2 }}>
              Queue is empty
            </Typography>
          )}
        </Box>
      )}

      {/* Queue Item Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        PaperProps={{
          sx: {
            background: 'rgba(18,22,38,0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'white',
            '& .MuiMenuItem-root': {
              fontSize: '0.85rem',
              gap: '8px',
              '&:hover': { background: 'rgba(108,99,255,0.12)' }
            }
          }
        }}
      >
        <MenuItem onClick={() => { removeFromQueue(selectedId); closeMenu(); }}>
          <CloseIcon fontSize="small" /> Remove from Queue
        </MenuItem>
        <MenuItem onClick={() => { if (selectedSong) { if (current) pushToHistory(current); playSong(selectedSong, false); setQueue(queue.filter(s => s.id !== selectedId)); } closeMenu(); }}>
          <PlayArrowIcon fontSize="small" /> Play Now
        </MenuItem>
        {selectedSong && (
          <MenuItem onClick={() => { downloadSong(selectedSong); closeMenu(); }}>
            <DownloadIcon fontSize="small" /> Download
          </MenuItem>
        )}
      </Menu>

      {/* ── Add to Playlist Dialog (Fullscreen Player & Global) ── */}
      <Dialog
        open={playlistModalOpen}
        onClose={() => { setPlaylistModalOpen(false); setTargetSongForPlaylist(null); }}
        maxWidth="xs"
        fullWidth
        TransitionComponent={Grow}
        transitionDuration={{ enter: 260, exit: 180 }}
        PaperProps={{
          sx: {
            background: 'linear-gradient(180deg, rgba(20, 25, 46, 0.98) 0%, rgba(11, 14, 28, 0.99) 100%)',
            backdropFilter: 'blur(32px)',
            border: '1px solid rgba(167, 139, 250, 0.22)',
            borderRadius: '24px',
            color: '#ffffff',
            boxShadow: '0 28px 80px rgba(0,0,0,0.85), 0 0 50px rgba(108, 99, 255, 0.15)',
            p: 1.5,
            overflow: 'hidden',
          }
        }}
        sx={{
          zIndex: 99999,
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(6, 8, 18, 0.78)',
            backdropFilter: 'blur(12px)',
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, pt: 1, px: 1.5, color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.25) 0%, rgba(167, 139, 250, 0.25) 100%)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PlaylistAddIcon sx={{ color: '#c4b5fd', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.2px', color: '#fff', lineHeight: 1.2 }}>
                Add to Playlist
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>
                Save this track to your personal library
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => { setPlaylistModalOpen(false); setTargetSongForPlaylist(null); }}
            sx={{
              color: 'rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '50%',
              '&:hover': { background: 'rgba(255,255,255,0.12)', color: '#fff' }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ color: 'rgba(255,255,255,0.85)', px: 1.5, py: 1 }}>
          {/* Target Song Banner */}
          {(targetSongForPlaylist || current) && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.2,
              mb: 2,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
            }}>
              <img
                src={(targetSongForPlaylist || current).cover}
                alt=""
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(targetSongForPlaylist || current).title}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(targetSongForPlaylist || current).artistName}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Segmented Tab Switcher */}
          <Box sx={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            p: 0.5,
            mb: 2
          }}>
            <Button
              fullWidth
              size="small"
              onClick={() => setPlaylistTab(0)}
              sx={{
                py: 0.8,
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: playlistTab === 0 ? 700 : 500,
                fontSize: '0.82rem',
                color: playlistTab === 0 ? '#fff' : 'rgba(255,255,255,0.6)',
                background: playlistTab === 0 ? 'rgba(108, 99, 255, 0.35)' : 'transparent',
                boxShadow: playlistTab === 0 ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                '&:hover': { background: playlistTab === 0 ? 'rgba(108, 99, 255, 0.45)' : 'rgba(255,255,255,0.06)' }
              }}
            >
              Your Playlists {userPlaylists.length > 0 && `(${userPlaylists.length})`}
            </Button>
            <Button
              fullWidth
              size="small"
              onClick={() => setPlaylistTab(1)}
              sx={{
                py: 0.8,
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: playlistTab === 1 ? 700 : 500,
                fontSize: '0.82rem',
                color: playlistTab === 1 ? '#fff' : 'rgba(255,255,255,0.6)',
                background: playlistTab === 1 ? 'rgba(108, 99, 255, 0.35)' : 'transparent',
                boxShadow: playlistTab === 1 ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                '&:hover': { background: playlistTab === 1 ? 'rgba(108, 99, 255, 0.45)' : 'rgba(255,255,255,0.06)' }
              }}
            >
              + Create New
            </Button>
          </Box>

          {/* TAB 0: Existing Playlists */}
          {playlistTab === 0 && (
            <>
              {playlistLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1.5 }}>
                  <CircularProgress size={30} sx={{ color: '#a78bfa' }} />
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Loading your playlists...</Typography>
                </Box>
              ) : userPlaylists.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                  <Typography sx={{ fontSize: '0.9rem', mb: 1.5 }}>No playlists yet</Typography>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => setPlaylistTab(1)}
                    sx={{
                      background: 'linear-gradient(135deg, #6c63ff 0%, #8b5cf6 100%)',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px'
                    }}
                  >
                    Create Your First Playlist
                  </Button>
                </Box>
              ) : (
                <>
                  {userPlaylists.length > 3 && (
                    <TextField
                      placeholder="Filter playlists..."
                      size="small"
                      fullWidth
                      value={playlistSearch}
                      onChange={e => setPlaylistSearch(e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, mr: 0.8 }} />
                      }}
                      sx={{
                        mb: 1.5,
                        '& .MuiOutlinedInput-root': {
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '0.82rem',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                        }
                      }}
                    />
                  )}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    maxHeight: '230px',
                    overflowY: 'auto',
                    pr: 0.5,
                    '&::-webkit-scrollbar': { width: 5 },
                    '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.15)', borderRadius: 4 }
                  }}>
                    {userPlaylists
                      .filter(pl => !playlistSearch.trim() || (pl.playlistName || pl.title || '').toLowerCase().includes(playlistSearch.toLowerCase()))
                      .map((pl) => {
                        const plId = pl._id || pl.id;
                        const plName = pl.playlistName || pl.title || pl.name || 'Untitled Playlist';
                        const isAdding = addingToId === plId;
                        const isSuccess = addedSuccessId === plId;
                        const isPrivate = (pl.privacy || 'private').toLowerCase() === 'private';
                        const songCount = pl.songs?.length || 0;

                        return (
                          <Box
                            key={plId}
                            onClick={() => !isAdding && handleAddToExistingPlaylist(plId, plName)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 1.2,
                              borderRadius: '14px',
                              background: isSuccess
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid',
                              borderColor: isSuccess
                                ? '#10b981'
                                : 'rgba(255, 255, 255, 0.08)',
                              cursor: isAdding ? 'default' : 'pointer',
                              transition: 'all 0.18s ease',
                              '&:hover': {
                                background: isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(108, 99, 255, 0.14)',
                                borderColor: isSuccess ? '#10b981' : 'rgba(167, 139, 250, 0.4)',
                                transform: 'translateY(-1px)',
                              }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0, flex: 1 }}>
                              {/* Playlist Avatar */}
                              <Box sx={{
                                width: 38,
                                height: 38,
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                color: '#c4b5fd',
                                flexShrink: 0
                              }}>
                                {pl.songs?.[0]?.albumCover ? (
                                  <img src={pl.songs[0].albumCover} alt="" style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }} />
                                ) : (
                                  plName.substring(0, 1).toUpperCase()
                                )}
                              </Box>

                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{
                                  fontSize: '0.88rem',
                                  fontWeight: 600,
                                  color: '#fff',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {plName}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>
                                    {songCount} {songCount === 1 ? 'song' : 'songs'}
                                  </Typography>

                                  {/* THE CORE USER REQUEST: Red lock icon for private, green globe for public! */}
                                  {isPrivate ? (
                                    <Box sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.4,
                                      px: 0.7,
                                      py: 0.1,
                                      borderRadius: '5px',
                                      background: 'rgba(239, 68, 68, 0.14)',
                                      border: '1px solid rgba(239, 68, 68, 0.35)',
                                      color: '#f87171',
                                      fontSize: '0.68rem',
                                      fontWeight: 700
                                    }}>
                                      <LockIcon sx={{ fontSize: '0.72rem', color: '#ef4444' }} />
                                      <span>Private</span>
                                    </Box>
                                  ) : (
                                    <Box sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.4,
                                      px: 0.7,
                                      py: 0.1,
                                      borderRadius: '5px',
                                      background: 'rgba(34, 197, 94, 0.14)',
                                      border: '1px solid rgba(34, 197, 94, 0.35)',
                                      color: '#4ade80',
                                      fontSize: '0.68rem',
                                      fontWeight: 700
                                    }}>
                                      <PublicIcon sx={{ fontSize: '0.72rem', color: '#22c55e' }} />
                                      <span>Public</span>
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            </Box>

                            {/* Action Icon */}
                            <Box sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>
                              {isSuccess ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#10b981', fontSize: '0.78rem', fontWeight: 700 }}>
                                  <CheckCircleIcon sx={{ fontSize: '1.25rem', color: '#10b981' }} />
                                  <span>Added</span>
                                </Box>
                              ) : isAdding ? (
                                <CircularProgress size={18} sx={{ color: '#a78bfa' }} />
                              ) : (
                                <Box sx={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.06)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'rgba(255,255,255,0.7)',
                                  transition: 'all 0.15s ease',
                                  '&:hover': { background: '#6c63ff', color: '#fff' }
                                }}>
                                  <PlaylistAddIcon sx={{ fontSize: '1.1rem' }} />
                                </Box>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                  </Box>
                </>
              )}
            </>
          )}

          {/* TAB 1: Create New Playlist */}
          {playlistTab === 1 && (
            <Box component="form" onSubmit={handleCreateAndAddPlaylist} sx={{ display: 'grid', gap: 1.8 }}>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.6, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                  Playlist Name
                </Typography>
                <TextField
                  placeholder="e.g. Late Night Vibes, Workout Drive"
                  size="small"
                  fullWidth
                  autoFocus
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '12px',
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&.Mui-focused fieldset': { borderColor: '#a78bfa' },
                    },
                    '& .MuiInputBase-input': { color: 'white', fontSize: '0.9rem' },
                  }}
                />
              </Box>

              {/* Privacy Selection Cards (Interactive with Red Lock & Green Globe!) */}
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.8, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                  Privacy Setting
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.2 }}>
                  {/* Private Option */}
                  <Box
                    onClick={() => setNewPlaylistPrivacy('private')}
                    sx={{
                      p: 1.2,
                      borderRadius: '12px',
                      border: '1.5px solid',
                      borderColor: newPlaylistPrivacy === 'private' ? '#ef4444' : 'rgba(255,255,255,0.1)',
                      background: newPlaylistPrivacy === 'private' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { borderColor: '#ef4444' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.4 }}>
                      <LockIcon sx={{ color: '#ef4444', fontSize: '1.1rem' }} />
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: newPlaylistPrivacy === 'private' ? '#fca5a5' : '#fff' }}>
                        Private
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }}>
                      Only you can view and play
                    </Typography>
                  </Box>

                  {/* Public Option */}
                  <Box
                    onClick={() => setNewPlaylistPrivacy('public')}
                    sx={{
                      p: 1.2,
                      borderRadius: '12px',
                      border: '1.5px solid',
                      borderColor: newPlaylistPrivacy === 'public' ? '#22c55e' : 'rgba(255,255,255,0.1)',
                      background: newPlaylistPrivacy === 'public' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { borderColor: '#22c55e' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.4 }}>
                      <PublicIcon sx={{ color: '#22c55e', fontSize: '1.1rem' }} />
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: newPlaylistPrivacy === 'public' ? '#86efac' : '#fff' }}>
                        Public
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }}>
                      Shareable with anyone
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Button
                type="submit"
                variant="contained"
                disabled={!newPlaylistName.trim() || playlistLoading}
                sx={{
                  background: 'linear-gradient(135deg, #6c63ff 0%, #8b5cf6 100%)',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  borderRadius: '12px',
                  py: 1.1,
                  boxShadow: '0 4px 18px rgba(108, 99, 255, 0.4)',
                  '&:hover': { background: 'linear-gradient(135deg, #5b52f5 0%, #7c3aed 100%)' }
                }}
              >
                {playlistLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Create & Add Song'}
              </Button>
            </Box>
          )}

          {/* Feedback Toast */}
          {playlistFeedback && (
            <Box sx={{
              mt: 2,
              p: 1,
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: playlistFeedback.includes('Added') || playlistFeedback.includes('created')
                ? 'rgba(16, 185, 129, 0.18)'
                : 'rgba(239, 68, 68, 0.18)',
              border: '1px solid',
              borderColor: playlistFeedback.includes('Added') || playlistFeedback.includes('created')
                ? 'rgba(16, 185, 129, 0.4)'
                : 'rgba(239, 68, 68, 0.4)',
              color: playlistFeedback.includes('Added') || playlistFeedback.includes('created')
                ? '#34d399'
                : '#f87171'
            }}>
              {playlistFeedback}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
