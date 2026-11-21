import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { getRecentlyPlayed } from '../api/authApi';
import SongListItem from '../components/common/SongListItem';
import '../components/styles/page.css';

export default function RecentlyPlayed() {
  const { token, loginType, openAuthModal } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loginType !== 'user') {
      openAuthModal('Login required to view your recent listens');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const data = await getRecentlyPlayed(token);
        const normalized = (data || []).map(item => {
          const s = item?.song || item;
          if (!s) return null;
          return {
            ...s,
            id: s.id || s.sourceId || s._id,
            sourceId: s.sourceId || s.id || s._id,
            title: s.title || s.name || 'Untitled',
            artistName: s.artistName || s.artist || 'Unknown Artist',
            artist: s.artist || s.artistName || 'Unknown Artist',
            cover: s.cover || s.albumCover || '',
            albumCover: s.albumCover || s.cover || '',
            src: s.src || s.audioUrl || '',
            audioUrl: s.audioUrl || s.src || '',
            duration: Number(s.duration) || 0,
            album: s.album || '',
          };
        }).filter(Boolean);
        setSongs(normalized);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [loginType, token, openAuthModal]);

  if (loading) {
    return <Box className="page-container"><CircularProgress sx={{ color: '#6c63ff' }} /></Box>;
  }

  return (
    <Box className="page-container">
      <div className="page-header">
        <Typography variant="h4" className="page-title">🕘 Recently Played</Typography>
        <Typography className="page-sub">Your latest 20 songs</Typography>
      </div>

      {songs.length === 0 ? (
        <div className="page-empty">
          <div className="empty-icon">🎧</div>
          <p>No recent songs yet.</p>
        </div>
      ) : (
        <div className="songs-list-container">
          {songs.map((song, index) => (
            <SongListItem key={song._id || song.id || `${song.title}-${index}`} song={song} index={index + 1} />
          ))}
        </div>
      )}
    </Box>
  );
}
