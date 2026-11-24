import { Component, type ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-lg space-y-3 p-6 pt-16">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-sm text-slate-400">Your data is safe on this device. Try going home or reloading.</p>
        <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-rose-300">{this.state.error.message}</pre>
        <button className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950" onClick={() => { location.hash = '#/'; location.reload() }}>Go home</button>
      </div>
    )
  }
}
