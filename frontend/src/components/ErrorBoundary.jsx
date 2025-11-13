import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if it's a ResizeObserver error (benign)
    if (error && error.message && 
        (error.message.includes('ResizeObserver') || 
         error.message.includes('undelivered notifications'))) {
      // Don't show error for ResizeObserver issues
      return { hasError: false };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log ResizeObserver errors but don't crash
    if (error && error.message && 
        (error.message.includes('ResizeObserver') || 
         error.message.includes('undelivered notifications'))) {
      console.log('ResizeObserver error caught and suppressed (benign)');
      return;
    }
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-700 mb-4">
              An error occurred. Please refresh the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
