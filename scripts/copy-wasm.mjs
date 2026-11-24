// Copies MediaPipe WASM files into public/ so pose analysis works offline (no CDN).
import { cpSync, mkdirSync } from 'node:fs'
mkdirSync('public/mediapipe', { recursive: true })
cpSync('node_modules/@mediapipe/tasks-vision/wasm', 'public/mediapipe', { recursive: true })
