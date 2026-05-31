import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { LoginField } from './LoginField';
import { useAuth } from './AuthProvider';
import { CALM, REVEAL_MS } from '@/theme/motion';

const APP_ICON = require('@/assets/images/icon.png');

const bioLabel = (t: 'face' | 'fingerprint' | 'biometric') =>
  t === 'face' ? 'Face ID' : t === 'fingerprint' ? 'Touch ID' : 'Biometrics';
const bioIcon = (t: 'face' | 'fingerprint' | 'biometric') =>
  t === 'face' ? 'faceid' : t === 'fingerprint' ? 'touchid' : 'lock.shield';

export function LoginScreen() {
  const theme = useTheme();
  const {
    signIn, continueAsGuest, biometricAvailable, biometricEnabled,
    biometricType, enableBiometric, loginWithBiometric,
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [enableBio, setEnableBio] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passRef = useRef<TextInput>(null);

  // Gentle float on the app mark — ambient, never resting hard.
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -4 + float.value * 8 }] }));

  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const fail = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shake.value = withSequence(
      withTiming(-8, { duration: 60 }), withTiming(8, { duration: 60 }),
      withTiming(-5, { duration: 60 }), withTiming(0, { duration: 60 }),
    );
  };

  const onSignIn = async () => {
    if (busy) return;
    if (!username.trim() || !password) { setError('Enter your username and password.'); fail(); return; }
    setBusy(true); setError(null);
    try {
      await signIn(username, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (enableBio && biometricAvailable && !biometricEnabled) {
        await enableBiometric(username, password).catch(() => {});
      }
      // The auth gate swaps to the app automatically on success.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
      fail();
    } finally {
      setBusy(false);
    }
  };

  const onBiometric = async () => {
    Haptics.selectionAsync();
    try { await loginWithBiometric(); } catch { /* user cancelled */ }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Wrap>
          <Animated.View entering={FadeIn.duration(500)} style={floatStyle}>
            <Mark radius={999} intensity={36} style={{ width: 96, height: 96 }}>
              <Image source={APP_ICON} style={{ width: 96, height: 96, borderRadius: 999 }} contentFit="cover" />
            </Mark>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(460).easing(CALM)} style={{ alignItems: 'center' }}>
            <Brand>POLARDEX</Brand>
            <Tagline>Your Pokédex, in your pocket</Tagline>
          </Animated.View>

          <Animated.View style={[{ alignSelf: 'stretch' }, shakeStyle]}>
            <Animated.View entering={FadeInDown.delay(220).duration(460).easing(CALM)}>
              <LoginField
                icon="person.fill"
                placeholder="Username"
                value={username}
                onChangeText={(t) => { setUsername(t); setError(null); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(300).duration(460).easing(CALM)}>
              <LoginField
                ref={passRef}
                icon="lock.fill"
                placeholder="Password"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="go"
                onSubmitEditing={onSignIn}
              />
            </Animated.View>

            {biometricAvailable && !biometricEnabled && (
              <Animated.View entering={FadeInDown.delay(360).duration(460).easing(CALM)}>
                <Pressable onPress={() => { Haptics.selectionAsync(); setEnableBio((v) => !v); }}>
                  <BioOptRow>
                    <SymbolView name={enableBio ? 'checkmark.circle.fill' : 'circle'} tintColor={enableBio ? theme.accent : theme.color.text.tertiary} size={20} />
                    <BioOptText>Unlock with {bioLabel(biometricType)} next time</BioOptText>
                  </BioOptRow>
                </Pressable>
              </Animated.View>
            )}

            {error && (
              <Animated.View entering={FadeIn.duration(200)}>
                <ErrorText>{error}</ErrorText>
              </Animated.View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(420).duration(REVEAL_MS).easing(CALM)} style={{ alignSelf: 'stretch' }}>
            <PressableScale onPress={onSignIn} scaleTo={0.97}>
              <SignInBtn>
                <LinearGradient
                  colors={[theme.accent, theme.color.frost.teal]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <SignInText>{busy ? 'Signing in…' : 'Sign in'}</SignInText>
              </SignInBtn>
            </PressableScale>

            {biometricEnabled && (
              <PressableScale onPress={onBiometric} scaleTo={0.97} style={{ marginTop: 12 }}>
                <Glass radius={16} intensity={28} style={{ height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <SymbolView name={bioIcon(biometricType)} tintColor={theme.accent} size={22} />
                  <BioText>Sign in with {bioLabel(biometricType)}</BioText>
                </Glass>
              </PressableScale>
            )}

            <Pressable onPress={() => { Haptics.selectionAsync(); continueAsGuest(); }} style={{ marginTop: 18, alignSelf: 'center' }}>
              <GuestText>Continue as guest →</GuestText>
            </Pressable>
          </Animated.View>
        </Wrap>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Wrap = styled(View)`
  flex: 1;
  padding: 0 28px;
  align-items: center;
  justify-content: center;
  gap: 22px;
`;
const Mark = styled(Glass)`
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;
const Brand = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.heavy};
  font-size: 34px;
  letter-spacing: 3px;
`;
const Tagline = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  margin-top: 4px;
`;
const BioOptRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 14px 4px 2px;
`;
const BioOptText = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;
const ErrorText = styled.Text`
  color: ${({ theme }) => theme.color.aurora.red};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  text-align: center;
  margin-top: 12px;
`;
const SignInBtn = styled(View)`
  height: 56px;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  margin-top: 6px;
`;
const SignInText = styled.Text`
  color: ${({ theme }) => theme.color.text.onAccent};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.lg}px;
`;
const BioText = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
const GuestText = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
