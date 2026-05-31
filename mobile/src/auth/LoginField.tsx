import { forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { SymbolView, SymbolViewProps } from 'expo-symbols';
import styled, { useTheme } from 'styled-components/native';

import { Glass } from '@/components/Glass';

/** Glass-framed text input with a leading SF Symbol — used on the login form. */
export const LoginField = forwardRef<TextInput, TextInputProps & { icon: SymbolViewProps['name'] }>(
  function LoginField({ icon, ...props }, ref) {
    const theme = useTheme();
    return (
      <Glass radius={16} intensity={26} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 56, marginTop: 12 }}>
        <SymbolView name={icon} tintColor={theme.color.text.tertiary} size={18} />
        <Input
          ref={ref}
          placeholderTextColor={theme.color.text.tertiary}
          selectionColor={theme.accent}
          {...props}
        />
      </Glass>
    );
  },
);

const Input = styled(TextInput)`
  flex: 1;
  margin-left: 12px;
  color: ${({ theme }) => theme.color.text.primary};
  font-family: ${({ theme }) => theme.font.medium};
  font-size: ${({ theme }) => theme.fontSize.md}px;
  height: 100%;
`;
