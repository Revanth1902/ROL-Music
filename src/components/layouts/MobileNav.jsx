import HomeIcon from '@mui/icons-material/Home'
import EqualizerIcon from '@mui/icons-material/Equalizer'
import { useNavigate, useLocation } from 'react-router-dom'

export default function MobileNav(){
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, background: '#0a0e17' }} elevation={3}>
      <BottomNavigation
        showLabels
        value={location.pathname}
        sx={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          '& .MuiBottomNavigationAction-root': { color: '#94a3b8', minWidth: 'auto', p: '6px 0' },
          '& .Mui-selected': { color: '#ec4899' }
        }}
      >
        <BottomNavigationAction value="/home" label="Home" icon={<HomeIcon/>} onClick={()=>navigate('/home')} />
        <BottomNavigationAction value="/songs" label="Search" icon={<MusicNoteIcon/>} onClick={()=>navigate('/songs')} />
        <BottomNavigationAction value="/charts" label="Charts" icon={<BarChartIcon/>} onClick={()=>navigate('/charts')} />
        <BottomNavigationAction value="/stats" label="Insights" icon={<EqualizerIcon/>} onClick={()=>navigate('/stats')} />
        <BottomNavigationAction value="/settings" label="Settings" icon={<SettingsIcon/>} onClick={()=>navigate('/settings')} />
      </BottomNavigation>
    </Paper>
  )
}
