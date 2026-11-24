import { useEffect, useState } from 'react'
import { exerciseImages } from '../lib/exercises'
import { cx } from './ui'

/** Animated demo: flips between the start and end position photos. */
export default function ExerciseDemo({ id, className, playing = true, speed = 900 }: { id: string; className?: string; playing?: boolean; speed?: number }) {
  const imgs = exerciseImages(id)
  const [frame, setFrame] = useState(0)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
    setFrame(0)
  }, [id])
  useEffect(() => {
    if (!playing || imgs.length < 2) return
    const t = setInterval(() => setFrame((f) => (f + 1) % imgs.length), speed)
    return () => clearInterval(t)
  }, [playing, imgs.length, speed])
  if (!imgs.length || failed) {
    return <div className={cx('flex items-center justify-center bg-slate-800 text-4xl', className)}>🏋️</div>
  }
  return (
    <div className={cx('relative overflow-hidden bg-white', className)}>
      {imgs.map((src, i) => (
        <img
          key={src} src={src} alt="" loading="lazy" onError={() => setFailed(true)}
          className={cx('absolute inset-0 h-full w-full object-contain transition-opacity duration-300', i === frame ? 'opacity-100' : 'opacity-0')}
        />
      ))}
    </div>
  )
}
