import type { PoseMetrics } from '../types'

let landmarkerPromise: Promise<any> | null = null

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(new URL('mediapipe', document.baseURI).href.replace(/\/$/, ''))
      const make = (delegate: 'GPU' | 'CPU') =>
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate,
          },
          runningMode: 'IMAGE',
          numPoses: 1,
          outputSegmentationMasks: true,
        })
      try { return await make('GPU') } catch { return await make('CPU') }
    })()
    landmarkerPromise.catch(() => { landmarkerPromise = null })
  }
  return landmarkerPromise
}

/** Resize to max 1280 px tall JPEG to keep storage small. */
export async function normalizeImage(file: Blob, maxH = 1280): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxH / bmp.height)
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.85))
}

async function blobToImage(b: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(b)
  const img = new Image()
  img.src = url
  await img.decode()
  URL.revokeObjectURL(url)
  return img
}

/**
 * Front-pose body metrics from the person segmentation mask, normalised by torso length
 * (shoulder-midpoint → hip-midpoint) so distance from the camera doesn't matter.
 */
export async function analyzePose(b: Blob): Promise<PoseMetrics | null> {
  const lm = await getLandmarker()
  const img = await blobToImage(b)
  const res = lm.detect(img)
  const pts = res.landmarks?.[0]
  const mask = res.segmentationMasks?.[0]
  if (!pts || !mask) { mask?.close?.(); return null }
  const W = mask.width, H = mask.height
  const data: Float32Array = mask.getAsFloat32Array()
  const [ls, rs, lh, rh] = [pts[11], pts[12], pts[23], pts[24]]
  const sx = ((ls.x + rs.x) / 2) * W, sy = ((ls.y + rs.y) / 2) * H
  const hx = ((lh.x + rh.x) / 2) * W, hy = ((lh.y + rh.y) / 2) * H
  const torso = Math.hypot(hx - sx, hy - sy)
  if (torso < 20) { mask.close(); return null }

  // Width of the contiguous body run through the body's centre line at row y
  const widthAt = (y: number) => {
    const row = Math.round(Math.min(H - 1, Math.max(0, y)))
    const t = (y - sy) / (hy - sy || 1)
    const cx = Math.round(sx + (hx - sx) * Math.min(1, Math.max(0, t)))
    if (data[row * W + cx] < 0.5) return 0
    let l = cx, r = cx
    while (l > 0 && data[row * W + l - 1] >= 0.5) l--
    while (r < W - 1 && data[row * W + r + 1] >= 0.5) r++
    return r - l
  }
  const band = (from: number, to: number, mode: 'min' | 'max') => {
    let best = mode === 'min' ? Infinity : 0
    for (let f = from; f <= to; f += 0.02) {
      const w = widthAt(sy + (hy - sy) * f)
      if (w > 0) best = mode === 'min' ? Math.min(best, w) : Math.max(best, w)
    }
    return Number.isFinite(best) ? best : 0
  }
  const shoulder = band(0.05, 0.2, 'max')
  const waist = band(0.55, 0.9, 'min')
  const hip = band(0.95, 1.1, 'max')
  mask.close()
  const vis = [ls, rs, lh, rh].reduce((a, p) => a + (p.visibility ?? 0.5), 0) / 4
  if (!shoulder || !waist) return null
  const r3 = (n: number) => Math.round(n * 1000) / 1000
  return {
    shoulderWidth: r3(shoulder / torso),
    waistWidth: r3(waist / torso),
    hipWidth: r3(hip / torso),
    shoulderToWaist: r3(shoulder / waist),
    confidence: r3(vis),
  }
}
