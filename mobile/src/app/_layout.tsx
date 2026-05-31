import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import { ThemeProvider as SCThemeProvider } from 'styled-components/native';

import { darkTheme, lightTheme } from '@/theme/theme';

function TabEmoji({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function Layout() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <SCThemeProvider theme={theme}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.color.frost.blue,
          tabBarInactiveTintColor: theme.color.text.secondary,
          tabBarStyle: {
            backgroundColor: theme.color.surface.footer,
            borderTopColor: theme.color.surface.border,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Collection', tabBarIcon: () => <TabEmoji emoji="🗂️" /> }}
        />
        <Tabs.Screen
          name="explore"
          options={{ title: 'Scan', tabBarIcon: () => <TabEmoji emoji="📷" /> }}
        />
      </Tabs>
    </SCThemeProvider>
  );
}
