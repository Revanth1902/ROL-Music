import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  getModulesMulti, getArtistById, searchArtists,
  decodeEntities, LANGUAGE_MAP
} from '../api/apiService'
import { useLanguage } from '../contexts/LanguageContext'
import '../components/styles/page.css'
import '../components/styles/artistPage.css'

// ── Pick best image from array (uses .link for module data) ──
function pickAvatarFromArr(imageArr) {
  if (!imageArr || imageArr === false || !imageArr.length) return ''
  const best = imageArr.find(i => i.quality === '500x500') || imageArr[imageArr.length - 1]
  return best?.link || best?.url || ''
}

// ── Extract all unique primary artists from ALL module sections ──
function extractArtistsFromModules(results) {
  const seen = new Set()
  const artists = []

  results.forEach(({ data }) => {
    if (!data) return

      // From trending songs
      ; (data.trending?.songs || []).forEach(song => {
        ; (song.primaryArtists || []).forEach(a => {
          if (!a.id || seen.has(a.id)) return
          const avatar = pickAvatarFromArr(a.image)
          if (!avatar) return // skip artists without real images
          seen.add(a.id)
          artists.push({
            id: a.id,
            name: decodeEntities(a.name || ''),
            avatar,
            followerCount: null, // fetched lazily
            role: a.role || '',
          })
        })
      })

      // Also from albums section
      ; (data.albums || []).forEach(album => {
        ; (album.primaryArtists || album.artists || []).forEach(a => {
          if (!a.id || seen.has(a.id)) return
          const avatar = pickAvatarFromArr(a.image)
          if (!avatar) return
          seen.add(a.id)
          artists.push({
            id: a.id,
            name: decodeEntities(a.name?.trim() || ''),
            avatar,
            followerCount: null,
            role: a.role || '',
          })
        })
      })
  })

  // Filter only those with a real name
  return artists.filter(a => a.name && a.name.length > 0)
}

// ── Format follower count ──
function fmtCount(n) {
  if (!n || n === 0) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export default function Artists() {
  const { languages, language } = useLanguage()
  const navigate = useNavigate()
  const [artists, setArtists] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [followers, setFollowers] = useState({}) // id → followerCount
  const debounceRef = useRef(null)
  const fetchedFollowers = useRef(new Set())
  const activeLangs = languages?.length ? languages : [language]

  // ── Load artists from home modules data ──
  useEffect(() => {
    setLoading(true)
    const apiLangs = activeLangs.map(c => LANGUAGE_MAP[c] || c)
    getModulesMulti(apiLangs).then(results => {
      const extracted = extractArtistsFromModules(results)
      setArtists(extracted)
      setLoading(false)

      // Lazily fetch follower counts for first 12 artists (background, no-block)
      extracted.slice(0, 12).forEach(a => {
        if (fetchedFollowers.current.has(a.id)) return
        fetchedFollowers.current.add(a.id)
        getArtistById(a.id).then(detail => {
          if (detail?.followerCount) {
            setFollowers(prev => ({ ...prev, [a.id]: detail.followerCount }))
          }
        }).catch(() => { })
      })
    })
  }, [language])

  // ── Debounced search ──
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) return
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const result = await searchArtists(query.trim(), 0, 36)
      setArtists(result.results || [])
      setSearching(false)
    }, 450)
  }, [query])

  const handleClearSearch = useCallback(() => {
    setQuery('')
    // Reload from modules
    setLoading(true)
    const apiLangs = activeLangs.map(c => LANGUAGE_MAP[c] || c)
    getModulesMulti(apiLangs).then(results => {
      setArtists(extractArtistsFromModules(results))
      setLoading(false)
    })
  }, [language])

  const isLoading = loading || searching
  const displayArtists = artists

  return (
    <Box className="page-container">
      <div className="page-header">
        <Typography variant="h4" className="page-title">🎤 Artists</Typography>
        <Typography className="page-sub">
          {query.trim()
            ? `Search results for "${query}"`
            : `Trending artists · ${activeLangs.map(c => LANGUAGE_MAP[c] || c).join(', ')}`}
        </Typography>
      </div>

      {/* Search */}
      <div className="page-search-wrap">
        <div className="songs-search-box">
          <span className="songs-search-icon">🔍</span>
          <input
            className="songs-search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search artists..."
          />
          {query && (
            <button className="songs-search-clear" onClick={handleClearSearch}>✕</button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress sx={{ color: '#6c63ff' }} />
        </Box>
      ) : displayArtists.length === 0 ? (
        <div className="page-empty">
          <div className="empty-icon">🎤</div>
          <p>No artists found.</p>
        </div>
      ) : (
        <div className="artists-masonry-grid">
          {displayArtists.map(a => {
            const fc = followers[a.id] ?? a.followerCount
            return (
              <div
                key={a.id}
                className="artist-profile-card"
                onClick={() => navigate(`/artist/${a.id}`)}
                title={a.name}
              >
                {/* Avatar with glow ring */}
                <div className="apc-avatar-wrap">
                  <img
                    src={a.avatar}
                    alt={a.name}
                    className="apc-avatar-img"
                    loading="lazy"
                    onError={e => {
                      e.target.onerror = null
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        (a.name || '?').substring(0, 2)
                      )}&background=1a1040&color=a78bfa&size=200&bold=true&rounded=true`
                    }}
                  />
                  <div className="apc-avatar-overlay">
                    <span className="apc-avatar-play">▶</span>
                  </div>
                </div>

                {/* Info */}
                <div className="apc-info">
                  <div className="apc-name">{a.name}</div>
                  {fc !== null && (
                    <div className="apc-followers">
                      <span className="apc-followers-dot" />
                      {fmtCount(fc)} followers
                    </div>
                  )}
                  <div className="apc-badge">Artist</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Box>
  )
}
