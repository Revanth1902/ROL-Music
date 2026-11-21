import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, CircularProgress, Typography, Button } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { getSongById } from '../api/apiService'
import { useAudioPlayer } from '../contexts/AudioPlayerContext'

export default function SongRedirect() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { playSong } = useAudioPlayer()

    const [loading, setLoading] = useState(true)
    const [song, setSong] = useState(null)
    const [error, setError] = useState(false)

    useEffect(() => {
        if (!id) {
            navigate('/')
            return
        }

        const fetchSong = async () => {
            try {
                const fetched = await getSongById(id)
                if (fetched && fetched.src) {
                    setSong(fetched)
                } else {
                    setError(true)
                }
            } catch (e) {
                console.error("Failed to load shared song", e)
                setError(true)
            } finally {
                setLoading(false)
            }
        }

        fetchSong()
    }, [id, navigate])

    const handlePlayClick = () => {
        if (song) {
            playSong(song)
        }
        navigate('/', { replace: true })
    }

    if (loading) {
        return (
            <Box sx={{
                display: 'flex', flexDirection: 'column',
                height: '100vh', alignItems: 'center', justifyContent: 'center',
                gap: 2, background: 'linear-gradient(140deg, #080c1a 0%, #0c1220 50%, #0a0f1e 100%)',
                color: '#c4b5fd'
            }}>
                <CircularProgress size={40} sx={{ color: '#6c63ff' }} />
                <Typography variant="h6" fontWeight="600">Loading your tune...</Typography>
            </Box>
        )
    }

    if (error || !song) {
        return (
            <Box sx={{
                display: 'flex', flexDirection: 'column',
                height: '100vh', alignItems: 'center', justifyContent: 'center',
                gap: 2, background: 'linear-gradient(140deg, #080c1a 0%, #0c1220 50%, #0a0f1e 100%)',
                color: '#c4b5fd'
            }}>
                <Typography variant="h6" fontWeight="600" color="error">Song not found or unavailable.</Typography>
                <Button variant="outlined" sx={{ color: '#6c63ff', borderColor: '#6c63ff', mt: 2 }} onClick={() => navigate('/')}>
                    Go to Home
                </Button>
            </Box>
        )
    }

    return (
        <Box sx={{
            display: 'flex', flexDirection: 'column',
            height: '100vh', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(140deg, #080c1a 0%, #0c1220 50%, #0a0f1e 100%)',
            color: '#e2e8f0', p: 3, textAlign: 'center'
        }}>
            <Box sx={{
                width: 240, height: 240, borderRadius: 4, mb: 4,
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)', overflow: 'hidden',
                background: '#0a0e1a'
            }}>
                <img src={song.cover} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>

            <Typography variant="h4" fontWeight="800" sx={{ mb: 1 }}>{song.title}</Typography>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 5 }}>{song.artistName}</Typography>

            <Button
                variant="contained"
                size="large"
                onClick={handlePlayClick}
                startIcon={<PlayArrowIcon />}
                sx={{
                    bgcolor: '#6c63ff', color: 'white', px: 6, py: 1.5,
                    borderRadius: '50px', fontSize: '1.2rem', fontWeight: 700,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#5b54d6', transform: 'scale(1.05)' },
                    transition: 'all 0.2s ease',
                    boxShadow: '0 10px 20px rgba(108, 99, 255, 0.4)'
                }}
            >
                Play Song
            </Button>
        </Box>
    )
}
