import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function RequireAuthModal() {
  const { authModalOpen, authModalMessage, closeAuthModal } = useAuth();
  const navigate = useNavigate();

  const handleAuthRedirect = (mode) => {
    closeAuthModal();
    navigate(`/auth?mode=${mode}`);
  };

  return (
    <Dialog 
      open={authModalOpen} 
      onClose={closeAuthModal} 
      maxWidth="xs" 
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          color: '#ffffff',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        }
      }}
    >
      <DialogTitle sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
        Account Required
      </DialogTitle>
      <DialogContent sx={{ color: 'rgba(255, 255, 255, 0.78)', pt: 0 }}>
        <Typography variant="body2" sx={{ fontSize: '0.92rem', lineHeight: 1.5 }}>
          {authModalMessage || 'Please sign in to save your favorite songs, create playlists, and track history.'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button 
          onClick={closeAuthModal} 
          sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}
        >
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={() => handleAuthRedirect('login')} 
          sx={{ 
            background: '#5b9bd5', 
            borderRadius: '18px', 
            fontWeight: 700, 
            fontSize: '0.85rem',
            px: 2.5,
            '&:hover': { background: '#4a86c4' } 
          }}
        >
          Log In
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => handleAuthRedirect('signup')} 
          sx={{ 
            color: '#fff', 
            borderColor: 'rgba(255,255,255,0.25)', 
            borderRadius: '18px', 
            fontWeight: 600,
            fontSize: '0.85rem',
            px: 2.5,
            '&:hover': { borderColor: '#fff', background: 'rgba(255,255,255,0.08)' } 
          }}
        >
          Sign Up
        </Button>
      </DialogActions>
    </Dialog>
  );
}
