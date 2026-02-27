import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/cards.css'

export default function PlaylistCard({ playlist }) {
    const navigate = useNavigate()
    const [imgErr, setImgErr] = useState(false)
    if (!playlist) return null

    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent((playlist.title || 'P').substring(0, 2))}&background=1a1040&color=a78bfa&size=300&bold=true`

    return (
        <div
            className="album-card"
            id={`playlist-card-${playlist.id}`}
            onClick={() => navigate(`/playlist/${playlist.id}`)}
            title={playlist.title}
        >
            <div className="album-card-img-wrap">
                <img
                    src={imgErr ? fallback : (playlist.cover || fallback)}
                    alt={playlist.title}
                    className="album-card-img"
                    onError={() => setImgErr(true)}
                    loading="lazy"
                />
                <div className="album-card-overlay">
                    <span className="album-card-play">▶</span>
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
