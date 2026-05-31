import { useEffect } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { useFonts } from 'expo-font';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider as SCThemeProvider } from 'styled-components/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { AmbientGlow } from '@/components/AmbientGlow';
import { darkTheme, lightTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Layout() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const [fontsLoaded] = useFonts({
    'SFProRounded-Regular': require('@/assets/fonts/SFProRounded-Regular.otf'),
    'SFProRounded-Medium': require('@/assets/fonts/SFProRounded-Medium.otf'),
    'SFProRounded-Semibold': require('@/assets/fonts/SFProRounded-Semibold.otf'),
    'SFProRounded-Bold': require('@/assets/fonts/SFProRounded-Bold.otf'),
    'SFProRounded-Heavy': require('@/assets/fonts/SFProRounded-Heavy.otf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    // Base background so tab transitions never reveal black behind the
    // (transparent) scenes — each screen paints its gradient on top of this.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.gradient[0] }}>
      <SCThemeProvider theme={theme}>
        {/* Persistent root gradient — screens are transparent over this, so a
            slow per-screen mount can never reveal black. */}
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AmbientGlow />
        <BottomSheetModalProvider>
        <Tabs
          screenOptions={{
            headerShown: false,
            // 'fade' cross-fades scenes in place over the persistent root
            // gradient — unlike 'shift' it never strands a scene off-screen.
            animation: 'fade',
            // Don't freeze inactive tabs — a frozen screen re-shown mid-fade can
            // render blank (the intermittent "no content" between pages).
            freezeOnBlur: false,
            sceneStyle: { backgroundColor: 'transparent' },
            tabBarActiveTintColor: theme.accent,
            tabBarInactiveTintColor: theme.color.text.secondary,
            tabBarLabelStyle: { fontFamily: theme.font.medium, fontSize: 11 },
            // Absolute + transparent so screen content flows under the frosted bar.
            tabBarStyle: {
              position: 'absolute',
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.glass.border,
              backgroundColor: 'transparent',
              elevation: 0,
            },
            tabBarBackground: () => (
              <BlurView
                intensity={48}
                tint={theme.glass.tint}
                style={StyleSheet.absoluteFill}
              />
            ),
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Collection',
              tabBarIcon: ({ color }) => (
                <SymbolView name="square.grid.2x2.fill" tintColor={color} size={24} />
              ),
            }}
          />
          <Tabs.Screen
            name="sets"
            options={{
              title: 'Sets',
              tabBarIcon: ({ color }) => (
                <SymbolView name="rectangle.stack.fill" tintColor={color} size={24} />
              ),
            }}
          />
          <Tabs.Screen
            name="overview"
            options={{
              title: 'Overview',
              tabBarIcon: ({ color }) => (
                <SymbolView name="chart.bar.fill" tintColor={color} size={24} />
              ),
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              title: 'Scan',
              tabBarIcon: ({ color }) => (
                <SymbolView name="viewfinder" tintColor={color} size={24} />
              ),
            }}
          />
        </Tabs>
        </BottomSheetModalProvider>
      </SCThemeProvider>
    </GestureHandlerRootView>
  );
}
