/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react'

const QueueContext = createContext()

function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const QueueProvider = ({ children }) => {
  const [queue, setQueue] = useState([])
  const [originalQueue, setOriginalQueue] = useState([])
  const [isShuffle, setIsShuffle] = useState(false)
  const [isAutoPlay, setIsAutoPlay] = useState(() => localStorage.getItem('rol_autoplay') !== 'false')
  const [playedHistory, setPlayedHistory] = useState([])

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlay(prev => {
      const next = !prev
      localStorage.setItem('rol_autoplay', String(next))
      return next
    })
  }, [])

  const addPlayedId = useCallback((id) => {
    if (!id) return
    setPlayedHistory(prev => [String(id), ...prev.filter(item => item !== String(id))].slice(0, 50))
  }, [])

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => {
      const nextShuffle = !prev
      if (nextShuffle) {
        // Turning shuffle ON: save original queue and shuffle active queue
        setOriginalQueue([...queue])
        setQueue(shuffleArray(queue))
      } else {
        // Turning shuffle OFF: restore original queue order (excluding played tracks)
        if (originalQueue.length > 0) {
          const activeIds = new Set(queue.map(s => s.id))
          const restored = originalQueue.filter(s => activeIds.has(s.id))
          setQueue(restored.length > 0 ? restored : queue)
        }
      }
      return nextShuffle
    })
  }, [queue, originalQueue])

  const playList = useCallback((songList, startSong = null, shuffleMode = false, playSongFn = null) => {
    if (!songList || songList.length === 0) return

    let firstTrack = startSong
    let remaining = []

    if (shuffleMode) {
      setIsShuffle(true)
      const listCopy = [...songList]
      if (firstTrack) {
        const remainingTrackList = listCopy.filter(s => s.id !== firstTrack.id)
        remaining = shuffleArray(remainingTrackList)
        setOriginalQueue(remainingTrackList)
      } else {
        const shuffled = shuffleArray(listCopy)
        firstTrack = shuffled[0]
        remaining = shuffled.slice(1)
        const idxInOrig = listCopy.findIndex(s => s.id === firstTrack.id)
        setOriginalQueue(idxInOrig >= 0 ? listCopy.slice(idxInOrig + 1) : listCopy.slice(1))
      }
    } else {
      if (firstTrack) {
        const idx = songList.findIndex(s => s.id === firstTrack.id)
        remaining = idx >= 0 ? songList.slice(idx + 1) : []
      } else {
        firstTrack = songList[0]
        remaining = songList.slice(1)
      }
      setOriginalQueue(remaining)
    }

    setQueue(remaining)

    if (playSongFn && firstTrack) {
      playSongFn(firstTrack)
    }

    return firstTrack
  }, [])

  const addToQueue = (song) => {
    setQueue((q) => [...q, song])
    setOriginalQueue((q) => [...q, song])
  }

  const addNext = (song) => {
    setQueue((q) => [song, ...q])
    setOriginalQueue((q) => [song, ...q])
  }

  const removeFromQueue = (id) => {
    setQueue((q) => q.filter(s => s.id !== id))
    setOriginalQueue((q) => q.filter(s => s.id !== id))
  }

  const clearQueue = () => {
    setQueue([])
    setOriginalQueue([])
  }

  const reorderQueue = (sourceIndex, destIndex) => {
    setQueue((q) => {
      const result = Array.from(q)
      const [removed] = result.splice(sourceIndex, 1)
      result.splice(destIndex, 0, removed)
      return result
    })
  }

  return (
    <QueueContext.Provider value={{
      queue,
      setQueue,
      isShuffle,
      setIsShuffle,
      toggleShuffle,
      isAutoPlay,
      setIsAutoPlay,
      toggleAutoPlay,
      playedHistory,
      addPlayedId,
      playList,
      addToQueue,
      removeFromQueue,
      addNext,
      clearQueue,
      reorderQueue
    }}>
      {children}
    </QueueContext.Provider>
  )
}

export const useQueue = () => useContext(QueueContext)

