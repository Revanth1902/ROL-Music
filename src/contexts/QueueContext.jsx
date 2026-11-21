import React, { createContext, useContext, useState } from 'react'

const QueueContext = createContext()

export const QueueProvider = ({ children }) => {
  const [queue, setQueue] = useState([])

  const addToQueue = (song) => setQueue((q) => [...q, song])
  const addNext = (song) => setQueue((q) => [song, ...q])
  const removeFromQueue = (id) => setQueue((q) => q.filter(s => s.id !== id))
  const clearQueue = () => setQueue([])

  const reorderQueue = (sourceIndex, destIndex) => {
    setQueue((q) => {
      const result = Array.from(q)
      const [removed] = result.splice(sourceIndex, 1)
      result.splice(destIndex, 0, removed)
      return result
    })
  }

  return (
    <QueueContext.Provider value={{ queue, setQueue, addToQueue, removeFromQueue, addNext, clearQueue, reorderQueue }}>
      {children}
    </QueueContext.Provider>
  )
}

export const useQueue = () => useContext(QueueContext)
