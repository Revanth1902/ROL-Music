// ===================== IMPORTS =====================
import React, { useState, useRef, useEffect } from "react";
import { Box, Typography, Menu, MenuItem, LinearProgress } from "@mui/material";
import { CircularProgress } from "@mui/material";

// MUI Icons
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import RepeatIcon from "@mui/icons-material/Repeat";
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
import { MdDragHandle } from 'react-icons/md';
import rolLogo from '../../assets/rol-logo1.png';
import SeekBar from "../ui/SeekBar"
import WaveProgressBar from "../ui/WaveProgressBar";
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";
import { useQueue } from "../../contexts/QueueContext";
import { shareSong } from "../../utils/share";
import { getSongById, searchSongs } from "../../api/apiService";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import MP3Tag from 'mp3tag.js';

import "../styles/footerPlayer.css";


// ===================== MAIN COMPONENT =====================
export default function FooterPlayer() {

  const { current, playing, audioLoading, playSong, togglePlay, progress, duration, seek, toggleLoop, loop } =
    useAudioPlayer();
  const { queue, setQueue, reorderQueue, removeFromQueue, addNext } = useQueue();

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

  const titleRef = useRef();
  const artistRef = useRef();
  const firstPlayRef = useRef(true);

  // ===================== AUTO-OPEN FULLSCREEN (MOBILE FIRST PLAY) =====================
  useEffect(() => {
    if (current && firstPlayRef.current) {
      firstPlayRef.current = false;
      if (window.innerWidth <= 768) {
        setOpenFull(true);
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
  }, [current, playing, queue]);

  // Fetch Lyrics
  useEffect(() => {
    if (!current) return;
    setLyricsData(null);
    setLyricsError(false);
    setLyricsLoading(true);

    let cleanTitle = current.title || "";
    // Remove " (From ...)" or similar brackets that might ruin lyrics matching
    cleanTitle = cleanTitle.replace(/\s*\(From.*?\)\s*/i, "").trim();

    const q = encodeURIComponent(cleanTitle);
    fetch(`https://lrclib.net/api/search?q=${q}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          // Find the best match
          const searchTitle = cleanTitle.toLowerCase();
          const searchArtist = (current.artistName || "").toLowerCase();
          
          let track = data[0];
          let bestScore = -1;

          for (const item of data) {
            let score = 0;
            const itemTitle = (item.trackName || item.name || "").toLowerCase();
            const itemArtist = (item.artistName || "").toLowerCase();

            // Title match
            if (itemTitle === searchTitle) score += 20;
            else if (itemTitle.includes(searchTitle) || searchTitle.includes(itemTitle)) score += 10;
            else score -= 10; // penalty for wrong title

            // Artist match
            if (searchArtist && (itemArtist.includes(searchArtist) || searchArtist.includes(itemArtist) || itemArtist === searchArtist)) {
              score += 20;
            }

            // Prefer synced lyrics
            if (item.syncedLyrics) {
              score += 5;
            }

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
      })
      .catch((e) => {
        console.error("Lyrics Error:", e);
        setLyricsError(true);
      })
      .finally(() => setLyricsLoading(false));
  }, [current?.title]);

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


  // ── Sanitize filename ──────────────────────────────────
  const sanitize = (s) => (s || '').replace(/[&<>"'\[\]]/g, c => ({ '&': 'and', '<': '', '>': "", "'": "", "\"": '', ' [': ' ', ' ]': ' ' }[c] ?? '')).trim().replace(/  +/g, ' ');

  // ===================== DOWNLOAD WITH METADATA + PROGRESS =====================
  const downloadSong = async (song) => {
    if (!song?.src) return;

    const cleanTitle = sanitize(song.title);
    const cleanArtist = sanitize(song.artistName);
    const filename = `${cleanTitle} - ${cleanArtist}.mp3`;

    setDlState({ name: cleanTitle, progress: 0, done: false });

    try {
      const audioRes = await fetch(song.src);
      const total = Number(audioRes.headers.get("Content-Length")) || 0;
      const reader = audioRes.body.getReader();

      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        if (total > 0) {
          setDlState((d) => ({
            ...d,
            progress: Math.round((received / total) * 80),
          }));
        }
      }

      const audioBuffer = new Uint8Array(received);
      let pos = 0;

      for (const chunk of chunks) {
        audioBuffer.set(chunk, pos);
        pos += chunk.length;
      }

      setDlState((d) => ({ ...d, progress: 85 }));

      // Use mp3tag.js for broader compatibility
      const mp3tag = new MP3Tag(audioBuffer.buffer);
      mp3tag.read();

      // Initialize if v2 tags object is missing
      if (!mp3tag.tags.v2) mp3tag.tags.v2 = {};

      /* -------------------- BASIC METADATA -------------------- */
      mp3tag.tags.v2.TIT2 = cleanTitle; // Title
      mp3tag.tags.v2.TPE1 = cleanArtist; // Artist
      mp3tag.tags.v2.TALB = sanitize(song.album) || "ROL Music"; // Album
      mp3tag.tags.v2.TCON = song.genre || "Music"; // Genre
      mp3tag.tags.v2.TPUB = "ROL Music"; // Publisher
      mp3tag.tags.v2.TCOP = "ROL Music"; // Copyright
      mp3tag.tags.v2.TENC = "ROL Music"; // Encoded by
      mp3tag.tags.v2.TCOM = song.composer || cleanArtist; // Composer

      if (song.year) {
        mp3tag.tags.v2.TYER = String(song.year);
      }
      if (song.language) {
        mp3tag.tags.v2.TLAN = song.language;
      }

      /* -------------------- COVER IMAGE -------------------- */
      if (song.cover) {
        try {
          const coverBuffer = await fetch(song.cover).then((r) =>
            r.arrayBuffer()
          );

          mp3tag.tags.v2.APIC = [
            {
              format: "image/jpeg",
              type: 3,
              description: "Cover",
              data: new Uint8Array(coverBuffer), // pass Uint8Array
            },
          ];
        } catch (e) {
          console.log("Cover image failed:", e);
        }
      }

      setDlState((d) => ({ ...d, progress: 95 }));

      mp3tag.save();

      const taggedBlob = new window.Blob([mp3tag.buffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(taggedBlob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 2000);

      setDlState((d) => ({ ...d, progress: 100, done: true }));
      setTimeout(() => setDlState(null), 3500);

    } catch (err) {
      console.error("[download]", err);

      try {
        const buf = await fetch(song.src).then((r) => r.arrayBuffer());

        const blob = new Blob([buf], { type: "audio/mpeg" });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch { }

      setDlState(null);
    }
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
      <Box className="mobile-mini-player" onClick={() => setOpenFull(true)}>
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
        </Box>

        {/* CENTER */}
        <Box className="footer-center">
          <Box className="footer-controls">
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
              title="Loop"
            >
              <RepeatIcon fontSize="small" />
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
        </Box>
      </Box>


      {/* MOBILE FULLSCREEN PLAYER — PREMIUM */}
      {openFull && (
        <div className="fullscreen-player">
          {/* ── Blurred background ── */}
          <div className="fs-bg">
            <img src={current.cover} className="fs-bg-img" alt="" aria-hidden />
            <div className="fs-bg-overlay" />
          </div>

          {/* ── Content ── */}
          <div className="fs-content">
            {/* Top bar */}
            <div className="fs-topbar">
              <button className="fs-chevron-btn" onClick={() => setOpenFull(false)} aria-label="Close">
                <KeyboardArrowDownIcon sx={{ fontSize: '2rem' }} />
              </button>
              <span className="fs-topbar-label">Now Playing</span>
              <button className="fs-options-btn" aria-label="Options">
                <MoreVertIcon />
              </button>
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
                                  <p key={i} className={`m-lrc-line ${isActive ? "active" : ""}`}>
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
                      <div className="fs-song-artist">{current.artistName}</div>
                      {current.album && <div className="fs-song-album">{current.album}</div>}
                    </div>
                    <button
                      className={`fs-lyrics-btn ${isLyricsFlipped ? 'active' : ''}`}
                      onClick={() => setIsLyricsFlipped(l => !l)}
                      title={isLyricsFlipped ? 'Back to Cover' : 'Show Lyrics'}
                    >
                      <LyricsIcon sx={{ fontSize: '1.5rem' }} />
                    </button>
                  </div>

                  {/* ── Wave Seekbar ── */}
                  <div className="fs-seek-wrap">
                    <WaveProgressBar progress={progress} duration={duration} onSeek={seek} />
                  </div>

                  {/* ── Controls ── */}
                  <div className="fs-controls">
                    <button
                      className={`fs-ctrl-btn ${loop ? 'active' : ''}`}
                      onClick={toggleLoop}
                      title="Repeat"
                    >
                      <RepeatIcon sx={{ fontSize: '1.4rem' }} />
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
                      className="fs-ctrl-btn"
                      onClick={() => downloadSong(current)}
                      title="Download"
                    >
                      <DownloadIcon sx={{ fontSize: '1.4rem' }} />
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
                    <div className="fs-queue-header">Up Next — {queue.length} songs</div>
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
                                        <div className="fs-queue-artist">{track.artistName}</div>
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
                    <p key={i} className={`lrc-line ${isActive ? "active" : ""}`}>
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
          <h4>Up Next — {queue.length} songs</h4>

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
                            <div className="queue-artist">{track.artistName}</div>
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
