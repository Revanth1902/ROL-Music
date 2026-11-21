import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ShuffleIcon from '@mui/icons-material/Shuffle'
import SongListItem from '../components/common/SongListItem'
import { searchSongs, getModulesMulti, normalizeSong, LANGUAGE_MAP } from '../api/apiService'
import { useLanguage } from '../contexts/LanguageContext'
import { useAudioPlayer } from '../contexts/AudioPlayerContext'
import { useQueue } from '../contexts/QueueContext'
import { useSearchParams } from 'react-router-dom'
import '../components/styles/page.css'

const POPULAR_QUERIES = {
  hi: ['Arijit Singh', 'Bollywood Hits', 'Party Songs', 'Romantic Hindi'],
  en: ['Pop Hits', 'Rock Anthems', 'Imagine Dragons', 'Taylor Swift'],
  ta: ['Anirudh', 'Tamil Hits', 'Ilaiyaraaja', 'A.R. Rahman Tamil'],
  te: ['Telugu Hits', 'DSP', 'Sid Sriram', 'Telugu Folk'],
  kn: ['Kannada Hits', 'Arjun Janya'], ml: ['Malayalam Hits'],
  mr: ['Marathi Songs'], pa: ['Punjabi Hits', 'Diljit Dosanjh'],
  gu: ['Gujarati Songs', 'Garba'], bn: ['Bengali Songs'],
  bh: ['Bhojpuri Hits'], ur: ['Urdu Ghazals'],
}

export default function Songs() {
  const { languages, language } = useLanguage()
  const { playSong } = useAudioPlayer()
  const { playList } = useQueue()
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [songs, setSongs] = useState([])
  const [trendingSongs, setTrendingSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const debounceRef = useRef(null)
  const activeLangs = useMemo(() => languages?.length ? languages : [language], [languages, language])
  const popularQueries = POPULAR_QUERIES[activeLangs[0]] || POPULAR_QUERIES.en

  // Load trending songs from modules for all selected languages on mount
  useEffect(() => {
    let isMounted = true
    const apiLangs = activeLangs.map(c => LANGUAGE_MAP[c] || c)
    getModulesMulti(apiLangs).then(results => {
      if (!isMounted) return
      const all = []
      results.forEach(({ data }) => {
        const trending = data?.trending?.songs || data?.charts || []
        trending.forEach(s => {
          const norm = normalizeSong(s)
          if (norm && !all.find(x => x.id === norm.id)) all.push(norm)
        })
      })
      setTrendingSongs(all)
      setLoading(false)
    })
    return () => { isMounted = false }
  }, [activeLangs])

  // Debounce
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setDebouncedQuery(''); return }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(0)
    }, 500)
  }, [query])

  const fetchSongs = useCallback(async (q, pg, reset = false) => {
    if (!q) return
    setLoading(true)
    try {
      const result = await searchSongs(q, pg, 20)
      const newSongs = result.results || []
      setSongs(prev => reset ? newSongs : [...prev, ...newSongs])
      setTotal(result.total || 0)
      setHasMore((pg + 1) * 20 < (result.total || 0))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debouncedQuery) fetchSongs(debouncedQuery, 0, true)
    else setSongs([])
  }, [debouncedQuery, fetchSongs])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchSongs(debouncedQuery, next)
  }

  const displaySongs = debouncedQuery ? songs : trendingSongs

  const handlePlayAll = () => {
    if (!displaySongs.length) return
    playList(displaySongs, null, false, playSong)
  }

  const handlePlayShuffled = () => {
    if (!displaySongs.length) return
    playList(displaySongs, null, true, playSong)
  }

  return (
    <Box className="page-container">
      <div className="page-header">
        <Typography variant="h4" className="page-title">🎵 Songs</Typography>
        <Typography className="page-sub">
          {debouncedQuery
            ? `${total.toLocaleString()} results for "${debouncedQuery}"`
            : `Trending songs · ${activeLangs.map(c => LANGUAGE_MAP[c] || c).join(', ')}`}
        </Typography>
      </div>

      {/* Search bar */}
      <div className="page-search-wrap">
        <div className="songs-search-box">
          <span className="songs-search-icon">🔍</span>
          <input
            className="songs-search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search songs, artists...`}
          />
          {query && (
            <button className="songs-search-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* Quick picks (empty state) */}
      {!debouncedQuery && (
        <div className="chip-row">
          <span className="chip-label">Quick picks:</span>
          {popularQueries.map(q => (
            <button key={q} className="quick-chip" onClick={() => setQuery(q)}>{q}</button>
          ))}
        </div>
      )}

      {/* Action buttons (Play All / Shuffle) */}
      {!loading && displaySongs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="detail-play-all-btn" onClick={handlePlayAll} style={{ marginTop: 0 }}>
            <PlayArrowIcon /> Play All
          </button>
          <button className="detail-shuffle-btn" onClick={handlePlayShuffled} style={{ marginTop: 0 }}>
            <ShuffleIcon /> Shuffle
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress sx={{ color: '#6c63ff' }} />
        </Box>
      )}

      {/* Song List */}
      {!loading && (
        <div className="songs-list-container">
          {displaySongs.length === 0 ? (
            <div className="page-empty">
              <div className="empty-icon">🎵</div>
              <p>No songs found. Try a different search.</p>
            </div>
          ) : (
            displaySongs.map((s, i) => (
              <SongListItem key={`${s.id}-${i}`} song={s} index={i + 1} />
            ))
          )}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && debouncedQuery && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <button className="load-more-btn" onClick={handleLoadMore}>Load More</button>
        </Box>
      )}
    </Box>
  )
}
