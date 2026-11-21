import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layouts/Sidebar'
import FooterPlayer from './components/layouts/FooterPlayer'
import LanguageSelect from './pages/LanguageSelect'
import AuthPage from './pages/AuthPage'
import Home from './pages/Home'
import Songs from './pages/Songs'
import Albums from './pages/Album'
import Artists from './pages/Artist'
import Playlists from './pages/Playlists'
import Charts from './pages/Charts'
import Settings from './pages/Settings'
import Favourites from './pages/Favourites'
import RecentlyPlayed from './pages/RecentlyPlayed'
import ListeningStats from './pages/ListeningStats'
import AlbumDetail from './pages/AlbumDetail'
import ArtistDetail from './pages/ArtistDetail'
import PlaylistDetail from './pages/PlaylistDetail'
import SongRedirect from './pages/SongRedirect'
import RequireAuthModal from './components/ui/RequireAuthModal'
import ShareModal from './components/ui/ShareModal'
import { useLanguage } from './contexts/LanguageContext'
import { useAuth } from './contexts/AuthContext'
import { Box, IconButton, AppBar, Toolbar, useMediaQuery, CircularProgress } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import SearchBar from './components/common/SearchBar'
import './index.css'

export default function App() {
  const { language } = useLanguage()
  const { loginType, authReady } = useAuth()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width:768px)')

  useEffect(() => {
    // Disable right click
    const handleContextMenu = (e) => e.preventDefault()
    // Disable inspecting tools
    const handleKeyDown = (e) => {
      // F12
      if (e.keyCode === 123) e.preventDefault()
      // Ctrl+Shift+I or J or C
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) e.preventDefault()
      // Ctrl+U
      if (e.ctrlKey && e.keyCode === 85) e.preventDefault()
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  if (!authReady) return <Box className="app-container" sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><CircularProgress sx={{ color: '#6c63ff' }} /></Box>
  if (!loginType) return <AuthPage />
  if (!language) return <LanguageSelect />

  const toggleMobileSidebar = () => setMobileSidebarOpen(prev => !prev)

  return (
    <Box className="app-container">
      <RequireAuthModal />
      <ShareModal />
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
          <Route path="/" element={loginType ? <Navigate to="/home" replace /> : <Navigate to="/auth" replace />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/home" element={<Home />} />
          <Route path="/songs" element={<Songs />} />
          <Route path="/albums" element={<Albums />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/stats" element={<ListeningStats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/favourites" element={<Favourites />} />
          <Route path="/recently-played" element={<RecentlyPlayed />} />

          {/* Detail pages */}
          <Route path="/album/:id" element={<AlbumDetail />} />
          <Route path="/artist/:id" element={<ArtistDetail />} />
          <Route path="/playlist/:id" element={<PlaylistDetail />} />
          <Route path="/song/:id" element={<SongRedirect />} />

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
