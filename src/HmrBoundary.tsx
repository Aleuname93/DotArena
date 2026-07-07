import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { crashed: boolean }

export class HmrBoundary extends Component<Props, State> {
  state: State = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(error: Error) {
    // Hook order errors from stale HMR fibers — force a clean reload
    if (error.message.includes('queue') || error.message.includes('hook') || error.message.includes('Hook')) {
      window.location.reload()
    }
  }

  render() {
    if (this.state.crashed) {
      return (
        <div style={{ background: '#0a0a0a', color: '#00ff41', fontFamily: 'monospace', padding: 32, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12 }}>Recarregando...</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
