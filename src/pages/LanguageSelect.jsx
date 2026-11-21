import React, { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { LANGUAGES } from '../api/apiService'
import '../components/styles/languageSelect.css'

export default function LanguageSelect() {
  const { setLanguages } = useLanguage()
  // Start with Hindi pre-selected for a good first impression
  const [selected, setSelected] = useState(new Set(['hi']))

  const toggle = (code) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(code)) {
        // Don't deselect if it's the only one
        if (next.size > 1) next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  const handleConfirm = () => {
    setLanguages(Array.from(selected))
  }

  return (
    <div className="lang-select-page">
      <div className="lang-orb lang-orb-1" />
      <div className="lang-orb lang-orb-2" />
      <div className="lang-orb lang-orb-3" />

      <div className="lang-select-content">
        {/* Header */}
        <div className="lang-select-header">
          <div className="lang-logo-wrap">
            <img src="/image.png" alt="ROL Music" className="lang-logo-img"
              onError={e => { e.target.style.display = 'none' }} />
          </div>
          <h1 className="lang-select-title">ROL Music</h1>
          <p className="lang-select-sub">Choose your languages to personalise your feed</p>
          <p className="lang-select-hint">🎵 Select one or more — tap to toggle</p>
        </div>

        {/* Language Grid */}
        <div className="lang-grid">
          {LANGUAGES.map((lang) => {
            const isActive = selected.has(lang.code)
            return (
              <button
                key={lang.code}
                className={`lang-card ${isActive ? 'lang-card-active' : ''}`}
                onClick={() => toggle(lang.code)}
                id={`lang-btn-${lang.code}`}
              >
                {isActive && <div className="lang-card-check">✓</div>}
                <span className="lang-native">{lang.native}</span>
                <span className="lang-label">{lang.label}</span>
              </button>
            )
          })}
        </div>

        {/* Selection count badge */}
        <div className="lang-selected-count">
          {selected.size} language{selected.size !== 1 ? 's' : ''} selected
        </div>

        {/* Confirm button */}
        <button
          className="lang-confirm-btn"
          onClick={handleConfirm}
          id="lang-confirm-btn"
        >
          Continue →
        </button>

        <p className="lang-footer-note">You can change this anytime in Settings</p>
      </div>
    </div>
  )
}
