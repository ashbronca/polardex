import { View } from 'react-native';
import { SymbolView, SymbolViewProps } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from './Glass';
import { CALM } from '@/theme/motion';

/** On-brand empty state: a frosted glass icon, a title, and a gentle subtitle.
 *  Fades in calmly so blank lists never feel broken. */
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: SymbolViewProps['name'];
  title: string;
  subtitle?: string;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(420).easing(CALM)} style={{ alignItems: 'center', paddingHorizontal: 36 }}>
      <Glass radius={999} intensity={36} style={{ width: 84, height: 84, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <SymbolView name={icon} tintColor={theme.accent} size={34} />
      </Glass>
      <Title>{title}</Title>
      {!!subtitle && <Sub>{subtitle}</Sub>}
    </Animated.View>
  );
}

const Title = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.lg}px;
  text-align: center;
`;
const Sub = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.sm}px;
  text-align: center;
  line-height: 21px;
  margin-top: 6px;
  max-width: 280px;
`;
