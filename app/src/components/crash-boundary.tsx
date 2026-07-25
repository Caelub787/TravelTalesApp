import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: string | null;
}

// Deliberately independent of ThemeProvider/context — those live inside the
// tree this boundary wraps, so if one of them throws during render, this
// boundary must still be able to render the error without touching them.
export class CrashBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info: info.componentStack ?? null });
    // eslint-disable-next-line no-console
    console.error('CrashBoundary caught render error:', error, info.componentStack);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>TravelTales crashed while rendering</Text>
          <Text style={styles.message}>{error.message}</Text>
          {error.stack && <Text style={styles.stack}>{error.stack}</Text>}
          {info && <Text style={styles.stack}>{info}</Text>}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0000',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    color: '#ffb3b3',
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    color: '#ffb3b3',
    fontSize: 14,
  },
  stack: {
    color: '#ff8080',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
