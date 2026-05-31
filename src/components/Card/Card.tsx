import { IconPhotoScan, IconSelector } from '@tabler/icons-react';
import { useState, useRef, memo } from 'react';
import styled, { css } from 'styled-components';
import { CardModel } from './cardModel';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { easeOut } from '../../theme/motion';
import { spriteUrl, spriteUrlFallback } from '../../utils';
import {
  BaseCardWrapper,
  BaseCardInnerWrapper,
  BaseCardImageContainer,
  BaseCardTitleContainer,
} from '../BaseCard';

type CardProps = Partial<CardModel> & {
  isDemo?: boolean;
};

const Container = styled.div<{ isDemo: boolean | undefined }>`
  display: flex;
  flex-grow: 1;
  padding: 1em;
  border-radius: ${({ theme }) => theme.radius.xl};
  flex-wrap: wrap;
  justify-content: space-evenly;
  height: auto;

  ${({ isDemo }) =>
    isDemo &&
    css`
      min-width: 18rem;
    `}
`;

const Wrapper = styled(BaseCardWrapper)``;
const InnerWrapper = styled(BaseCardInnerWrapper)``;
const ImageContainer = styled(BaseCardImageContainer)``;
const TitleContainer = styled(BaseCardTitleContainer)``;

const Name = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  text-transform: capitalize;
  color: ${({ theme }) => theme.color.text.primary};
`;

const Type = styled.span`
  display: block;
  color: ${({ theme }) => theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: capitalize;
  max-width: 100%;
`;

const BaseUl = styled.ul<{ expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  gap: ${({ expanded }) => (expanded ? '3rem' : '1rem')};
  padding: 0;
  color: ${({ theme }) => theme.color.text.primary};
  min-width: 0;
  width: 100%;
  margin-top: ${({ expanded }) => (expanded ? '0.2rem' : '1rem')};
  transition: ${({ theme }) => theme.transition.normal};

  & > li {
    font-weight: ${({ expanded, theme }) =>
      expanded ? theme.typography.weight.regular : theme.typography.weight.bold};
    opacity: ${({ expanded }) => (expanded ? 1 : 0.7)};
    font-size: ${({ theme }) => theme.typography.size.sm};
    transition: ${({ theme }) => theme.transition.normal};
  }
`;

const StatUl = styled.ul<{ expanded: boolean }>`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto;
  place-items: center;
  padding: 0;
  height: ${({ expanded }) => (expanded ? '10rem' : 0)};
  overflow: hidden;
  transition: height 0.3s ease-in-out;
  border-top: ${({ expanded, theme }) =>
    expanded ? `2px solid ${theme.color.surface.muted}` : 'none'};
`;

const StatItem = styled.li`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.space[2]};
`;

const List = styled.li`
  display: flex;
  flex-flow: column;
  align-items: center;
  font-size: ${({ theme }) => theme.typography.size.sm};
  padding: ${({ theme }) => theme.space[2]};
  color: ${({ theme }) => theme.color.text.primary};
`;

const StyledImage = styled(motion.img)`
  padding: ${({ theme }) => theme.space[3]};
  width: calc(100% - 8px);
  height: calc(100% - 8px);
`;

const StyledDemoImage = styled(motion(IconPhotoScan))`
  padding: ${({ theme }) => theme.space[3]};
  width: calc(100% - 8px);
  height: calc(100% - 8px);
  color: ${({ theme }) => theme.color.text.secondary};
`;

const DuplicateIdentifer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.color.frost.blue};
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 ${({ theme }) => theme.space[1]};
  border-radius: ${({ theme }) => theme.radius.full};
  top: 0;
  right: 0;
  margin: ${({ theme }) => theme.space[2]};
  position: absolute;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const IdentifierText = styled.span`
  color: #ffffff;
  display: block;
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  line-height: 1;
`;

const ResizeContainer = styled.div<{ expanded: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.space[2]};
  top: 0;
  right: 0;
  margin: ${({ theme }) => theme.space[2]};
  position: absolute;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  transition: background-color ${({ theme }) => theme.transition.fast};

  ${({ expanded, theme }) =>
    expanded &&
    css`
      background-color: ${theme.color.text.secondaryHover};
    `};

  &:hover {
    background-color: ${({ theme }) => theme.color.text.secondaryHover};
    cursor: pointer;
  }
`;

const ResizeIcon = styled(IconSelector)`
  width: 1.5rem;
  height: 1.5rem;
  stroke: ${({ theme }) => theme.color.text.primary};
  stroke-width: 1.5;
`;

const Label = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.text.secondary};
`;

const VariantBadge = styled.span`
  display: inline-block;
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.aurora.purple};
  background: ${({ theme }) => `${theme.color.aurora.purple}18`};
  border: 1px solid ${({ theme }) => `${theme.color.aurora.purple}35`};
  border-radius: ${({ theme }) => theme.radius.full};
  padding: 1px ${({ theme }) => theme.space[2]};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  margin-top: ${({ theme }) => theme.space[1]};
`;

const PriceBadge = styled.span`
  display: inline-block;
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.color.aurora.green};
  background: ${({ theme }) => `${theme.color.aurora.green}15`};
  border: 1px solid ${({ theme }) => `${theme.color.aurora.green}30`};
  border-radius: ${({ theme }) => theme.radius.full};
  padding: 1px ${({ theme }) => theme.space[2]};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  margin-top: ${({ theme }) => theme.space[1]};
  font-variant-numeric: tabular-nums;
`;

const Attribute = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.color.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  text-transform: capitalize;
`;


function CardInner(props: CardProps) {
  const { pokemonData, attributes, setNumber, quantity, isDemo } = props;
  const [expanded, setExpanded] = useState<boolean>(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [10, -10]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-10, 10]), { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  const stats = [
    { label: 'Set', value: attributes?.set },
    { label: 'Type', value: attributes?.cardType },
    { label: 'Condition', value: attributes?.condition },
    ...(attributes?.grading ? [{ label: 'Grading', value: String(attributes.grading) }] : []),
  ].filter(({ value }) => Boolean(value));

  return (
    <Container isDemo={isDemo}>
      <Wrapper
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ transformPerspective: 700, rotateX, rotateY }}
        whileHover={{ boxShadow: '0 20px 60px rgba(0,0,0,0.22)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <InnerWrapper>
          <ResizeContainer onClick={() => setExpanded(!expanded)} expanded={expanded}>
            <ResizeIcon />
          </ResizeContainer>

          <ImageContainer expanded={false}>
            {isDemo ? (
              <StyledDemoImage
                stroke={1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : pokemonData?.imageUrl && pokemonData.imageUrl.includes('pokemontcg.io') ? (
              <StyledImage
                src={pokemonData.imageUrl}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: easeOut }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : pokemonData?.name ? (
              <StyledImage
                src={spriteUrl(pokemonData.name ?? '')}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: easeOut }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  const fallback = spriteUrlFallback(pokemonData.name ?? '');
                  if (img.src !== fallback) { img.src = fallback; }
                  else { img.style.opacity = '0'; }
                }}
              />
            ) : (
              <StyledDemoImage
                stroke={1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
            {quantity !== undefined && quantity > 1 && (
              <DuplicateIdentifer>
                <IdentifierText>×{quantity}</IdentifierText>
              </DuplicateIdentifer>
            )}
          </ImageContainer>

          <TitleContainer>
            <Name>{pokemonData?.name}</Name>
            <Type>{pokemonData?.type}</Type>
            {(attributes?.variants?.alternate ?? attributes?.variants?.reverseHolo) && (
              <VariantBadge>
                {attributes.variants.normal ? 'N + Rev. Holo' : 'Rev. Holo'}
              </VariantBadge>
            )}
            {attributes?.marketPrice !== undefined && attributes.marketPrice > 0 && (
              <PriceBadge>${attributes.marketPrice.toFixed(2)}</PriceBadge>
            )}
            <BaseUl expanded={expanded}>
              {Boolean(pokemonData?.id) && <List>{pokemonData?.id}</List>}
              {Boolean(attributes?.year) && <List>{attributes?.year}</List>}
              {Boolean(setNumber) && <List>{setNumber}</List>}
            </BaseUl>
          </TitleContainer>

          <StatUl expanded={expanded}>
            {stats.map(({ label, value }) => (
              <StatItem key={label}>
                <Label>{label}</Label>
                <Attribute>{value}</Attribute>
              </StatItem>
            ))}
          </StatUl>
        </InnerWrapper>
      </Wrapper>
    </Container>
  );
}

export const Card = memo(CardInner);
