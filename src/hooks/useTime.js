import { useEffect, useState } from 'react'

export default function useTime() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(()=> setNow(Date.now()), 1000)
    return ()=> clearInterval(id)
  }, [])
  return now
}
