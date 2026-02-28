import React, { useState } from 'react'
import { Menu, MenuItem } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useQueue } from '../../contexts/QueueContext'
import { useAudioPlayer } from '../../contexts/AudioPlayerContext'
import { getSongById, searchSongs } from '../../api/apiService'

// React Icons
import { MdMoreVert } from 'react-icons/md'
import { BsMusicNoteList, BsFillSkipEndFill } from 'react-icons/bs'
import { MdAlbum, MdPerson, MdShare, MdDownload } from 'react-icons/md'
import { TbLoader2 } from 'react-icons/tb'

// ─── Resolve src with 3-layer fallback ───────────────
async function resolveSong(song) {
  if (song?.src) return song
  if (!song?.id) return song
  try {
    // Layer 1: fetch by ID
    const full = await getSongById(song.id)
    if (full?.src) return { ...song, ...full }

    // Layer 2: search by title + artist
    const result = await searchSongs(`${song.title} ${song.artistName}`, 0, 5)
    const match = result.results?.find(s => s.id === song.id) || result.results?.[0]
    if (match?.src) return { ...song, ...match }
  } catch { }
  return song
}

export default function ThreeDotMenu({ song, songList = [] }) {
  const [anchor, setAnchor] = useState(null)
  const [loading, setLoading] = useState(false)
  const { addToQueue, addNext, setQueue } = useQueue()
  const { playSong } = useAudioPlayer()

  const close = () => setAnchor(null)

  const handleAddToQueue = async () => {
    close()
    setLoading(true)
    const resolved = await resolveSong(song)
    addToQueue(resolved)
    setLoading(false)
  }

  const handlePlayNext = async () => {
    close()
    setLoading(true)
    const resolved = await resolveSong(song)
    addNext(resolved)
    setLoading(false)
  }

  const handleDownload = () => {
    close()
    if (!song?.src) return
    const a = document.createElement('a')
    a.href = song.src
    a.download = `${song.title || 'song'} - ${song.artistName || ''}.mp3`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const menuSx = {
    background: 'rgba(14, 18, 34, 0.98)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    color: 'white',
    minWidth: 190,
    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
    '& .MuiMenuItem-root': {
      fontSize: '0.85rem',
      fontWeight: 500,
      padding: '9px 16px',
      gap: '10px',
      display: 'flex',
      alignItems: 'center',
      color: 'rgba(255,255,255,0.82)',
      transition: 'background 0.15s, color 0.15s',
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      '&:hover': { background: 'rgba(108,99,255,0.14)', color: '#fff' },
    },
    '& .tdm-icon': {
      fontSize: '1rem',
      opacity: 0.75,
      flexShrink: 0,
    },
  }

  return (
    <>
      <button
        className="tdm-trigger"
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}
        disabled={loading}
        title="More options"
      >
        {loading
          ? <TbLoader2 className="tdm-spin" />
          : <MdMoreVert />
        }
      </button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        onClick={e => e.stopPropagation()}
        PaperProps={{ sx: menuSx }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleAddToQueue}>
          <BsMusicNoteList className="tdm-icon" />
          Add to Queue
        </MenuItem>

        <MenuItem onClick={handlePlayNext}>
          <BsFillSkipEndFill className="tdm-icon" />
          Play Next
        </MenuItem>

        {song?.albumId && (
          <MenuItem component={RouterLink} to={`/album/${song.albumId}`} onClick={close}>
            <MdAlbum className="tdm-icon" />
            Go to Album
          </MenuItem>
        )}

        {song?.artistId && (
          <MenuItem component={RouterLink} to={`/artist/${song.artistId}`} onClick={close}>
            <MdPerson className="tdm-icon" />
            Go to Artist
          </MenuItem>
        )}

        <MenuItem onClick={() => { navigator.clipboard?.writeText(`${location.origin}/song/${song.id}`); close() }}>
          <MdShare className="tdm-icon" />
          Share
        </MenuItem>

        {song?.src && (
          <MenuItem onClick={handleDownload}>
            <MdDownload className="tdm-icon" />
            Download
          </MenuItem>
        )}
      </Menu>
    </>
  )
}
