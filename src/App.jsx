import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layouts/Sidebar'
import FooterPlayer from './components/layouts/FooterPlayer'
import LanguageSelect from './pages/LanguageSelect'
import Home from './pages/Home'
import Songs from './pages/Songs'
import Albums from './pages/Album'
import Artists from './pages/Artist'
import Playlists from './pages/Playlists'
import Charts from './pages/Charts'
import Settings from './pages/Settings'
import AlbumDetail from './pages/AlbumDetail'
import ArtistDetail from './pages/ArtistDetail'
import PlaylistDetail from './pages/PlaylistDetail'
import { useLanguage } from './contexts/LanguageContext'
import { Box, IconButton, AppBar, Toolbar, useMediaQuery } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import SearchBar from './components/common/SearchBar'
import './index.css'

export default function App() {
  const { language } = useLanguage()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width:768px)')

  if (!language) return <LanguageSelect />

  const toggleMobileSidebar = () => setMobileSidebarOpen(prev => !prev)

  return (
    <Box className="app-container">
      {/* Sidebar */}
      <Sidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content */}
      <Box className="main-content">
        {/* Mobile Top Bar */}
        {isMobile ? (
          <AppBar position="sticky" elevation={0} sx={{
            background: 'rgba(10,14,26,0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Toolbar sx={{ gap: 1, minHeight: '56px !important' }}>
              <IconButton
                edge="start"
                onClick={toggleMobileSidebar}
                sx={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <MenuIcon />
              </IconButton>
              <SearchBar />
            </Toolbar>
          </AppBar>
        ) : (
          <div className="desktop-topbar">
            <SearchBar />
          </div>
        )}

        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/songs" element={<Songs />} />
          <Route path="/albums" element={<Albums />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/settings" element={<Settings />} />

          {/* Detail pages */}
          <Route path="/album/:id" element={<AlbumDetail />} />
          <Route path="/artist/:id" element={<ArtistDetail />} />
          <Route path="/playlist/:id" element={<PlaylistDetail />} />

          <Route path="*" element={
            <Box sx={{ padding: 6, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <div style={{ fontSize: '4rem' }}>404</div>
              <div>Page not found</div>
            </Box>
          } />
        </Routes>
      </Box>

      {/* Persistent Footer Player */}
      <FooterPlayer />
    </Box>
  )
}
