import React, { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import AlbumCard from '../components/cards/AlbumCard'
import { searchAlbums, getModulesMulti, normalizeAlbum, LANGUAGE_MAP } from '../api/apiService'
import { useLanguage } from '../contexts/LanguageContext'
import '../components/styles/page.css'

export default function Albums() {
  const { languages, language } = useLanguage()
  const [albums, setAlbums] = useState([])
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const debounceRef = React.useRef(null)
  const activeLangs = languages?.length ? languages : [language]

  // Load trending albums from modules
  useEffect(() => {
    setLoading(true)
    const apiLangs = activeLangs.map(c => LANGUAGE_MAP[c] || c)
    getModulesMulti(apiLangs).then(results => {
      const all = []
      results.forEach(({ data }) => {
        const found = data?.trending?.albums || data?.albums?.results || data?.albums || []
        found.forEach(a => {
          const norm = normalizeAlbum({ ...a, name: a.name || a.title })
          if (norm && !all.find(x => x.id === norm.id)) all.push(norm)
        })
      })
      setAlbums(all)
      setLoading(false)
    })
  }, [language])

  // Search debounce
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setSearchResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const result = await searchAlbums(query.trim())
      setSearchResults(result.results || [])
      setSearching(false)
    }, 500)
  }, [query])

  const display = query.trim() ? searchResults : albums
  const isLoading = loading || searching

  return (
    <Box className="page-container">
      <div className="page-header">
        <Typography variant="h4" className="page-title">💿 Albums</Typography>
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
            placeholder="Search albums..."
          />
          {query && <button className="songs-search-clear" onClick={() => setQuery('')}>✕</button>}
        </div>
      </div>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress sx={{ color: '#6c63ff' }} />
        </Box>
      ) : display.length === 0 ? (
        <div className="page-empty">
          <div className="empty-icon">💿</div>
          <p>No albums found.</p>
        </div>
      ) : (
        <Box className="card-grid-auto">
          {display.map(a => <AlbumCard album={a} key={a.id} />)}
        </Box>
      )}
    </Box>
  )
}
