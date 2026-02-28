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
  const { playSong, togglePlay, current, playing } = useAudioPlayer()
  const { setQueue } = useQueue()

  const isCurrent = current?.id === song.id
  const isPlaying = isCurrent && playing

  const [imgError, setImgError] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!song) return null

  const fallbackCover = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    (song.title || 'M').substring(0, 2)
  )}&background=1a1040&color=a78bfa&size=180&bold=true`

  const handlePlay = async () => {
    // ── Already the current song: just toggle pause / resume ──
    if (isCurrent) {
      togglePlay()
      return
    }

    // ── Has src: play immediately & queue siblings ──
    if (song.src) {
      playSong(song)
      queueSiblings(song)
      return
    }

    // ── No src: resolve URL then play ──
    setLoading(true)
    try {
      // Layer 1: fetch by ID from jiosavvan
      let playable = await getSongById(song.id)

      // Layer 2: search by title + artist if ID lookup failed
      if (!playable?.src) {
        const result = await searchSongs(`${song.title} ${song.artistName}`, 0, 5)
        const match = result.results?.find(s => s.id === song.id) || result.results?.[0]
        if (match?.src) playable = match
      }

      if (playable?.src) {
        playSong({ ...song, ...playable })
        queueSiblings(song)
      }
    } catch (e) {
      console.error('[SongCard] failed to resolve src', e)
    } finally {
      setLoading(false)
    }
  }

  // Queue all songs in the row that come after this one
  const queueSiblings = (clickedSong) => {
    if (!songList.length) return
    const idx = songList.findIndex(s => s.id === clickedSong.id)
    const after = idx >= 0 ? songList.slice(idx + 1) : []
    if (after.length > 0) setQueue(after)
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
          {loading ? (
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
