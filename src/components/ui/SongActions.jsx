import React, { useMemo, useState } from 'react';
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem, Typography, Box } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { useAuth } from '../../contexts/AuthContext';
import { addSongToPlaylist, createPlaylist, getPlaylists } from '../../api/authApi';

export default function SongActions({ song, size = 'small' }) {
  const { loginType, token, toggleLike, isSongLiked, openAuthModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [playlistName, setPlaylistName] = useState('');
  const [privacy, setPrivacy] = useState('private');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const liked = useMemo(() => isSongLiked(song), [isSongLiked, song]);

  const handleLike = async () => {
    if (loginType !== 'user') {
      openAuthModal();
      return;
    }

    await toggleLike(song);
  };

  const openPlaylistDialog = async () => {
    if (loginType !== 'user') {
      openAuthModal();
      return;
    }

    setOpen(true);
    setFeedback('');
    setLoading(true);
    try {
      const data = await getPlaylists(token);
      setPlaylists(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToExisting = async (playlistId) => {
    if (!song) return;
    setLoading(true);
    try {
      await addSongToPlaylist(playlistId, song.id || song._id || song.sourceId, token, song);
      setFeedback('Added to playlist');
      setOpen(false);
    } catch (error) {
      setFeedback(error.message || 'Could not add song');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (event) => {
    event.preventDefault();
    if (!playlistName.trim()) return;
    setLoading(true);
    try {
      const created = await createPlaylist({ playlistName: playlistName.trim(), privacy }, token);
      await addSongToPlaylist(created.data?._id || created.data?.id, song.id || song._id || song.sourceId, token, song);
      setFeedback('Playlist created and song added');
      setPlaylistName('');
      setOpen(false);
    } catch (error) {
      setFeedback(error.message || 'Could not create playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton size={size} onClick={(event) => { event.stopPropagation(); handleLike(); }} sx={{ color: liked ? '#ff4d6d' : 'rgba(255,255,255,0.76)' }}>
          {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </IconButton>
        <IconButton size={size} onClick={(event) => { event.stopPropagation(); openPlaylistDialog(); }} sx={{ color: 'rgba(255,255,255,0.76)' }}>
          <PlaylistAddIcon />
        </IconButton>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth sx={{ zIndex: 99999 }}>
        <DialogTitle sx={{ color: '#fff', background: 'rgba(10,14,26,0.98)' }}>Add to playlist</DialogTitle>
        <DialogContent sx={{ background: 'rgba(10,14,26,0.98)', color: 'rgba(255,255,255,0.82)' }}>
          {loading && <Typography variant="body2">Loading playlists…</Typography>}
          {!loading && playlists.length > 0 && (
            <Box sx={{ display: 'grid', gap: 1, mb: 2 }}>
              {playlists.map((playlist) => (
                <Button key={playlist._id || playlist.id} fullWidth variant="outlined" onClick={() => handleAddToExisting(playlist._id || playlist.id)} sx={{ justifyContent: 'flex-start', color: '#fff', borderColor: 'rgba(255,255,255,0.16)' }}>
                  {playlist.playlistName || playlist.title}
                </Button>
              ))}
            </Box>
          )}
          <form onSubmit={handleCreatePlaylist} style={{ display: 'grid', gap: 12 }}>
            <TextField label="Playlist name" value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} fullWidth size="small" InputLabelProps={{ style: { color: 'rgba(255,255,255,0.68)' } }} InputProps={{ style: { color: '#fff' } }} />
            <TextField select label="Privacy" value={privacy} onChange={(event) => setPrivacy(event.target.value)} fullWidth size="small" InputLabelProps={{ style: { color: 'rgba(255,255,255,0.68)' } }} InputProps={{ style: { color: '#fff' } }}>
              <MenuItem value="private">Private</MenuItem>
              <MenuItem value="public">Public</MenuItem>
            </TextField>
            <Button type="submit" variant="contained" sx={{ background: '#6c63ff', '&:hover': { background: '#574fe7' } }}>Create and add</Button>
          </form>
          {feedback && <Typography variant="body2" sx={{ mt: 1 }}>{feedback}</Typography>}
        </DialogContent>
        <DialogActions sx={{ background: 'rgba(10,14,26,0.98)', px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,0.72)' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
