import { Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { useAuth } from './AuthProvider';

const bioLabel = (t: 'face' | 'fingerprint' | 'biometric') =>
  t === 'face' ? 'Face ID' : t === 'fingerprint' ? 'Touch ID' : 'Biometrics';

/** Account block for the Overview: who's signed in, Face ID status, sign out;
 *  or a sign-in prompt for guests. */
export function AccountCard() {
  const theme = useTheme();
  const {
    status, username, signOutUser, exitGuest,
    biometricEnabled, biometricType, disableBiometric,
  } = useAuth();

  if (status === 'guest') {
    return (
      <Glass radius={18} intensity={32} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Row>
          <SymbolView name="person.crop.circle.dashed" tintColor={theme.color.text.secondary} size={22} />
          <View>
            <Who>Browsing as guest</Who>
            <Hint>Sign in to add and edit cards</Hint>
          </View>
        </Row>
        <PressableScale onPress={() => { Haptics.selectionAsync(); exitGuest(); }} scaleTo={0.95}>
          <Glass radius={999} intensity={26} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
            <Accent>Sign in</Accent>
          </Glass>
        </PressableScale>
      </Glass>
    );
  }

  return (
    <Glass radius={18} intensity={32} style={{ padding: 16 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <SymbolView name="person.crop.circle.fill" tintColor={theme.accent} size={26} />
          <View>
            <Who>{username ?? 'Signed in'}</Who>
            {biometricEnabled && <Hint>{bioLabel(biometricType)} unlock is on</Hint>}
          </View>
        </Row>
        <PressableScale onPress={() => { Haptics.selectionAsync(); signOutUser(); }} scaleTo={0.95}>
          <Glass radius={999} intensity={26} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
            <SignOut>Sign out</SignOut>
          </Glass>
        </PressableScale>
      </Row>

      {biometricEnabled && (
        <Pressable onPress={() => { Haptics.selectionAsync(); disableBiometric(); }}>
          <TurnOff>Turn off {bioLabel(biometricType)} unlock</TurnOff>
        </Pressable>
      )}
    </Glass>
  );
}

const Row = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;
const Who = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
  text-transform: capitalize;
`;
const Hint = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
  margin-top: 1px;
`;
const Accent = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;
const SignOut = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
`;
const TurnOff = styled.Text`
  color: ${({ theme }) => theme.color.text.tertiary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
  margin-top: 14px;
`;
