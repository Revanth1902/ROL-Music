import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import LockIcon from '@mui/icons-material/Lock'
import PublicIcon from '@mui/icons-material/Public'
import rolLogo from '../../assets/rol-logo1.png'
import '../styles/cards.css'

export default function PlaylistCard({ playlist }) {
    const navigate = useNavigate()
    const [imgErr, setImgErr] = useState(false)
    if (!playlist) return null

    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        (playlist.title || 'P').substring(0, 2)
    )}&background=1a1040&color=a78bfa&size=300&bold=true`

    const isPrivate = (playlist.privacy || '').toLowerCase() === 'private'
    const isPublic = (playlist.privacy || '').toLowerCase() === 'public'

    return (
        <div
            className="album-card"
            id={`playlist-card-${playlist.id}`}
            onClick={() => navigate(`/playlist/${playlist.id}`)}
            title={playlist.title}
        >
            <div className="album-card-img-wrap" style={{ position: 'relative' }}>
                <img
                    src={imgErr ? fallback : (playlist.cover || fallback)}
                    alt={playlist.title}
                    className="album-card-img"
                    onError={() => setImgErr(true)}
                    loading="lazy"
                />
                <img src={rolLogo} className="img-rol-badge" alt="" aria-hidden />

                {/* Privacy Badge: Small Red Lock for Private, Green Globe for Public */}
                {(isPrivate || isPublic) && (
                    <div style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 3,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3.5,
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.2px',
                        background: isPrivate ? 'rgba(18, 7, 10, 0.85)' : 'rgba(5, 18, 12, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid',
                        borderColor: isPrivate ? 'rgba(239, 68, 68, 0.55)' : 'rgba(34, 197, 94, 0.55)',
                        color: isPrivate ? '#fca5a5' : '#86efac',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }}>
                        {isPrivate ? (
                            <>
                                <LockIcon sx={{ fontSize: '0.72rem', color: '#ef4444' }} />
                                <span>Private</span>
                            </>
                        ) : (
                            <>
                                <PublicIcon sx={{ fontSize: '0.72rem', color: '#22c55e' }} />
                                <span>Public</span>
                            </>
                        )}
                    </div>
                )}

                <div className="album-card-overlay">
                    <PlayArrowIcon className="album-card-play" />
                </div>
            </div>
            <div className="album-card-info">
                <div className="album-card-title" title={playlist.title}>{playlist.title}</div>
                {playlist.songCount > 0 && (
                    <div className="album-card-artist">{playlist.songCount} songs</div>
                )}
            </div>
        </div>
    )
}
