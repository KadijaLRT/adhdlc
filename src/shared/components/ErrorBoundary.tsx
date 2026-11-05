import React, { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }

// Root-level crash guard. Catches render/lifecycle exceptions and shows
// a calm, non-punitive recovery screen. Only catches render-tree errors —
// async failures (Groq, Supabase, storage) are handled by try/catch at
// their call sites, not by this boundary.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true }; }
  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error('ErrorBoundary: caught a render error', error, errorInfo);
  }
  handleReset = () => this.setState({ hasError: false });

  render() {
    if (this.state?.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
          <View className="flex-1 items-center justify-center px-8 pt-safe pb-safe">
            <Text className="text-slate-900 text-2xl font-semibold mb-3 text-center dark:text-slate-100">
              Something didn&apos;t load right.
            </Text>
            <Text className="text-slate-500 text-base mb-8 text-center">
              That&apos;s on us, not you. Your data is safe. Let&apos;s try again.
            </Text>
            <Pressable
              onPress={this.handleReset}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              className="bg-indigo-600 rounded-full py-4 px-8 active:bg-indigo-500 btn3d btn3d-p"
            >
              <Text className="text-white text-lg font-semibold">Try again</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
    return this.props?.children ?? null;
  }
}
