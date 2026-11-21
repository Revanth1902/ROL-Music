import React, { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import PlaylistCard from '../components/cards/PlaylistCard'
import { searchPlaylists, getModulesMulti, normalizePlaylist, decodeEntities, LANGUAGE_MAP } from '../api/apiService'
import { useLanguage } from '../contexts/LanguageContext'
import '../components/styles/page.css'

function pickCover(imageArr) {
  if (!imageArr?.length) return ''
  const best = imageArr.find(i => i.quality === '500x500') || imageArr[imageArr.length - 1]
  return best?.url || best?.link || ''
}

export default function Playlists() {
  const { languages, language } = useLanguage()
  const [playlists, setPlaylists] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const debounceRef = React.useRef(null)
  const activeLangs = languages?.length ? languages : [language]

  // Load playlists from modules on mount
  useEffect(() => {
    setLoading(true)
    const apiLangs = activeLangs.map(c => LANGUAGE_MAP[c] || c)
    getModulesMulti(apiLangs).then(results => {
      const all = []
      results.forEach(({ data }) => {
        const found = data?.playlists || data?.charts || []
        found.forEach(p => {
          const norm = {
            id: p.id,
            title: decodeEntities(p.title || p.name || 'Unknown Playlist'),
            cover: pickCover(p.image),
            songCount: Number(p.songCount) || 0,
            language: p.language || '',
          }
          if (norm.id && !all.find(x => x.id === norm.id)) all.push(norm)
        })
      })
      setPlaylists(all)
      setLoading(false)
    })
  }, [language])

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) return
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const result = await searchPlaylists(query.trim())
      setPlaylists(result.results || [])
      setSearching(false)
    }, 500)
  }, [query])

  const isLoading = loading || searching

  return (
    <Box className="page-container">
      <div className="page-header">
        <Typography variant="h4" className="page-title">🎧 Playlists</Typography>
        <Typography className="page-sub">
          {query.trim() ? `Results for "${query}"` : `Trending · ${activeLangs.map(c => LANGUAGE_MAP[c] || c).join(', ')}`}
        </Typography>
      </div>

      <div className="page-search-wrap">
        <div className="songs-search-box">
          <span className="songs-search-icon">🔍</span>
          <input
            className="songs-search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search playlists..."
          />
          {query && <button className="songs-search-clear" onClick={() => setQuery('')}>✕</button>}
        </div>
      </div>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress sx={{ color: '#6c63ff' }} />
        </Box>
      ) : playlists.length === 0 ? (
        <div className="page-empty">
          <div className="empty-icon">🎧</div>
          <p>No playlists found. Try searching!</p>
        </div>
      ) : (
        <Box className="card-grid-auto">
          {playlists.map(p => <PlaylistCard playlist={p} key={p.id} />)}
        </Box>
      )}
    </Box>
  )
}
