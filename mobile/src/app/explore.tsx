import { SymbolView } from 'expo-symbols';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { useTheme } from 'styled-components/native';

export default function ScanScreen() {
  const theme = useTheme();
  return (
    <Background>
      <SafeAreaView edges={['top']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Animated.View entering={FadeInUp.springify().damping(16)} style={{ alignItems: 'center' }}>
          <Glass radius={999} intensity={40} style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
            <SymbolView name="viewfinder" tintColor={theme.accent} size={56} />
          </Glass>
          <Title>Scan a card</Title>
          <Body>
            Point your camera at a Pokémon card to identify it and add it to your collection.
          </Body>
          <Glass radius={999} intensity={30} style={{ marginTop: 24, paddingVertical: 8, paddingHorizontal: 18 }}>
            <Soon>Coming soon</Soon>
          </Glass>
        </Animated.View>
      </SafeAreaView>
    </Background>
  );
}

const Title = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.bold};
  font-size: ${({ theme }) => theme.fontSize.xl}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;

const Body = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-family: ${({ theme }) => theme.font.regular};
  font-size: ${({ theme }) => theme.fontSize.md}px;
  text-align: center;
  line-height: 22px;
  max-width: 280px;
`;

const Soon = styled.Text`
  color: ${({ theme }) => theme.accent};
  font-family: ${({ theme }) => theme.font.semibold};
  font-size: ${({ theme }) => theme.fontSize.xs}px;
  letter-spacing: 0.5px;
`;
