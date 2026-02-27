import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, Skeleton, Divider, CircularProgress } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { getAllPlaylistSongs, getPlaylistById } from '../api/apiService'
import { useAudioPlayer } from '../contexts/AudioPlayerContext'
import { useQueue } from '../contexts/QueueContext'
import SongListItem from '../components/common/SongListItem'
import '../components/styles/detailPage.css'

export default function PlaylistDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [playlist, setPlaylist] = useState(null)
    const [loading, setLoading] = useState(true)
    const { playSong } = useAudioPlayer()
    const { addToQueue } = useQueue()

    useEffect(() => {
        if (!id) return
        setLoading(true)
        // Fetch all pages automatically
        getAllPlaylistSongs(id, 20).then(pl => {
            setPlaylist(pl)
            setLoading(false)
        })
    }, [id])

    const playAll = () => {
        if (!playlist?.songs?.length) return
        const playable = playlist.songs.filter(s => s.src)
        if (!playable.length) return
        playSong(playable[0])
        playable.slice(1).forEach(s => addToQueue(s))
    }

    if (loading) return (
        <Box className="detail-page">
            <div className="detail-hero detail-hero-skeleton">
                <Skeleton variant="rectangular" width={200} height={200} sx={{ borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.08)' }} />
                <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    <Skeleton variant="text" width="40%" sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
                    <Skeleton variant="text" width="30%" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                </Box>
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: '8px', mb: 1, bgcolor: 'rgba(255,255,255,0.06)' }} />
            ))}
        </Box>
    )

    if (!playlist) return (
        <Box className="detail-page detail-empty">
            <Typography>Playlist not found.</Typography>
        </Box>
    )

    return (
        <Box className="detail-page">
            <button className="detail-back-btn" onClick={() => navigate(-1)}>
                <ArrowBackIcon fontSize="small" /> Back
            </button>

            {/* Hero */}
            <div className="detail-hero">
                <img
                    src={playlist.cover}
                    alt={playlist.title}
                    className="detail-cover"
                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(playlist.title.substring(0, 2))}&background=1a1040&color=a78bfa&size=200` }}
                />
                <div className="detail-meta">
                    <span className="detail-type-badge">Playlist</span>
                    <h1 className="detail-title">{playlist.title}</h1>
                    {playlist.description && (
                        <p className="detail-sub" style={{ maxWidth: 400, fontSize: '0.82rem', opacity: 0.7, whiteSpace: 'pre-line' }}>
                            {playlist.description}
                        </p>
                    )}
                    <p className="detail-count">{playlist.songs.length} songs</p>
                    <button className="detail-play-all-btn" onClick={playAll}>
                        <PlayArrowIcon /> Play All
                    </button>
                </div>
            </div>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 2 }} />

            <div className="detail-song-list">
                {playlist.songs.map((song, idx) => (
                    <SongListItem key={`${song.id}-${idx}`} song={song} index={idx + 1} />
                ))}
            </div>
        </Box>
    )
}
