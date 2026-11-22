// ===================== IMPORTS =====================
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { searchArtists, searchAlbums } from "../../api/apiService";
import { downloadSongWithMetadata, subscribeDownloadProgress } from "../../utils/downloadSong";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Box, Typography, Menu, MenuItem, LinearProgress } from "@mui/material";
import { CircularProgress } from "@mui/material";

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
    analyserNode, pannerVal, setPannerVal
  } = useAudioPlayer();
  const { queue, setQueue, reorderQueue, removeFromQueue, isShuffle, toggleShuffle, isAutoPlay, toggleAutoPlay } = useQueue();

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

  const handleArtistClick = async (artist) => {
    closeFullscreen();
    if (artist.id) {
      navigate(`/artist/${artist.id}`);
      return;
    }
    try {
      const res = await searchArtists(artist.name, 0, 1);
      if (res?.results?.[0]?.id) {
        navigate(`/artist/${res.results[0].id}`);
        return;
      }
    } catch (e) {
      console.warn('[handleArtistClick error]', e);
    }
    navigate(`/songs?q=${encodeURIComponent(artist.name)}`);
  };

  const handleAlbumClick = async () => {
    closeFullscreen();
    if (current.albumId) {
      navigate(`/album/${current.albumId}`);
      return;
    }
    if (current.album) {
      try {
        const res = await searchAlbums(current.album, 0, 1);
        if (res?.results?.[0]?.id) {
          navigate(`/album/${res.results[0].id}`);
          return;
        }
      } catch (e) {
        console.warn('[handleAlbumClick error]', e);
      }
      navigate(`/songs?q=${encodeURIComponent(current.album)}`);
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

  // ===================== NEXT / PREVIOUS =====================
  const playNext = () => {
    if (queue.length > 0) {
      const next = queue[0];
      setQueue(queue.slice(1));
      playSong(next);
    }
  };

  const playPrevious = () => {
    if (progress > 3) {
      seek(0);
    }
  };

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
          />
          <div className="marqueemaincontainer">
            <div className="marquee-container">
              <div className="marquee" ref={titleRef}>
                <Typography className="footer-title">{current.title}</Typography>
              </div>
            </div>
            <div className="marquee-container">
              <div className="marquee artist" ref={artistRef}>
                <Typography className="footer-artist">{current.artistName}</Typography>
              </div>
            </div>
          </div>
          <SongActions song={current} size="small" />
        </Box>

        {/* CENTER */}
        <Box className="footer-center">
          <Box className="footer-controls">
            <Box
              className={`fp-ctrl-btn ${isShuffle ? 'fp-ctrl-active' : ''}`}
              onClick={toggleShuffle}
              title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
            >
              <ShuffleIcon fontSize="small" />
            </Box>

            <Box className="fp-ctrl-btn" onClick={playPrevious} title="Previous">
              <SkipPreviousIcon fontSize="small" />
            </Box>

            <Box className="fp-play-btn" onClick={togglePlay}>
              {audioLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : playing ? <PauseIcon /> : <PlayArrowIcon />}
            </Box>

            <Box className="fp-ctrl-btn" onClick={playNext} title="Next">
              <SkipNextIcon fontSize="small" />
            </Box>

            <Box
              className={`fp-ctrl-btn ${loop ? 'fp-ctrl-active' : ''}`}
              onClick={toggleLoop}
              title="Repeat"
            >
              <RepeatIcon fontSize="small" />
            </Box>

            <Box
              className={`fp-ctrl-btn ${isAutoPlay ? 'fp-ctrl-active' : ''}`}
              onClick={toggleAutoPlay}
              title={isAutoPlay ? 'Autoplay On (Play similar songs when queue ends)' : 'Autoplay Off'}
            >
              <AutoAwesomeIcon fontSize="small" />
            </Box>
          </Box>

          <SeekBar progress={progress} duration={duration} onSeek={seek} />
        </Box>

        {/* RIGHT */}
        <Box className="footer-right">
          <Typography className="queue-count">{queue.length} in queue</Typography>

          <Box
            className={`fp-ctrl-btn ${showDesktopLyrics ? "fp-ctrl-active" : ""}`}
            onClick={() => { setShowDesktopLyrics(!showDesktopLyrics); setShowQueue(false); }}
            title="Lyrics"
          >
            <LyricsIcon fontSize="small" />
          </Box>

          <Box className="fp-ctrl-btn" onClick={() => downloadSong(current)} title="Download">
            <DownloadIcon fontSize="small" />
          </Box>

          <Box
            className={`fp-ctrl-btn ${showQueue ? 'fp-ctrl-active' : ''}`}
            onClick={() => { setShowQueue(prev => !prev); setShowDesktopLyrics(false); }}
            title="Queue"
          >
            <QueueMusicIcon fontSize="small" />
          </Box>

          {/* Volume Control */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
            <Box
              className={`fp-ctrl-btn ${isMuted ? 'fp-ctrl-active' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeOffIcon fontSize="small" /> : volume < 0.5 ? <VolumeDownIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
            </Box>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{
                width: 76,
                height: 4,
                accentColor: '#a78bfa',
                cursor: 'pointer',
              }}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </Box>
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
                        ) : (
                          <span>{current.artistName}</span>
                        )}
                      </div>
                      {current.album && (
                        <div
                          className="fs-song-album fs-clickable-album"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAlbumClick();
                          }}
                        >
                          {current.album}
                        </div>
                      )}
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
                                      onClick={() => { playSong(track); setQueue(queue.slice(i + 1)); }}
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
        <MenuItem onClick={() => { if (selectedSong) { playSong(selectedSong); setQueue(queue.filter(s => s.id !== selectedId)); } closeMenu(); }}>
          <PlayArrowIcon fontSize="small" /> Play Now
        </MenuItem>
        {selectedSong && (
          <MenuItem onClick={() => { downloadSong(selectedSong); closeMenu(); }}>
            <DownloadIcon fontSize="small" /> Download
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
