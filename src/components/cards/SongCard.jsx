import React, { useState } from 'react'
import { CircularProgress } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import { useAudioPlayer } from '../../contexts/AudioPlayerContext'
import { useQueue } from '../../contexts/QueueContext'
import ThreeDotMenu from '../ui/ThreeDotMenu'
import { getSongById, searchSongs } from '../../api/apiService'
import rolLogo from '../../assets/rol-logo1.png'
import '../styles/cards.css'

// songList = all sibling songs in the current row (for auto-queue)
export default function SongCard({ song, songList = [] }) {
  const { playSong, togglePlay, current, playing, audioLoading } = useAudioPlayer()
  const { setQueue } = useQueue()

  const isCurrent = current?.id === song.id
  const isPlaying = isCurrent && playing
  const isBuffering = isCurrent && audioLoading

  const [imgError, setImgError] = useState(false)

  if (!song) return null

  const fallbackCover = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    (song.title || 'M').substring(0, 2)
  )}&background=1a1040&color=a78bfa&size=180&bold=true`

  const handlePlay = () => {
    // ── Already the current song: just toggle pause / resume ──
    if (isCurrent) {
      togglePlay()
      return
    }

    // ── Play song (Context will auto-resolve URL if missing) ──
    playSong(song)

    // ── Queue all remaining songs in the row ──
    if (songList && songList.length > 0) {
      const idx = songList.findIndex(s => s.id === song.id)
      const after = idx >= 0 ? songList.slice(idx + 1) : []
      if (after.length > 0) setQueue(after)
    }
  }

  return (
    <div
      className={`song-card ${isCurrent ? 'song-card-active' : ''}`}
      id={`song-card-${song.id}`}
    >
      <div className="song-card-img-wrap" onClick={handlePlay}>
        <img
          src={imgError ? fallbackCover : (song.cover || fallbackCover)}
          alt={song.title}
          className="song-card-img"
          onError={() => setImgError(true)}
          loading="lazy"
        />
        <img src={rolLogo} className="img-rol-badge" alt="" aria-hidden />
        <div className="song-card-play-overlay">
          {isBuffering ? (
            <CircularProgress size={28} sx={{ color: 'white' }} />
          ) : isPlaying ? (
            <PauseIcon className="song-card-play-icon" />
          ) : (
            <PlayArrowIcon className="song-card-play-icon" />
          )}
        </div>
        {isCurrent && <div className="song-card-playing-bar" />}
      </div>

      <div className="song-card-info">
        <div className="song-card-meta">
          <div className="song-card-title" title={song.title}>{song.title}</div>
          <div className="song-card-artist" title={song.artistName}>{song.artistName}</div>
        </div>
        <ThreeDotMenu song={song} songList={songList} />
      </div>
    </div>
  )
}
