import React, { useState } from 'react'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import { useAudioPlayer } from '../../contexts/AudioPlayerContext'
import { useQueue } from '../../contexts/QueueContext'
import { getSongById, searchSongs } from '../../api/apiService'
import ThreeDotMenu from '../ui/ThreeDotMenu'
import '../../components/styles/songListItem.css'

function fmtDuration(sec) {
    if (!sec) return ''
    const m = Math.floor(sec / 60)
    const s = String(sec % 60).padStart(2, '0')
    return `${m}:${s}`
}

// songList = optional array of all songs in current context (album/artist/playlist)
// so when a song is played, the rest are auto-queued
export default function SongListItem({ song, index, songList = [] }) {
    const { playSong, current, playing } = useAudioPlayer()
    const { setQueue } = useQueue()
    const isActive = current?.id === song.id
    const isPlaying = isActive && playing
    const [loading, setLoading] = useState(false)
    const [imgErr, setImgErr] = useState(false)

    if (!song) return null

    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent((song.title || 'M').substring(0, 2))}&background=1a1040&color=a78bfa&size=60&bold=true`

    const handlePlay = async () => {
        if (isActive) return   // already current — ignore (toggle handled by player)

        setLoading(true)
        let playable = song

        if (!playable.src) {
            try {
                // Layer 1: fetch directly by ID
                const fetched = await getSongById(song.id)
                if (fetched?.src) {
                    playable = { ...song, ...fetched }
                } else {
                    // Layer 2: search by title + artist name
                    const result = await searchSongs(`${song.title} ${song.artistName}`, 0, 5)
                    const match = result.results?.find(s => s.id === song.id)
                        || result.results?.[0]
                    if (match?.src) playable = { ...song, ...match }
                }
            } catch { }
        }
        setLoading(false)

        if (!playable.src) return  // still nothing — give up silently

        playSong(playable)

        // Auto-queue the rest of the list after this song
        if (songList.length > 1) {
            const idx = songList.findIndex(s => s.id === song.id)
            const afterThis = idx >= 0 ? songList.slice(idx + 1) : []
            if (afterThis.length > 0) setQueue(afterThis)
        }
    }

    return (
        <div
            className={`sli ${isActive ? 'sli-active' : ''}`}
            id={`sli-${song.id}`}
            onClick={handlePlay}
        >
            {/* Index / Play icon */}
            <div className="sli-index">
                {loading ? (
                    <div className="sli-spinner" />
                ) : isPlaying ? (
                    <PauseIcon className="sli-play-icon" />
                ) : (
                    <span className="sli-num">{index}</span>
                )}
                {!isPlaying && !loading && <PlayArrowIcon className="sli-play-icon sli-play-hover" />}
            </div>

            {/* Thumbnail */}
            <img
                src={imgErr ? fallback : (song.cover || fallback)}
                alt={song.title}
                className="sli-thumb"
                onError={() => setImgErr(true)}
                loading="lazy"
            />

            {/* Info */}
            <div className="sli-info">
                <div className="sli-title">{song.title}</div>
                <div className="sli-artist">{song.artistName}</div>
            </div>

            {/* Duration */}
            {song.duration > 0 && (
                <span className="sli-dur">{fmtDuration(song.duration)}</span>
            )}

            {/* Menu */}
            <div onClick={e => e.stopPropagation()}>
                <ThreeDotMenu song={song} songList={songList} />
            </div>
        </div>
    )
}
