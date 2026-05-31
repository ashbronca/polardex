import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { useAuth } from './AuthProvider';

const bioLabel = (t: 'face' | 'fingerprint' | 'biometric') =>
  t === 'face' ? 'Face ID' : t === 'fingerprint' ? 'Touch ID' : 'Biometrics';
const bioIcon = (t: 'face' | 'fingerprint' | 'biometric') =>
  t === 'face' ? 'faceid' : t === 'fingerprint' ? 'touchid' : 'lock.shield';

export function LockScreen() {
  const theme = useTheme();
  const { unlock, signOutUser, biometricType, username } = useAuth();
  const fired = useRef(false);

  // Prompt once automatically on mount.
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    unlock();
  }, [unlock]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Wrap>
        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
          <Glass radius={999} intensity={36} style={{ width: 104, height: 104, alignItems: 'center', justifyContent: 'center' }}>
            <SymbolView name={bioIcon(biometricType)} tintColor={theme.accent} size={48} />
          </Glass>
          <Title>Welcome back{username ? `, ${username}` : ''}</Title>
          <Sub>Unlock Polardex to continue</Sub>
        </Animated.View>

        <View style={{ alignSelf: 'stretch', marginTop: 32 }}>
          <PressableScale onPress={() => { Haptics.selectionAsync(); unlock(); }} scaleTo={0.97}>
            <Glass radius={16} intensity={30} style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <SymbolView name={bioIcon(biometricType)} tintColor={theme.accent} size={22} />
              <BtnText>Unlock with {bioLabel(biometricType)}</BtnText>
            </Glass>
          </PressableScale>

          <Pressable onPress={() => { Haptics.selectionAsync(); signOutUser(); }} style={{ marginTop: 18, alignSelf: 'center' }}>
            <SignOut>Sign out</SignOut>
          </Pressable>
        </View>
      </Wrap>
    </SafeAreaView>
  );
}

const Wrap = styled(View)`
  flex: 1;
  padding: 0 28px;
  align-items: center;
  justify-content: center;
`;
const Title = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: ${({ theme }) => theme.fontSize.xl}px;
  margin-top: 22px;
`;
const Sub = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  margin-top: 6px;
`;
const BtnText = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
const SignOut = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;
