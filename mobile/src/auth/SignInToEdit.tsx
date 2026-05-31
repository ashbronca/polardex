import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { useAuth } from './AuthProvider';

/** Shown in place of the add controls when a guest tries to edit — taps through
 *  to the login screen (exits guest mode). */
export function SignInToEdit({ label = 'Sign in to add cards' }: { label?: string }) {
  const theme = useTheme();
  const { exitGuest } = useAuth();
  return (
    <PressableScale
      onPress={() => { Haptics.selectionAsync(); exitGuest(); }}
      scaleTo={0.97}
      style={{ alignSelf: 'stretch', marginTop: 18 }}>
      <Glass radius={16} intensity={28} style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <SymbolView name="lock.open.fill" tintColor={theme.accent} size={18} />
        <Label>{label}</Label>
      </Glass>
    </PressableScale>
  );
}

const Label = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.md}px;
`;
