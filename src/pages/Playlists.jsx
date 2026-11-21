import React, { useEffect, useState, useMemo } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import PlaylistCard from '../components/cards/PlaylistCard'
import { searchPlaylists, getModulesMulti, decodeEntities, LANGUAGE_MAP } from '../api/apiService'
import { getPlaylists } from '../api/authApi'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import '../components/styles/page.css'

function pickCover(imageArr) {
  if (!imageArr?.length) return ''
  const best = imageArr.find(i => i.quality === '500x500') || imageArr[imageArr.length - 1]
  return best?.url || best?.link || ''
}

export default function Playlists() {
  const { languages, language } = useLanguage()
  const { loginType, token, openAuthModal } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const debounceRef = React.useRef(null)
  const activeLangs = useMemo(() => languages?.length ? languages : [language], [languages, language])

  // Load playlists from modules on mount
  useEffect(() => {
    let isMounted = true
    if (loginType === 'user') {
      getPlaylists(token).then((data) => {
        if (!isMounted) return
        const mapped = (data || []).map(playlist => ({
          id: playlist._id || playlist.id,
          title: playlist.playlistName || playlist.title || 'Untitled playlist',
          cover: playlist.songs?.[0]?.albumCover || '',
          songCount: playlist.songs?.length || 0,
          language: playlist.privacy || 'private',
          privacy: playlist.privacy,
        }))
        setPlaylists(mapped)
      }).finally(() => { if (isMounted) setLoading(false) })
      return () => { isMounted = false }
    }

    if (loginType === 'guest') {
      openAuthModal('Login required to manage playlists')
    }

    const apiLangs = activeLangs.map(c => LANGUAGE_MAP[c] || c)
    getModulesMulti(apiLangs).then(results => {
      if (!isMounted) return
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
    return () => { isMounted = false }
  }, [activeLangs, loginType, token, openAuthModal])

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
          {loginType === 'user' ? 'Your saved playlists' : query.trim() ? `Results for "${query}"` : `Trending · ${activeLangs.map(c => LANGUAGE_MAP[c] || c).join(', ')}`}
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
