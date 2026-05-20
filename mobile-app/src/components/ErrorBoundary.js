import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error.message);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message} numberOfLines={4}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0E1A',
    padding: 32,
  },
  emoji: { fontSize: 52, marginBottom: 16 },
  title: {
    color: '#F0F6FC',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#8B949E',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: '#006D77',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});

export default ErrorBoundary;
