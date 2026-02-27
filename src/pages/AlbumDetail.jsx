import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, Skeleton, Divider, Chip } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { getAlbumById } from '../api/apiService'
import { useAudioPlayer } from '../contexts/AudioPlayerContext'
import { useQueue } from '../contexts/QueueContext'
import SongListItem from '../components/common/SongListItem'
import '../components/styles/detailPage.css'

export default function AlbumDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [album, setAlbum] = useState(null)
    const [loading, setLoading] = useState(true)
    const { playSong } = useAudioPlayer()
    const { addToQueue } = useQueue()

    useEffect(() => {
        if (!id) return
        setLoading(true)
        getAlbumById(id).then(a => {
            setAlbum(a)
            setLoading(false)
        })
    }, [id])

    const playAll = () => {
        if (!album?.songs?.length) return
        const playable = album.songs.filter(s => s.src)
        if (playable.length === 0) return
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
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: '8px', mb: 1, bgcolor: 'rgba(255,255,255,0.06)' }} />
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
            {/* Back */}
            <button className="detail-back-btn" onClick={() => navigate(-1)}>
                <ArrowBackIcon fontSize="small" /> Back
            </button>

            {/* Hero */}
            <div className="detail-hero">
                <img src={album.cover} alt={album.title} className="detail-cover"
                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(album.title.substring(0, 2))}&background=1a1040&color=a78bfa&size=200` }} />
                <div className="detail-meta">
                    <span className="detail-type-badge">Album</span>
                    <h1 className="detail-title">{album.title}</h1>
                    <p className="detail-sub">{album.artist}</p>
                    {album.year && <p className="detail-year">{album.year} · {album.language}</p>}
                    <p className="detail-count">{album.songs.length} songs</p>
                    <button className="detail-play-all-btn" onClick={playAll}>
                        <PlayArrowIcon /> Play All
                    </button>
                </div>
            </div>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 2 }} />

            {/* Song List */}
            <div className="detail-song-list">
                {album.songs.map((song, idx) => (
                    <SongListItem key={song.id} song={song} index={idx + 1} songList={album.songs} />
                ))}
            </div>
        </Box>
    )
}
