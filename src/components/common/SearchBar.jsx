import React, { useState, useRef, useEffect, useCallback } from 'react'
import { TextField, InputAdornment, IconButton, Box, Typography } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useNavigate } from 'react-router-dom'
import { globalSearch, normalizeSong } from '../../api/apiService'
import { useAudioPlayer } from '../../contexts/AudioPlayerContext'
import '../styles/searchbar.css'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const wrapRef = useRef(null)
  const { playSong } = useAudioPlayer()
  const navigate = useNavigate()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults(null); setOpen(false); return }
    setLoading(true)
    const data = await globalSearch(q)
    setResults(data)
    setOpen(true)
    setLoading(false)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setResults(null); setOpen(false); return }
    debounceRef.current = setTimeout(() => doSearch(val), 450)
  }

  const handleClear = () => {
    setQuery('')
    setResults(null)
    setOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/songs?q=${encodeURIComponent(query.trim())}`)
      setOpen(false)
    }
  }

  const songs = (results?.songs?.results || []).slice(0, 5)
  const albums = (results?.albums?.results || []).slice(0, 3)
  const artists = (results?.artists?.results || []).slice(0, 3)

  const getImg = (arr) => {
    if (!Array.isArray(arr)) return ''
    const img = arr.find(i => i.quality === '150x150') || arr[0]
    return img?.url || ''
  }

  return (
    <div className="search-wrapper" ref={wrapRef}>
      <TextField
        variant="outlined"
        size="small"
        fullWidth
        placeholder="Search songs, artists, albums..."
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results && setOpen(true)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: query ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleClear} sx={{ p: 0.5 }}>
                <ClearIcon sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 16 }} />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '12px',
            color: 'white',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
            '&.Mui-focused fieldset': { borderColor: '#6c63ff' },
            transition: 'all 0.2s ease',
          },
          '& .MuiInputBase-input': {
            color: 'white',
            '&::placeholder': { color: 'rgba(255,255,255,0.38)', opacity: 1 },
          },
        }}
      />

      {/* Dropdown Results */}
      {open && (
        <div className="search-dropdown">
          {loading && (
            <div className="search-loading">Searching...</div>
          )}

          {!loading && songs.length === 0 && albums.length === 0 && artists.length === 0 && (
            <div className="search-empty">No results found</div>
          )}

          {!loading && songs.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">Songs</div>
              {songs.map(s => {
                const song = normalizeSong(s)
                if (!song || !song.src) return null
                return (
                  <div
                    key={song.id}
                    className="search-item"
                    onClick={() => { playSong(song); setOpen(false) }}
                  >
                    <img src={song.cover || ''} alt={song.title} className="search-item-img" onError={e => e.target.style.display = 'none'} />
                    <div className="search-item-info">
                      <div className="search-item-title">{song.title}</div>
                      <div className="search-item-sub">{song.artistName}</div>
                    </div>
                    <PlayArrowIcon sx={{ color: '#6c63ff', fontSize: 20, flexShrink: 0 }} />
                  </div>
                )
              })}
            </div>
          )}

          {!loading && albums.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">Albums</div>
              {albums.map(a => (
                <div
                  key={a.id}
                  className="search-item"
                  onClick={() => { navigate(`/album/${a.id}`); setOpen(false) }}
                >
                  <img src={getImg(a.image)} alt={a.title} className="search-item-img" onError={e => e.target.style.display = 'none'} />
                  <div className="search-item-info">
                    <div className="search-item-title">{a.title}</div>
                    <div className="search-item-sub">{a.artist || 'Album'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && artists.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">Artists</div>
              {artists.map(a => (
                <div
                  key={a.id}
                  className="search-item"
                  onClick={() => { navigate(`/artist/${a.id}`); setOpen(false) }}
                >
                  <img src={getImg(a.image)} alt={a.title} className="search-item-img search-item-img-round" onError={e => e.target.style.display = 'none'} />
                  <div className="search-item-info">
                    <div className="search-item-title">{a.title}</div>
                    <div className="search-item-sub">Artist</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && query && (
            <div
              className="search-see-all"
              onClick={() => { navigate(`/songs?q=${encodeURIComponent(query)}`); setOpen(false) }}
            >
              See all results for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
