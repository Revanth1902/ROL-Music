import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Avatar, List, ListItem, ListItemAvatar, ListItemText, Button, Chip } from '@mui/material';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import HeadphoneIcon from '@mui/icons-material/Headphones';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { getUserTasteData } from '../utils/userTracker';
import { getOfflineSongs, removeOfflineSong } from '../utils/offlineStorage';

export default function ListeningStats() {
  const { user } = useAuth();
  const { playSong } = useAudioPlayer();
  const [taste, setTaste] = useState(null);
  const [offlineSongs, setOfflineSongs] = useState([]);

  useEffect(() => {
    const userId = user?.id || user?._id || 'guest';
    const data = getUserTasteData(userId);
    setTaste(data);

    getOfflineSongs().then(setOfflineSongs).catch(console.error);
  }, [user]);

  const handleDeleteOffline = async (songId) => {
    await removeOfflineSong(songId);
    setOfflineSongs(prev => prev.filter(s => String(s.id) !== String(songId)));
  };

  const totalPlays = taste?.playedTracks?.reduce((acc, t) => acc + (t.count || 1), 0) || 0;
  const estimatedMinutes = Math.round(totalPlays * 3.5);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, color: '#fff', pb: 14 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 1 }}>
          📊 Personal Music Insights
        </Typography>
        <Typography sx={{ color: '#94a3b8' }}>
          Your listening history, top played artists, and offline music library.
        </Typography>
      </Box>

      {/* Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bg: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#fff' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bg: 'rgba(236, 72, 153, 0.2)', color: '#ec4899', width: 56, height: 56 }}>
                <HeadphoneIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{estimatedMinutes} mins</Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Total Listening Time</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bg: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#fff' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bg: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', width: 56, height: 56 }}>
                <LibraryMusicIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{totalPlays} tracks</Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Total Stream Plays</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bg: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#fff' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bg: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', width: 56, height: 56 }}>
                <DownloadForOfflineIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{offlineSongs.length} songs</Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Saved Offline Tracks</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Top Played Songs */}
        <Grid item xs={12} md={6}>
          <Box sx={{ background: 'rgba(15, 23, 42, 0.6)', p: 3, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              🔥 Top Played Tracks
            </Typography>
            {taste?.playedTracks && taste.playedTracks.length > 0 ? (
              <List disablePadding>
                {taste.playedTracks.slice(0, 5).map((track, idx) => (
                  <ListItem key={idx} sx={{ px: 0, py: 1 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bg: 'rgba(236,72,153,0.15)', color: '#ec4899', fontWeight: 700 }}>
                        #{idx + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 600, color: '#fff' }}>{track.title}</Typography>}
                      secondary={<Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>{track.artist}</Typography>}
                    />
                    <Chip label={`${track.count} plays`} size="small" sx={{ bg: 'rgba(255,255,255,0.08)', color: '#a855f7', fontWeight: 600 }} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography sx={{ color: '#64748b', fontStyle: 'italic', py: 2 }}>
                Play more music to generate your top tracks chart!
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Top Artists & Recent Searches */}
        <Grid item xs={12} md={6}>
          <Box sx={{ background: 'rgba(15, 23, 42, 0.6)', p: 3, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              🎤 Top Seed Artists
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(taste?.topArtists || {}).length > 0 ? (
                Object.entries(taste.topArtists).map(([artist, cnt], i) => (
                  <Chip key={i} label={`${artist} (${cnt})`} sx={{ bg: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', color: '#fff', fontWeight: 600 }} />
                ))
              ) : (
                <Typography sx={{ color: '#64748b', fontStyle: 'italic' }}>No artist data yet.</Typography>
              )}
            </Box>
          </Box>

          {/* Offline Storage Manager */}
          <Box sx={{ background: 'rgba(15, 23, 42, 0.6)', p: 3, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              💾 Saved Offline Library
            </Typography>
            {offlineSongs.length > 0 ? (
              <List disablePadding>
                {offlineSongs.map((song) => (
                  <ListItem
                    key={song.id}
                    sx={{ px: 0, py: 1 }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" variant="contained" onClick={() => playSong(song)} startIcon={<PlayArrowIcon />} sx={{ borderRadius: '8px', textTransform: 'none' }}>
                          Play
                        </Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleDeleteOffline(song.id)} sx={{ borderRadius: '8px' }}>
                          <DeleteIcon fontSize="small" />
                        </Button>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 600, color: '#fff' }}>{song.title}</Typography>}
                      secondary={<Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>{song.artistName}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography sx={{ color: '#64748b', fontStyle: 'italic' }}>
                No songs saved offline yet. Tap download on any track to save it for offline playback!
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
