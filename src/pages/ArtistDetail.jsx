import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, Skeleton, Divider, CircularProgress } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import VerifiedIcon from '@mui/icons-material/Verified'
import PeopleIcon from '@mui/icons-material/People'
import { getArtistById, getArtistSongs, normalizeSong } from '../api/apiService'
import { useAudioPlayer } from '../contexts/AudioPlayerContext'
import { useQueue } from '../contexts/QueueContext'
import SongListItem from '../components/common/SongListItem'
import '../components/styles/detailPage.css'

function fmtCount(n) {
    if (!n) return ''
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

export default function ArtistDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [artist, setArtist] = useState(null)
    const [songs, setSongs] = useState([])
    const [loading, setLoading] = useState(true)
    const [songsLoading, setSongsLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(0)
    const [allLoaded, setAllLoaded] = useState(false)
    const [totalPages] = useState(10)
    const { playSong } = useAudioPlayer()
    const { addToQueue } = useQueue()

    // 1. Load artist profile
    useEffect(() => {
        if (!id) return
        setLoading(true)
        setSongs([])
        setCurrentPage(0)
        setAllLoaded(false)
        getArtistById(id).then(a => {
            setArtist(a)
            setLoading(false)
            // Show top songs immediately
            if (a?.topSongs?.length) {
                setSongs(a.topSongs)
            }
        })
    }, [id])

    // 2. As soon as artist loads, start fetching all 10 pages in the background
    useEffect(() => {
        if (!id || loading) return
        setSongsLoading(true)
        let cancelled = false

        async function loadPages() {
            const all = []
            for (let page = 1; page <= totalPages; page++) {
                if (cancelled) break
                const pageSongs = await getArtistSongs(id, page)
                if (!pageSongs || pageSongs.length === 0) break
                all.push(...pageSongs)
                // Update songs list as each page loads (streaming UX)
                if (!cancelled) {
                    setSongs(prev => {
                        // Deduplicate by id
                        const seen = new Set(prev.map(s => s.id))
                        const newOnes = pageSongs.filter(s => !seen.has(s.id))
                        return [...prev, ...newOnes]
                    })
                    setCurrentPage(page)
                }
            }
            if (!cancelled) {
                setSongsLoading(false)
                setAllLoaded(true)
            }
        }

        loadPages()
        return () => { cancelled = true }
    }, [id, loading])

    const playAll = () => {
        const playable = songs.filter(s => s.src)
        if (!playable.length) return
        playSong(playable[0])
        playable.slice(1).forEach(s => addToQueue(s))
    }

    if (loading) return (
        <Box className="detail-page">
            <div className="detail-hero detail-hero-artist">
                <Skeleton variant="circular" width={160} height={160}
                    sx={{ bgcolor: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={44}
                        sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2, mb: 1 }} />
                    <Skeleton variant="text" width="35%"
                        sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />
                    <Skeleton variant="text" width="25%"
                        sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, mt: 1 }} />
                </Box>
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={58}
                    sx={{ borderRadius: '10px', mb: 1, bgcolor: 'rgba(255,255,255,0.05)' }} />
            ))}
        </Box>
    )

    if (!artist) return (
        <Box className="detail-page detail-empty">
            <Typography>Artist not found.</Typography>
        </Box>
    )

    return (
        <Box className="detail-page">
            <button className="detail-back-btn" onClick={() => navigate(-1)}>
                <ArrowBackIcon fontSize="small" /> Back
            </button>

            {/* ── Hero ── */}
            <div className="detail-hero detail-hero-artist">
                <img
                    src={artist.avatar}
                    alt={artist.name}
                    className="detail-cover detail-cover-circle"
                    onError={e => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            artist.name.substring(0, 2)
                        )}&background=1a1040&color=a78bfa&size=200&rounded=true`
                    }}
                />
                <div className="detail-meta">
                    <span className="detail-type-badge">🎤 Artist</span>
                    <h1 className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {artist.name}
                        {artist.isVerified && (
                            <VerifiedIcon sx={{ color: '#1db954', fontSize: '1.3rem' }} />
                        )}
                    </h1>

                    {artist.dominantLanguage && (
                        <p className="detail-sub" style={{ textTransform: 'capitalize' }}>
                            {artist.dominantLanguage}
                        </p>
                    )}

                    {artist.followerCount > 0 && (
                        <p className="detail-year" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <PeopleIcon sx={{ fontSize: '0.95rem', color: '#1db954' }} />
                            {fmtCount(artist.followerCount)} followers
                        </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                        <button className="detail-play-all-btn" onClick={playAll} disabled={!songs.length}>
                            <PlayArrowIcon /> Play All
                        </button>
                        {songsLoading && (
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CircularProgress size={12} sx={{ color: '#6c63ff' }} />
                                Loading page {currentPage}/{totalPages}...
                            </span>
                        )}
                        {allLoaded && songs.length > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#1db954' }}>
                                ✓ {songs.length} songs loaded
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 2 }} />

            {/* ── Songs Section ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Typography sx={{
                    fontWeight: 700, color: '#e8edf2', fontSize: '1.05rem',
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}>
                    {allLoaded ? `All Songs (${songs.length})` : `Songs (${songs.length}${songsLoading ? '+' : ''})`}
                </Typography>
                {songsLoading && (
                    <CircularProgress size={16} sx={{ color: '#6c63ff' }} />
                )}
            </div>

            <div className="detail-song-list">
                {songs.map((song, idx) => (
                    <SongListItem key={`${song.id}-${idx}`} song={song} index={idx + 1} songList={songs} />
                ))}
                {songsLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress sx={{ color: '#6c63ff' }} size={28} />
                    </Box>
                )}
            </div>
        </Box>
    )
}
