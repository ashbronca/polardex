import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

export default function ScanScreen() {
  return (
    <Screen>
      <Emoji>📷</Emoji>
      <Title>Scan a card</Title>
      <Body>
        Point your camera at a Pokémon card to identify it and add it to your collection.
        {'\n\n'}Coming next.
      </Body>
    </Screen>
  );
}

const Screen = styled(SafeAreaView)`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[8]}px;
  background-color: ${({ theme }) => theme.color.surface.base};
`;

const Emoji = styled.Text`
  font-size: 56px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.color.text.primary};
  font-size: ${({ theme }) => theme.fontSize.xl}px;
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;

const Body = styled.Text`
  color: ${({ theme }) => theme.color.text.secondary};
  font-size: ${({ theme }) => theme.fontSize.md}px;
  text-align: center;
  line-height: 22px;
`;
