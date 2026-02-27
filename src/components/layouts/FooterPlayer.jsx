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
import SeekBar from "../ui/SeekBar"
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";
import { useQueue } from "../../contexts/QueueContext";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import * as ID3Writer from 'browser-id3-writer';

import "../styles/footerPlayer.css";


// ===================== MAIN COMPONENT =====================
export default function FooterPlayer() {

  const { current, playing, playSong, togglePlay, progress, duration, seek, toggleLoop, loop } =
    useAudioPlayer();
  const { queue, setQueue, reorderQueue, removeFromQueue, addNext } = useQueue();

  const [openFull, setOpenFull] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showQueue, setShowQueue] = useState(false);
  const [dlState, setDlState] = useState(null); // { name, progress 0-100, done }
  const [liked, setLiked] = useState(false);

  const titleRef = useRef();
  const artistRef = useRef();

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

  // Reset liked when song changes
  useEffect(() => { setLiked(false); }, [current?.id]);

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
        el.style.animation = `marquee-scroll ${dur}s linear infinite`;
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
      const total = Number(audioRes.headers.get('Content-Length')) || 0;
      const reader = audioRes.body.getReader();
      const chunks = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) setDlState(d => ({ ...d, progress: Math.round((received / total) * 85) }));
      }
      const audioBuffer = new Uint8Array(received);
      let pos = 0;
      for (const chunk of chunks) { audioBuffer.set(chunk, pos); pos += chunk.length; }

      setDlState(d => ({ ...d, progress: 90 }));

      const writer = new ID3Writer.default(audioBuffer);
      writer
        .setFrame('TIT2', cleanTitle)
        .setFrame('TPE1', [cleanArtist])
        .setFrame('TALB', sanitize(song.album) || 'ROL Music');
      if (song.year) writer.setFrame('TYER', String(song.year));
      if (song.language) writer.setFrame('TLAN', song.language);

      if (song.cover) {
        try {
          const coverBuf = await fetch(song.cover).then(r => r.arrayBuffer());
          writer.setFrame('APIC', { type: 3, data: coverBuf, description: 'Cover' });
        } catch { }
      }

      writer.addTag();
      setDlState(d => ({ ...d, progress: 98 }));

      const blob = writer.getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      setDlState(d => ({ ...d, progress: 100, done: true }));
      setTimeout(() => setDlState(null), 3500);
    } catch (err) {
      console.error('[download]', err);
      try {
        const buf = await fetch(song.src).then(r => r.arrayBuffer());
        const blob = new Blob([buf], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
              {playing ? <PauseIcon /> : <PlayArrowIcon />}
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
              {playing ? <PauseIcon /> : <PlayArrowIcon />}
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

          <Box className="fp-ctrl-btn" onClick={() => downloadSong(current)} title="Download">
            <DownloadIcon fontSize="small" />
          </Box>

          <Box
            className={`fp-ctrl-btn ${showQueue ? 'fp-ctrl-active' : ''}`}
            onClick={() => setShowQueue(prev => !prev)}
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
                onClick={() => setShowQueue(false)}
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

            {!showQueue ? (
              <>
                {/* ── Album Art ── */}
                <div className="fs-art-wrap">
                  <img
                    src={current.cover}
                    className="fs-art"
                    alt={current.title}
                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=♪&background=1a1040&color=a78bfa&size=320` }}
                  />
                </div>

                {/* ── Song Info ── */}
                <div className="fs-info">
                  <div className="fs-info-text">
                    <div className="fs-song-title">{current.title}</div>
                    <div className="fs-song-artist">{current.artistName}</div>
                    {current.album && <div className="fs-song-album">{current.album}</div>}
                  </div>
                  <button
                    className={`fs-heart-btn ${liked ? 'liked' : ''}`}
                    onClick={() => setLiked(l => !l)}
                    title={liked ? 'Liked' : 'Like'}
                  >
                    {liked
                      ? <FavoriteIcon sx={{ fontSize: '1.5rem' }} />
                      : <FavoriteBorderIcon sx={{ fontSize: '1.5rem' }} />
                    }
                  </button>
                </div>

                {/* ── Seekbar ── */}
                <div className="fs-seek-wrap">
                  <SeekBar progress={progress} duration={duration} onSeek={seek} />
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
                    {playing
                      ? <PauseIcon sx={{ fontSize: '2rem' }} />
                      : <PlayArrowIcon sx={{ fontSize: '2rem' }} />
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
                  <button className="fs-action-btn" onClick={() => downloadSong(current)}>
                    <DownloadIcon className="fa-icon" />
                    <span>Download</span>
                  </button>
                  <button className="fs-action-btn" onClick={() => navigator.clipboard?.writeText(`${location.origin}/song/${current.id}`)}>
                    <ShareIcon className="fa-icon" />
                    <span>Share</span>
                  </button>
                </div>
              </>
            ) : (
              /* ── Queue Tab ── */
              <div className="fs-queue-strip">
                <div className="fs-queue-header">Up Next — {queue.length} songs</div>
                {queue.length === 0 ? (
                  <div className="fs-queue-empty">
                    <QueueMusicIcon sx={{ fontSize: '2.5rem', opacity: 0.2, mb: 1 }} />
                    <p>Queue is empty.</p>
                    <p>Add songs using the ⋮ menu on any song.</p>
                  </div>
                ) : (
                  queue.map((track, i) => (
                    <div
                      key={`${track.id}-${i}`}
                      className="fs-queue-item"
                      onClick={() => { playSong(track); setQueue(queue.slice(i + 1)); }}
                    >
                      <img
                        src={track.cover}
                        className="fs-queue-thumb"
                        alt={track.title}
                        onError={e => e.target.style.display = 'none'}
                      />
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
                  ))
                )}
              </div>
            )}
          </div>
        </div>
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
