import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });
    
    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    // Force app reload (in development)
    if (__DEV__) {
      const { DevSettings } = require('react-native');
      DevSettings.reload();
    } else {
      this.handleReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Error UI
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😕</Text>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              We encountered an unexpected error. Don't worry, your progress is safe!
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Mode):</Text>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={this.handleReset}
              >
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>

              {__DEV__ && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={this.handleReload}
                >
                  <Text style={styles.secondaryButtonText}>Reload App</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.helpText}>
              If this keeps happening, please restart the app.
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    // Normal render - pass through children
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  errorDetails: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    maxHeight: 200,
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    color: '#856404',
    fontFamily: 'monospace',
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3498DB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  secondaryButtonText: {
    color: '#3498DB',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    marginTop: 30,
  },
});

export default ErrorBoundary;
