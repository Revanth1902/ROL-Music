import React from 'react'
import { Drawer, useMediaQuery } from '@mui/material'
import { Link, useLocation } from 'react-router-dom'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import AlbumIcon from '@mui/icons-material/Album'
import PeopleIcon from '@mui/icons-material/People'
import QueueMusicIcon from '@mui/icons-material/QueueMusic'
import BarChartIcon from '@mui/icons-material/BarChart'
import SettingsIcon from '@mui/icons-material/Settings'
import HomeIcon from '@mui/icons-material/Home';

import '../styles/sidebar.css'

const items = [
 { to: '/home', label: 'Home', icon: <HomeIcon /> },
  { to: '/songs', label: 'Songs', icon: <MusicNoteIcon /> },
  { to: '/albums', label: 'Albums', icon: <AlbumIcon /> },
  { to: '/artists', label: 'Artists', icon: <PeopleIcon /> },
  { to: '/playlists', label: 'Playlists', icon: <QueueMusicIcon /> },
  { to: '/charts', label: 'Charts', icon: <BarChartIcon /> },
  { to: '/settings', label: 'Settings', icon: <SettingsIcon /> }
]

export default function Sidebar({ variant = 'permanent', open = true, onClose }) {
  const isMobile = useMediaQuery('(max-width:768px)')
  const location = useLocation() // to highlight active link

  const sidebarContent = (
    <div className={`sidebar ${isMobile && open ? 'open' : ''}`}>
      {/* Logo */}
      <div className="logo">
        <img src="/image.png" alt="Rol Music" />
        Rol Music
      </div>

      {/* Menu */}
      <ul>
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={isMobile ? onClose : undefined}
              className={location.pathname === item.to ? 'active' : ''}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        ))}
        <div className='thedot'/>
      </ul>
     
    </div>
  )

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240, background: 'transparent', boxShadow: 'none' } }}
      >
        {sidebarContent}
      </Drawer>
    )
  }

  // Desktop
  return sidebarContent
}
