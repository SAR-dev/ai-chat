import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import Mascot from '@/components/Mascot'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-svh items-center justify-center p-8">
          <div className="max-w-lg space-y-4">
            <Mascot expression="thinking" className="h-16 w-16" />
            <h1 className="text-destructive text-lg font-bold">Something went wrong</h1>
            <pre className="text-muted-foreground overflow-auto rounded border p-4 text-xs">
              {this.state.error?.message}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
