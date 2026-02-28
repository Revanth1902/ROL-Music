import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import rolLogo from '../../assets/rol-logo1.png'
import '../styles/cards.css'

export default function AlbumCard({ album }) {
  const navigate = useNavigate()
  const [imgErr, setImgErr] = useState(false)
  if (!album) return null

  const rawId = album.id || ''
  const albumId = rawId.startsWith('i-') ? rawId.slice(2) : rawId

  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    (album.title || 'A').substring(0, 2)
  )}&background=1a1040&color=a78bfa&size=300&bold=true`

  return (
    <div
      className="album-card"
      id={`album-card-${albumId}`}
      onClick={() => albumId && navigate(`/album/${albumId}`)}
      title={album.title}
    >
      <div className="album-card-img-wrap">
        <img
          src={imgErr ? fallback : (album.cover || fallback)}
          alt={album.title}
          className="album-card-img"
          onError={() => setImgErr(true)}
          loading="lazy"
        />
        <img src={rolLogo} className="img-rol-badge" alt="" aria-hidden />
        <div className="album-card-overlay">
          <PlayArrowIcon className="album-card-play" />
        </div>
      </div>
      <div className="album-card-info">
        <div className="album-card-title" title={album.title}>{album.title}</div>
        {album.artist && <div className="album-card-artist">{album.artist}</div>}
        {album.year && <div className="album-card-year">{album.year}</div>}
      </div>
    </div>
  )
}
