import React, { useState } from 'react'
import { IconButton, CircularProgress } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import { useAudioPlayer } from '../../contexts/AudioPlayerContext'
import { useQueue } from '../../contexts/QueueContext'
import ThreeDotMenu from '../ui/ThreeDotMenu'
import { getSongById, searchSongs } from '../../api/apiService'
import '../styles/cards.css'

export default function SongCard({ song }) {
  const { playSong, current, playing } = useAudioPlayer()
  const isPlaying = current?.id === song.id && playing
  const [imgError, setImgError] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!song) return null

  const fallbackCover = `https://ui-avatars.com/api/?name=${encodeURIComponent((song.title || 'M').substring(0, 2))}&background=1a1040&color=a78bfa&size=180&bold=true`

  const handlePlay = async () => {
    if (isPlaying) {
      // already playing — just toggle pause
      playSong(song)
      return
    }

    if (song.src) {
      // Has playable URL — play immediately
      playSong(song)
      return
    }

    // No src (from modules listing) — fetch by ID then play
    setLoading(true)
    try {
      let playableSong = await getSongById(song.id)
      if (!playableSong?.src) {
        // Fallback: search by title
        const result = await searchSongs(`${song.title} ${song.artistName}`, 0, 5)
        playableSong = result.results.find(s => s.id === song.id) || result.results[0] || null
      }
      if (playableSong?.src) {
        playSong({ ...song, ...playableSong })
      }
    } catch (e) {
      console.error('Failed to get song src', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`song-card ${isPlaying ? 'song-card-active' : ''}`} id={`song-card-${song.id}`}>
      <div className="song-card-img-wrap" onClick={handlePlay}>
        <img
          src={imgError ? fallbackCover : (song.cover || fallbackCover)}
          alt={song.title}
          className="song-card-img"
          onError={() => setImgError(true)}
          loading="lazy"
        />
        <div className="song-card-play-overlay">
          {loading ? (
            <CircularProgress size={28} sx={{ color: 'white' }} />
          ) : isPlaying ? (
            <PauseIcon className="song-card-play-icon" />
          ) : (
            <PlayArrowIcon className="song-card-play-icon" />
          )}
        </div>
        {isPlaying && <div className="song-card-playing-bar" />}
      </div>

      <div className="song-card-info">
        <div className="song-card-meta">
          <div className="song-card-title" title={song.title}>{song.title}</div>
          <div className="song-card-artist" title={song.artistName}>{song.artistName}</div>
        </div>
        <ThreeDotMenu song={song} />
      </div>
    </div>
  )
}
