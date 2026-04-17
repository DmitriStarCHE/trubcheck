import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          color: 'var(--text)',
        }}>
          <div style={{
            background: 'rgba(192, 57, 43, 0.15)',
            border: '1px solid rgba(192, 57, 43, 0.4)',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            width: '100%',
            maxWidth: 480,
            textAlign: 'center',
          }}>
            <p style={{ color: 'var(--danger-light)', fontWeight: 600, marginBottom: 8 }}>
              Что-то пошло не так
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              {this.state.error?.message || 'Неизвестная ошибка'}
            </p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={this.handleReset}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
