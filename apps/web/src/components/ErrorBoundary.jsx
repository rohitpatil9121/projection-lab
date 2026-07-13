import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-5 space-y-3">
          <div className="font-bold text-rose-700 dark:text-rose-300">Something went wrong on this screen</div>
          <p className="text-sm text-ink-500">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => { this.setState({ error: null }); window.location.hash = '#/' }}
            className="btn-secondary text-sm"
          >
            Back to Today
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
