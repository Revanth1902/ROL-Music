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
    const { playSong, current, playing, togglePlay, audioLoading } = useAudioPlayer()
    const { setQueue } = useQueue()
    const isActive = current?.id === song.id
    const isPlaying = isActive && playing
    const isBuffering = isActive && audioLoading
    const [imgErr, setImgErr] = useState(false)

    if (!song) return null

    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent((song.title || 'M').substring(0, 2))}&background=1a1040&color=a78bfa&size=60&bold=true`

    const handlePlay = () => {
        if (isActive) {
            togglePlay()
            return
        }

        playSong(song)

        // Auto-queue the rest of the list after this song
        if (songList && songList.length > 0) {
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
                {isBuffering ? (
                    <div className="sli-spinner" />
                ) : isPlaying ? (
                    <PauseIcon className="sli-play-icon" />
                ) : (
                    <span className="sli-num">{index}</span>
                )}
                {!isPlaying && !isBuffering && <PlayArrowIcon className="sli-play-icon sli-play-hover" />}
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
