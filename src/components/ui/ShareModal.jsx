import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Snackbar, Alert } from '@mui/material';
import { 
  FaTimes, 
  FaLink, 
  FaWhatsapp, 
  FaInstagram, 
  FaSnapchatGhost, 
  FaFacebookF, 
  FaTelegramPlane, 
  FaShareAlt 
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import rolLogo from '../../assets/rol-logo1.png';
import '../styles/share.css';

const CARD_THEMES = [
  {
    id: 'navy',
    label: 'Navy Blue',
    bg: 'linear-gradient(145deg, #1e3a8a 0%, #0f172a 100%)',
    circle: '#1e3a8a'
  },
  {
    id: 'purple',
    label: 'Deep Purple',
    bg: 'linear-gradient(145deg, #581c87 0%, #1e1b4b 100%)',
    circle: '#581c87'
  },
  {
    id: 'charcoal',
    label: 'Dark Charcoal',
    bg: 'linear-gradient(145deg, #262626 0%, #0a0a0a 100%)',
    circle: '#262626'
  },
  {
    id: 'emerald',
    label: 'Emerald Cyan',
    bg: 'linear-gradient(145deg, #065f46 0%, #064e3b 100%)',
    circle: '#065f46'
  },
  {
    id: 'crimson',
    label: 'Crimson Sunset',
    bg: 'linear-gradient(145deg, #881337 0%, #450a0a 100%)',
    circle: '#881337'
  }
];

export default function ShareModal() {
  const [open, setOpen] = useState(false);
  const [song, setSong] = useState(null);
  const [activeTheme, setActiveTheme] = useState(CARD_THEMES[0]);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const handleOpenShare = (e) => {
      if (e.detail) {
        setSong(e.detail);
        setOpen(true);
      }
    };

    window.addEventListener('rol_open_share_modal', handleOpenShare);
    return () => window.removeEventListener('rol_open_share_modal', handleOpenShare);
  }, []);

  if (!open || !song) return null;

  const shareUrl = `${window.location.origin}/song/${song.id}`;
  const shareText = `Listen to "${song.title}" by ${song.artistName || 'Artist'} on ROL Music`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage('Link copied to clipboard!');
    } catch {
      setToastMessage('Failed to copy link');
    }
  };

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(url, '_blank');
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const handleTelegramShare = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: song.title,
          text: shareText,
          url: shareUrl
        });
      } catch {
        /* User cancelled */
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="share-modal-overlay" onClick={() => setOpen(false)}>
      <div className="share-modal-container" onClick={(e) => e.stopPropagation()}>

        {/* ── Top Bar ── */}
        <div className="share-modal-topbar">
          <IconButton 
            className="share-close-btn" 
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <FaTimes />
          </IconButton>
          <span className="share-modal-title">Share</span>
          <div style={{ width: 40 }} />
        </div>

        {/* ── Card Preview Area ── */}
        <div className="share-card-area">
          <div className="share-card-canvas" style={{ background: activeTheme.bg }}>

            {/* Inner Music Card */}
            <div className="share-music-card">
              <img 
                src={song.cover || 'https://ui-avatars.com/api/?name=♪&background=1e293b&color=fff'} 
                alt={song.title} 
                className="share-card-art" 
                onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=♪&background=1e293b&color=fff'; }}
              />

              <div className="share-card-details">
                <h3 className="share-card-song-title">{song.title}</h3>
                <p className="share-card-song-artist">{song.artistName || song.artist || 'Unknown Artist'}</p>
              </div>

              {/* ROL Branding Logo */}
              <div className="share-card-brand">
                <img src={rolLogo} alt="ROL Music" className="share-brand-logo" />
                <span>ROL Music</span>
              </div>
            </div>

            {/* Theme Picker Circles */}
            <div className="share-theme-picker">
              {CARD_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`share-theme-circle ${activeTheme.id === theme.id ? 'active' : ''}`}
                  style={{ background: theme.circle }}
                  onClick={() => setActiveTheme(theme)}
                  title={theme.label}
                />
              ))}
            </div>

          </div>
        </div>


        {/* ── Bottom Share Actions Row ── */}
        <div className="share-actions-drawer">
          <div className="share-actions-scroll">

            {/* Copy Link */}
            <button type="button" className="share-action-item" onClick={handleCopyLink}>
              <div className="share-icon-circle icon-link">
                <FaLink />
              </div>
              <span>Copy link</span>
            </button>

            {/* WhatsApp */}
            <button type="button" className="share-action-item" onClick={handleWhatsAppShare}>
              <div className="share-icon-circle icon-whatsapp">
                <FaWhatsapp />
              </div>
              <span>WhatsApp</span>
            </button>

            {/* Instagram */}
            <button type="button" className="share-action-item" onClick={handleNativeShare}>
              <div className="share-icon-circle icon-instagram">
                <FaInstagram />
              </div>
              <span>Stories</span>
            </button>

            {/* Snapchat */}
            <button type="button" className="share-action-item" onClick={handleNativeShare}>
              <div className="share-icon-circle icon-snapchat">
                <FaSnapchatGhost />
              </div>
              <span>Snapchat</span>
            </button>

            {/* X (Twitter) */}
            <button type="button" className="share-action-item" onClick={handleTwitterShare}>
              <div className="share-icon-circle icon-twitter">
                <FaXTwitter />
              </div>
              <span>X</span>
            </button>

            {/* Facebook */}
            <button type="button" className="share-action-item" onClick={handleFacebookShare}>
              <div className="share-icon-circle icon-facebook">
                <FaFacebookF />
              </div>
              <span>Facebook</span>
            </button>

            {/* Telegram */}
            <button type="button" className="share-action-item" onClick={handleTelegramShare}>
              <div className="share-icon-circle icon-telegram">
                <FaTelegramPlane />
              </div>
              <span>Telegram</span>
            </button>

            {/* More / Web Share */}
            <button type="button" className="share-action-item" onClick={handleNativeShare}>
              <div className="share-icon-circle icon-more">
                <FaShareAlt />
              </div>
              <span>More</span>
            </button>

          </div>
        </div>

      </div>

      {/* Copy Toast Notification */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={3000}
        onClose={() => setToastMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ background: '#10b981', color: '#fff', fontWeight: 600, borderRadius: '12px' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
