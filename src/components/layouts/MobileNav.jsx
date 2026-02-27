import React from 'react'
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import AlbumIcon from '@mui/icons-material/Album'
import PeopleIcon from '@mui/icons-material/People'
import QueueMusicIcon from '@mui/icons-material/QueueMusic'
import BarChartIcon from '@mui/icons-material/BarChart'
import SettingsIcon from '@mui/icons-material/Settings'
import { useNavigate } from 'react-router-dom'

export default function MobileNav(){
  const navigate = useNavigate()
  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation showLabels>
        <BottomNavigationAction label="Songs" icon={<MusicNoteIcon/>} onClick={()=>navigate('/songs')} />
        <BottomNavigationAction label="Albums" icon={<AlbumIcon/>} onClick={()=>navigate('/albums')} />
        <BottomNavigationAction label="Artists" icon={<PeopleIcon/>} onClick={()=>navigate('/artists')} />
        <BottomNavigationAction label="Playlists" icon={<QueueMusicIcon/>} onClick={()=>navigate('/playlists')} />
        <BottomNavigationAction label="Charts" icon={<BarChartIcon/>} onClick={()=>navigate('/charts')} />
      </BottomNavigation>
    </Paper>
  )
}
