import React, { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Tema personalizado oscuro premium con acentos verdes/cian fitness
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#10b981', // Emerald 500
    secondary: '#06b6d4', // Cyan 500
    background: '#020817', // Slate 950
    surface: '#0f172a', // Slate 900
    error: '#f43f5e', // Rose 500
  },
};

export default function RootLayout() {
  const { isAuthenticated, hydrate } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    // Si la sesión no ha terminado de cargarse, esperamos
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="light" />
        <Slot />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
