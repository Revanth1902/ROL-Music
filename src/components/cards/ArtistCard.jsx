import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/cards.css'

export default function ArtistCard({ artist }) {
  const navigate = useNavigate()
  const [imgErr, setImgErr] = useState(false)
  if (!artist) return null

  const name = artist.name || artist.title || 'Unknown'
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.substring(0, 2))}&background=1a1040&color=a78bfa&size=300&bold=true&rounded=true`

  return (
    <div
      className="artist-card"
      id={`artist-card-${artist.id}`}
      onClick={() => navigate(`/artist/${artist.id}`)}
      title={name}
    >
      <img
        src={imgErr ? fallback : (artist.avatar || artist.image || fallback)}
        alt={name}
        className="artist-card-img"
        onError={() => setImgErr(true)}
        loading="lazy"
      />
      <div className="artist-card-name">{name}</div>
      {artist.followerCount > 0 && (
        <div className="artist-card-meta">{artist.followerCount.toLocaleString()} fans</div>
      )}
    </div>
  )
}
