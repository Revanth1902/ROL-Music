import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, Skeleton, Divider, CircularProgress } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { getAlbumById, getSongsByIds } from '../api/apiService'
import { useAudioPlayer } from '../contexts/AudioPlayerContext'
import { useQueue } from '../contexts/QueueContext'
import SongListItem from '../components/common/SongListItem'
import '../components/styles/detailPage.css'

export default function AlbumDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [album, setAlbum] = useState(null)
    const [songs, setSongs] = useState([])
    const [loading, setLoading] = useState(true)
    const [resolving, setResolving] = useState(false)
    const { playSong } = useAudioPlayer()
    const { setQueue } = useQueue()

    useEffect(() => {
        if (!id) return
        setLoading(true)
        setSongs([])

        getAlbumById(id).then(async a => {
            if (!a) { setLoading(false); return }
            setAlbum(a)
            setLoading(false)

            const raw = a.songs || []

            // Songs that already have a src URL (rare but possible)
            const hasSrc = raw.filter(s => s.src)
            const needsSrc = raw.filter(s => !s.src)

            if (hasSrc.length === raw.length) {
                // All have src — show immediately
                setSongs(raw)
                return
            }

            // Show metadata immediately so user sees the list
            setSongs(raw)
            setResolving(true)

            // Batch-fetch all song URLs in chunks of 20
            const ids = needsSrc.map(s => s.id).filter(Boolean)
            const resolved = await getSongsByIds(ids)          // new batch API call

            setSongs(prev => prev.map(song => {
                const fetched = resolved.find(r => r.id === song.id)
                return fetched?.src ? { ...song, src: fetched.src } : song
            }))
            setResolving(false)
        })
    }, [id])

    const playAll = useCallback(() => {
        const playable = songs.filter(s => s.src)
        if (!playable.length) return
        playSong(playable[0])
        setQueue(playable.slice(1))
    }, [songs, playSong, setQueue])

    if (loading) return (
        <Box className="detail-page">
            <div className="detail-hero detail-hero-skeleton">
                <Skeleton variant="rectangular" width={200} height={200}
                    sx={{ borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.08)' }} />
                <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    <Skeleton variant="text" width="40%" sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
                    <Skeleton variant="text" width="30%" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                </Box>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={56}
                    sx={{ borderRadius: '8px', mb: 1, bgcolor: 'rgba(255,255,255,0.06)' }} />
            ))}
        </Box>
    )

    if (!album) return (
        <Box className="detail-page detail-empty">
            <Typography>Album not found.</Typography>
        </Box>
    )

    return (
        <Box className="detail-page">
            <button className="detail-back-btn" onClick={() => navigate(-1)}>
                <ArrowBackIcon fontSize="small" /> Back
            </button>

            {/* Hero */}
            <div className="detail-hero">
                <img src={album.cover} alt={album.title} className="detail-cover"
                    onError={e => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            album.title.substring(0, 2))}&background=1a1040&color=a78bfa&size=200`
                    }} />
                <div className="detail-meta">
                    <span className="detail-type-badge">💿 Album</span>
                    <h1 className="detail-title">{album.title}</h1>
                    <p className="detail-sub">{album.artist}</p>
                    {album.year && <p className="detail-year">{album.year} · {album.language}</p>}
                    <p className="detail-count">{songs.length} songs</p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <button className="detail-play-all-btn" onClick={playAll}
                            disabled={resolving && songs.every(s => !s.src)}>
                            <PlayArrowIcon /> Play All
                        </button>
                        {resolving && (
                            <span style={{
                                fontSize: '0.74rem', color: 'rgba(255,255,255,0.35)',
                                display: 'flex', alignItems: 'center', gap: 6
                            }}>
                                <CircularProgress size={12} sx={{ color: '#6c63ff' }} />
                                Loading audio...
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 2 }} />

            {/* Song List */}
            <div className="detail-song-list">
                {songs.map((song, idx) => (
                    <SongListItem key={song.id} song={song} index={idx + 1} songList={songs} />
                ))}
            </div>
        </Box>
    )
}
