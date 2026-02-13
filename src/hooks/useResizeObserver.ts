import { useEffect, useState, useRef } from 'react'

export function useResizeObserver<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current) return

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect
        setSize({ width, height })
      }
    })

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [])

  return { ref, ...size }
}
