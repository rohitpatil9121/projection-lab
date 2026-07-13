import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-5">
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-5 space-y-3 max-w-md w-full">
            <div className="font-bold text-rose-700 dark:text-rose-300">Something went wrong</div>
            <p className="text-sm text-ink-500">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => { this.setState({ error: null }); window.location.hash = '#/' }}
              className="btn-secondary text-sm"
            >
              Back to Today
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
