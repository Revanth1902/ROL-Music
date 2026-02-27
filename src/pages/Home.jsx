import React, { useEffect, useState, useCallback } from 'react'
import { Box, Skeleton } from '@mui/material'
import SongCard from '../components/cards/SongCard'
import AlbumCard from '../components/cards/AlbumCard'
import PlaylistCard from '../components/cards/PlaylistCard'
import {
  getModulesMulti, normalizeSong, normalizeAlbum, normalizePlaylist,
  decodeEntities, LANGUAGE_MAP, LANGUAGES
} from '../api/apiService'
import { useLanguage } from '../contexts/LanguageContext'

// React Icons for section headings & UI
import { MdHeadphones, MdTrendingUp, MdAlbum, MdBarChart, MdQueueMusic, MdLanguage, MdFavorite } from 'react-icons/md'
import { BsFire } from 'react-icons/bs'
import { HiMusicNote } from 'react-icons/hi'

import '../components/styles/home.css'

// ── Helper ──
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}

// ── Horizontal section ──
function HSection({ title, icon, id, children }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null
  return (
    <section className="home-section" id={id}>
      <div className="section-title">
        {icon && <span className="section-icon">{icon}</span>}
        {title}
      </div>
      <Box className="home-scroll">
        {children}
      </Box>
    </section>
  )
}

// ── Skeleton row ──
function SkeletonRow({ count = 8 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className="album-card" style={{ minWidth: 180, flexShrink: 0, background: 'rgba(255,255,255,0.04)', borderRadius: 14 }}>
      <div style={{ width: '100%', paddingTop: '100%', position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
        <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(255,255,255,0.07)', borderRadius: '12px' }} />
      </div>
      <div style={{ padding: '10px 10px 12px' }}>
        <Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.07)', borderRadius: 4, mb: 0.5 }} />
        <Skeleton variant="text" width="60%" sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
      </div>
    </div>
  ))
}

// ── One language block ──
function LangBlock({ langCode, data }) {
  const apiLang = LANGUAGE_MAP[langCode] || langCode
  const langLabel = capitalize(apiLang)

  if (!data) return null

  function pickCover(imageArr) {
    if (!imageArr || !imageArr.length) return ''
    const best = imageArr.find(i => i.quality === '500x500') || imageArr[imageArr.length - 1]
    return best?.link || best?.url || ''
  }

  const trendingSongs = (data.trending?.songs || []).map(s => normalizeSong(s)).filter(Boolean)
  const trendingAlbums = (data.trending?.albums || []).map(a => ({
    id: a.id,
    title: decodeEntities(a.name || a.title || 'Unknown'),
    cover: pickCover(a.image),
    artist: Array.isArray(a.artists) ? a.artists.map(x => x.name).join(', ') : '',
    year: a.releaseDate?.substring(0, 4) || a.year || '',
  }))
  const albums = (data.albums || []).map(a => ({
    id: a.id,
    title: decodeEntities(a.name || a.title || 'Unknown'),
    cover: pickCover(a.image),
    artist: Array.isArray(a.artists) ? a.artists.map(x => x.name).join(', ') : '',
    year: a.releaseDate?.substring(0, 4) || a.year || '',
  }))
  const playlists = (data.playlists || []).map(p => ({
    id: p.id,
    title: decodeEntities(p.title || p.name || 'Unknown'),
    cover: pickCover(p.image),
    songCount: Number(p.songCount) || 0,
    language: p.language || apiLang,
  }))
  const charts = (data.charts || []).map(p => ({
    id: p.id,
    title: decodeEntities(p.title || p.name || 'Chart'),
    cover: pickCover(p.image),
    songCount: Number(p.songCount) || 0,
    language: p.language || apiLang,
  }))

  return (
    <div className="lang-block" id={`lang-block-${langCode}`}>
      {/* Language heading pill */}
      <div className="lang-block-header">
        <div className="lang-block-pill">
          <MdLanguage className="pill-icon" />
          {langLabel}
        </div>
      </div>

      {trendingSongs.length > 0 && (
        <HSection
          title={`Trending ${langLabel} Songs`}
          icon={<BsFire className="icon-fire" />}
          id={`trending-songs-${langCode}`}
        >
          {trendingSongs.slice(0, 20).map(s => <SongCard song={s} key={s.id} />)}
        </HSection>
      )}

      {trendingAlbums.length > 0 && (
        <HSection
          title={`Trending ${langLabel} Albums`}
          icon={<MdTrendingUp className="icon-trend" />}
          id={`trending-albums-${langCode}`}
        >
          {trendingAlbums.slice(0, 15).map(a => <AlbumCard album={a} key={a.id} />)}
        </HSection>
      )}

      {albums.length > 0 && (
        <HSection
          title={`New ${langLabel} Albums`}
          icon={<MdAlbum className="icon-album" />}
          id={`new-albums-${langCode}`}
        >
          {albums.slice(0, 15).map(a => <AlbumCard album={a} key={a.id} />)}
        </HSection>
      )}

      {charts.length > 0 && (
        <HSection
          title={`${langLabel} Charts`}
          icon={<MdBarChart className="icon-chart" />}
          id={`charts-${langCode}`}
        >
          {charts.slice(0, 12).map(p => <PlaylistCard playlist={p} key={p.id} />)}
        </HSection>
      )}

      {playlists.length > 0 && (
        <HSection
          title={`${langLabel} Playlists`}
          icon={<MdQueueMusic className="icon-playlist" />}
          id={`playlists-${langCode}`}
        >
          {playlists.slice(0, 15).map(p => <PlaylistCard playlist={p} key={p.id} />)}
        </HSection>
      )}
    </div>
  )
}


// ───────────────────────────────────────────────
// MAIN HOME COMPONENT
// ───────────────────────────────────────────────
export default function Home() {
  const { languages, toggleLanguage } = useLanguage()
  const [modulesByLang, setModulesByLang] = useState({})
  const [loading, setLoading] = useState(true)

  const apiLanguages = languages.map(code => LANGUAGE_MAP[code] || code)

  const fetchData = useCallback(async () => {
    if (!apiLanguages.length) return
    setLoading(true)
    const results = await getModulesMulti(apiLanguages)
    const map = {}
    results.forEach(({ language, data }) => {
      const code = languages.find(c => (LANGUAGE_MAP[c] || c) === language) || language
      map[code] = data
    })
    setModulesByLang(map)
    setLoading(false)
  }, [JSON.stringify(apiLanguages)])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <Box className="home-container">
      {/* ── Hero Banner ── */}
      <div className="home-hero">
        <div className="home-hero-wave" />
        <div className="home-hero-orb home-hero-orb-1" />
        <div className="home-hero-orb home-hero-orb-2" />

        <div className="home-hero-text">
          {/* Eyebrow */}
          <span className="home-hero-eyebrow">
            <MdHeadphones className="eyebrow-icon" />
            Your Music Feed
          </span>

          {/* Big title — currently selected languages */}
          <h2 className="home-hero-title">
            {languages.map(code => {
              const lang = LANGUAGES.find(l => l.code === code)
              return lang ? lang.label : capitalize(LANGUAGE_MAP[code] || code)
            }).join(' · ') || 'Music'}
          </h2>

          {/* Subtitle */}
          <p className="home-hero-sub">
            Trending songs, albums &amp; playlists in your selected language{languages.length > 1 ? 's' : ''}
          </p>

          {/* ── Language Selector Chips ── */}
          <div className="home-lang-chips">
            {LANGUAGES.map(lang => {
              const isActive = languages.includes(lang.code)
              return (
                <button
                  key={lang.code}
                  className={`home-lang-chip ${isActive ? 'home-lang-chip-active' : ''}`}
                  onClick={() => toggleLanguage(lang.code)}
                  title={lang.native}
                >
                  <span className="chip-flag">{lang.flag}</span>
                  <span className="chip-label">{lang.label}</span>
                  {isActive && <span className="chip-check">✓</span>}
                </button>
              )
            })}
          </div>

          {/* ── Credit line ── */}
          <div className="home-credit">
            Made with <MdFavorite className="credit-heart" /> by <strong>Revanth</strong>
          </div>
        </div>
      </div>

      {/* ── Language blocks ── */}
      {loading ? (
        languages.map(code => (
          <div key={code} className="lang-block">
            <div className="lang-block-header">
              <div className="lang-block-pill lang-block-pill-skeleton" />
            </div>
            {['Songs', 'Albums', 'Playlists'].map(label => (
              <section key={label} className="home-section">
                <Skeleton variant="text" width={200} sx={{ bgcolor: 'rgba(255,255,255,0.08)', mb: 1, height: 28, borderRadius: 2 }} />
                <Box className="home-scroll">
                  <SkeletonRow count={7} />
                </Box>
              </section>
            ))}
          </div>
        ))
      ) : (
        languages.map((code) => (
          <LangBlock
            key={code}
            langCode={code}
            data={modulesByLang[code]}
          />
        ))
      )}
    </Box>
  )
}
