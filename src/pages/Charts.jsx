import React, { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import PlaylistCard from '../components/cards/PlaylistCard'
import SongListItem from '../components/common/SongListItem'
import { getModulesMulti, normalizeSong, decodeEntities, LANGUAGE_MAP } from '../api/apiService'
import { useLanguage } from '../contexts/LanguageContext'
import '../components/styles/page.css'

function pickCover(imageArr) {
  if (!imageArr?.length) return ''
  const best = imageArr.find(i => i.quality === '500x500') || imageArr[imageArr.length - 1]
  return best?.url || best?.link || ''
}

export default function Charts() {
  const { languages, language } = useLanguage()
  const [charts, setCharts] = useState([])
  const [trendingSongs, setTrendingSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const activeLangs = languages?.length ? languages : [language]

  useEffect(() => {
    setLoading(true)
    const apiLangs = activeLangs.map(c => LANGUAGE_MAP[c] || c)
    getModulesMulti(apiLangs).then(results => {
      const allCharts = []
      const allSongs = []
      results.forEach(({ data }) => {
        // Charts
        ; (data?.charts || []).forEach(p => {
          const norm = {
            id: p.id,
            title: decodeEntities(p.title || p.name || 'Chart'),
            cover: pickCover(p.image),
            songCount: Number(p.songCount) || 0,
            language: p.language || '',
          }
          if (norm.id && !allCharts.find(x => x.id === norm.id)) allCharts.push(norm)
        })
          // Trending songs
          ; (data?.trending?.songs || []).forEach(s => {
            const norm = normalizeSong(s)
            if (norm && !allSongs.find(x => x.id === norm.id)) allSongs.push(norm)
          })
      })
      setCharts(allCharts)
      setTrendingSongs(allSongs)
      setLoading(false)
    })
  }, [language])

  return (
    <Box className="page-container">
      <div className="page-header">
        <Typography variant="h4" className="page-title">📊 Charts</Typography>
        <Typography className="page-sub">
          Top charts · {activeLangs.map(c => LANGUAGE_MAP[c] || c).join(', ')}
        </Typography>
      </div>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress sx={{ color: '#6c63ff' }} />
        </Box>
      ) : (
        <>
          {charts.length > 0 && (
            <section>
              <Typography variant="h6" sx={{
                fontWeight: 700, color: '#e8edf2', mb: 1.5, mt: 1,
                fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 1,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}>
                🏆 Top Charts
              </Typography>
              <Box className="card-grid-auto">
                {charts.map(p => <PlaylistCard playlist={p} key={p.id} />)}
              </Box>
            </section>
          )}

          {trendingSongs.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <Typography variant="h6" sx={{
                fontWeight: 700, color: '#e8edf2', mb: 1.5,
                fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 1,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}>
                🔥 Trending Now
              </Typography>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {trendingSongs.slice(0, 40).map((s, i) => (
                  <SongListItem key={`${s.id}-${i}`} song={s} index={i + 1} />
                ))}
              </div>
            </section>
          )}

          {charts.length === 0 && trendingSongs.length === 0 && (
            <div className="page-empty">
              <div className="empty-icon">📊</div>
              <p>No charts available for this language.</p>
            </div>
          )}
        </>
      )}
    </Box>
  )
}
