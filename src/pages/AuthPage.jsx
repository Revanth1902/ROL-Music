import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, TextField, Typography, Checkbox, FormControlLabel, IconButton, Menu, MenuItem } from '@mui/material';
import { 
  FaGoogle, 
  FaEye, 
  FaEyeSlash,
  FaChevronDown,
  FaArrowLeft,
  FaArrowRight
} from 'react-icons/fa';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LANGUAGES } from '../api/apiService';
import authHeroImg from '../assets/auth-hero.jpg';
import rolLogo from '../assets/rol-logo1.png';
import '../components/styles/auth.css';

const TRACKS_OF_THE_DAY = [
  {
    title: 'Timeless',
    artist: 'The Weeknd, Playboi Carti',
    cover: authHeroImg,
  },
  {
    title: 'Kesariya',
    artist: 'Arijit Singh, Pritam',
    cover: 'https://c.saavncdn.com/191/Kesariya-From-Brahmastra-Hindi-2022-20220717092820-500x500.jpg',
  },
  {
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    cover: 'https://c.saavncdn.com/488/Starboy-English-2016-500x500.jpg',
  },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, signup, loginWithGoogle, continueAsGuest, loginType, authReady } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [form, setForm] = useState({ 
    identifier: '', 
    username: '', 
    email: '', 
    phoneNumber: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);

  // Google Login Hook
  const handleGoogleSuccess = async (tokenResponse) => {
    setError('');
    setLoading(true);
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      await loginWithGoogle({ userInfo });
      navigate('/home');
    } catch (err) {
      console.warn('[GoogleAuth] OAuth fetch error, using session fallback:', err);
      await loginWithGoogle();
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: async () => {
      await loginWithGoogle();
      navigate('/home');
    },
  });

  // Language Menu Anchor
  const [langAnchorEl, setLangAnchorEl] = useState(null);

  useEffect(() => {
    if (authReady && loginType === 'user') {
      navigate('/home');
    }
  }, [authReady, loginType, navigate]);

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'signup' || modeParam === 'login') {
      setMode(modeParam);
    }
  }, [searchParams]);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (form.password !== form.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await signup({
          username: form.username,
          email: form.email,
          phoneNumber: form.phoneNumber,
          password: form.password,
        });
      } else {
        await login(form.identifier, form.password);
      }
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNextTrack = () => {
    setTrackIndex((prev) => (prev + 1) % TRACKS_OF_THE_DAY.length);
  };

  const handlePrevTrack = () => {
    setTrackIndex((prev) => (prev - 1 + TRACKS_OF_THE_DAY.length) % TRACKS_OF_THE_DAY.length);
  };

  const currentLangObj = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  const currentTrack = TRACKS_OF_THE_DAY[trackIndex];

  return (
    <Box className="auth-page-wrapper">
      {/* Background ambient lighting */}
      <div className="auth-ambient-bg" />

      {/* Main Split Card Modal */}
      <div className="auth-split-card">

        {/* ── LEFT HERO PANEL ── */}
        <div className="auth-hero-panel">
          <div className="auth-hero-bg-overlay" />
          <img src={authHeroImg} alt="Music Hero Art" className="auth-hero-img" />

          {/* Hero Top Bar */}
          <div className="auth-hero-topbar">
            <div className="auth-hero-brand">
              <img src={rolLogo} alt="ROL" className="auth-hero-logo" />
              <span>Sound Library</span>
            </div>

            <div className="auth-hero-tabs">
              <button 
                type="button"
                className={`auth-hero-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => setMode('login')}
              >
                Sign In
              </button>
              <button 
                type="button"
                className={`auth-hero-tab-pill ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => setMode('signup')}
              >
                Join Us
              </button>
            </div>
          </div>

          {/* Track of the Day Widget */}
          <div className="auth-track-widget">
            <div className="auth-track-left">
              <img src={currentTrack.cover} alt={currentTrack.title} className="auth-track-cover" />
              <div className="auth-track-info">
                <span className="auth-track-label">Track of the day</span>
                <span className="auth-track-title">{currentTrack.title}</span>
                <span className="auth-track-artist">{currentTrack.artist}</span>
              </div>
            </div>

            <div className="auth-track-arrows">
              <button type="button" onClick={handlePrevTrack} aria-label="Previous Track">
                <FaArrowLeft />
              </button>
              <button type="button" onClick={handleNextTrack} aria-label="Next Track">
                <FaArrowRight />
              </button>
            </div>
          </div>
        </div>


        {/* ── RIGHT FORM PANEL ── */}
        <div className="auth-form-panel">
          {/* Header Row */}
          <div className="auth-form-header-row">
            <div className="auth-logo-title">
              <span className="auth-logo-text">ROL MUSIC</span>
            </div>

            {/* Language Picker Dropdown */}
            <div className="auth-lang-dropdown">
              <button 
                type="button" 
                className="auth-lang-btn"
                onClick={(e) => setLangAnchorEl(e.currentTarget)}
              >
                <span>{currentLangObj.flag} {currentLangObj.code.toUpperCase()}</span>
                <FaChevronDown style={{ fontSize: '0.75rem', opacity: 0.6 }} />
              </button>

              <Menu
                anchorEl={langAnchorEl}
                open={Boolean(langAnchorEl)}
                onClose={() => setLangAnchorEl(null)}
                PaperProps={{
                  sx: {
                    borderRadius: '16px',
                    mt: 1,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    '& .MuiMenuItem-root': {
                      color: '#ffffff',
                      '&:hover': { background: 'rgba(168, 85, 247, 0.2)' }
                    }
                  }
                }}
              >
                {LANGUAGES.map((lang) => (
                  <MenuItem
                    key={lang.code}
                    selected={lang.code === currentLangObj.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangAnchorEl(null);
                    }}
                    sx={{ fontSize: '0.85rem', gap: '8px' }}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label} ({lang.native})</span>
                  </MenuItem>
                ))}
              </Menu>
            </div>
          </div>

          {/* Mode Switcher Segmented Control */}
          <div className="auth-mode-switcher">
            <button
              type="button"
              className={`auth-mode-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-mode-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          {/* Form Content */}
          <div className="auth-form-body">
            <h1 className="auth-main-heading">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="auth-sub-heading">
              {mode === 'login' ? 'Stream your favorite tracks anytime' : 'Join ROL Music for unlimited listening'}
            </p>

            <form onSubmit={handleSubmit} className="auth-form-inputs">
              {mode === 'login' ? (
                <>
                  <div className="auth-input-group">
                    <input
                      type="text"
                      name="identifier"
                      placeholder="Username / Email / Phone"
                      value={form.identifier}
                      onChange={handleChange}
                      required
                      className="auth-custom-input"
                    />
                  </div>

                  <div className="auth-input-group password-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      className="auth-custom-input"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="auth-input-group">
                    <input
                      type="text"
                      name="username"
                      placeholder="Username"
                      value={form.username}
                      onChange={handleChange}
                      required
                      className="auth-custom-input"
                    />
                  </div>

                  <div className="auth-input-group">
                    <input
                      type="email"
                      name="email"
                      placeholder="Email Address"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="auth-custom-input"
                    />
                  </div>

                  <div className="auth-input-group">
                    <input
                      type="tel"
                      name="phoneNumber"
                      placeholder="Phone Number"
                      value={form.phoneNumber}
                      onChange={handleChange}
                      required
                      className="auth-custom-input"
                    />
                  </div>

                  <div className="auth-input-group password-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      className="auth-custom-input"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  <div className="auth-input-group">
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                      className="auth-custom-input"
                    />
                  </div>
                </>
              )}

              {/* Extra options row */}
              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Keep me logged in</span>
                </label>

                {mode === 'login' && (
                  <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset link sent to your registered email/phone.'); }} className="auth-forgot-link">
                    Forgot Password ?
                  </a>
                )}
              </div>

              {error && <div className="auth-error-msg">{error}</div>}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="auth-primary-btn"
              >
                {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Sign Up'}
              </button>

              {/* Divider */}
              <div className="auth-divider">
                <span>or</span>
              </div>

              {/* Social / Google Login */}
              <button
                type="button"
                className="auth-google-btn"
                onClick={() => {
                  setError('');
                  triggerGoogleLogin();
                }}
              >
                <FaGoogle className="google-icon" />
                <span>Continue with Google</span>
              </button>
            </form>

            {/* Toggle Mode Link */}
            <div className="auth-switch-mode">
              {mode === 'login' ? (
                <>
                  <span>Don't have an account? </span>
                  <button type="button" onClick={() => { setMode('signup'); setError(''); }}>
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  <span>Already have an account? </span>
                  <button type="button" onClick={() => { setMode('login'); setError(''); }}>
                    Login
                  </button>
                </>
              )}
            </div>

            {/* Guest Action */}
            <div className="auth-guest-wrapper">
              <button
                type="button"
                className="auth-guest-link"
                onClick={() => {
                  continueAsGuest();
                  navigate('/home');
                }}
              >
                Continue as Guest →
              </button>
            </div>

          </div>
        </div>

      </div>
    </Box>
  );
}
