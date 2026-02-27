import React, { createContext, useContext, useState, useEffect } from 'react'
import { setLanguageCookie, getLanguageCookie } from '../utils/cookies'

const LanguageContext = createContext()

const STORAGE_KEY = 'rol_languages' // stores array of selected language codes

export const LanguageProvider = ({ children }) => {
  const [languages, setLanguages] = useState(() => {
    try {
      // Try multi-lang storage first
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
      // Fallback: legacy single-language cookie
      const cookie = getLanguageCookie()
      if (cookie) return [cookie]
    } catch { }
    return []
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(languages))
    if (languages.length > 0) setLanguageCookie(languages[0])
  }, [languages])

  /** Toggle a single language in/out of the selection */
  const toggleLanguage = (code) => {
    setLanguages(prev => {
      if (prev.includes(code)) {
        // Don't allow deselecting the last one
        return prev.length > 1 ? prev.filter(l => l !== code) : prev
      }
      return [...prev, code]
    })
  }

  /** Replace entire selection (used by LanguageSelect on first boot) */
  const setLanguage = (code) => {
    setLanguages([code])
  }

  /** Primary/first selected language (for backward compat) */
  const language = languages[0] || null

  return (
    <LanguageContext.Provider value={{ language, languages, setLanguage, toggleLanguage, setLanguages }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
