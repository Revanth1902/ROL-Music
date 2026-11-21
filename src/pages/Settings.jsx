import React from 'react';
import { Box, Typography, Slider, Switch, FormControlLabel, Button } from '@mui/material';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LANGUAGES, LANGUAGE_MAP } from '../api/apiService';
import '../components/styles/settings.css';

export default function Settings() {
  const { eqValues, setEqBand, setEqPreset, resetEQ, effects, setHall } = useAudioPlayer();
  const { language, languages, toggleLanguage } = useLanguage();

  const EQ_PRESET_NAMES = [
    'Balanced', 'Flat', 'Jazz', 'Bass Boost', 'Treble Boost',
    'Rock', 'Pop', 'Classical', 'Acoustic', 'V-Shape',
    'Dance', 'Hip-Hop', 'Electronic', 'Vocal', 'Party', 'Large Hall'
  ];

  const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000];

  return (
    <Box className="settings-page">
      <Typography variant="h4" className="settings-main-title">⚙️ Settings</Typography>

      {/* Language Section */}
      <Box className="settings-card">
        <Typography variant="h6" className="settings-section-title">🌍 Language</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>
          Selected: <strong style={{ color: '#a78bfa' }}>{languages.map(code => LANGUAGE_MAP[code] || code).join(', ')}</strong>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}> — tap to toggle</span>
        </Typography>
        <div className="settings-lang-grid">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`settings-lang-btn ${languages.includes(lang.code) ? 'active' : ''}`}
              onClick={() => toggleLanguage(lang.code)}
              id={`settings-lang-${lang.code}`}
            >
              <span className="settings-lang-native">{lang.native}</span>
              <span className="settings-lang-label">{lang.label}</span>
            </button>
          ))}
        </div>
      </Box>

      {/* EQ Section */}
      <Box className="settings-container">
        {/* LEFT SIDE: Presets */}
        <Box className="settings-card settings-left">
          <Typography variant="h6" className="settings-section-title">🎛️ Audio Modes</Typography>
          <Box className="preset-buttons">
            {EQ_PRESET_NAMES.map(name => (
              <Button
                key={name}
                variant="outlined"
                size="small"
                onClick={() => setEqPreset(name)}
                sx={{
                  borderColor: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.75)',
                  borderRadius: '20px',
                  textTransform: 'none',
                  fontSize: '0.78rem',
                  '&:hover': {
                    borderColor: '#6c63ff',
                    color: '#a78bfa',
                    background: 'rgba(108,99,255,0.1)',
                  },
                }}
              >
                {name}
              </Button>
            ))}
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={effects.hall}
                onChange={(e) => setHall(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#1db954' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1db954' },
                }}
              />
            }
            label={<Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>Large Hall / Reverb</Typography>}
          />
          <Button
            variant="contained"
            onClick={resetEQ}
            sx={{
              background: 'linear-gradient(135deg, #6c63ff, #4c3fff)',
              borderRadius: '20px',
              textTransform: 'none',
              alignSelf: 'flex-start',
              '&:hover': { background: 'linear-gradient(135deg, #7c72ff, #5c50ff)' },
            }}
          >
            Reset EQ
          </Button>
        </Box>

        {/* RIGHT SIDE: Graphic Equalizer */}
        <Box className="settings-card settings-right">
          <Typography variant="h6" className="settings-section-title">📊 9-Band Equalizer</Typography>
          <Box className="eq-sliders">
            {EQ_FREQUENCIES.map((freq, i) => (
              <Box key={freq} className="eq-slider">
                <Typography variant="caption" sx={{ color: '#6c63ff', fontWeight: 700, fontSize: '0.7rem' }}>
                  {eqValues[i] > 0 ? '+' : ''}{eqValues[i]}
                </Typography>
                <Slider
                  orientation="vertical"
                  min={-12}
                  max={12}
                  value={eqValues[i]}
                  onChange={(e, v) => setEqBand(i, v)}
                  sx={{
                    color: '#6c63ff',
                    '& .MuiSlider-thumb': {
                      width: 14, height: 14,
                      backgroundColor: '#a78bfa',
                    },
                    '& .MuiSlider-track': { backgroundColor: '#6c63ff' },
                    '& .MuiSlider-rail': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  }}
                />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
                  {freq >= 1000 ? `${freq / 1000}k` : freq}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
