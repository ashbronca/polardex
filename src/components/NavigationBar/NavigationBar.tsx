import styled from 'styled-components';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '../../utils';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import {
  IconMoon,
  IconSun,
  IconCards,
  IconPackage,
  IconPencil,
  IconChartBar,
  IconLock,
  IconLockOpen,
} from '@tabler/icons-react';
import { useThemeMode, useReadOnly } from '../../providers';
import { tapPress, springSnappy } from '../../theme/motion';

// ── Root shell ────────────────────────────────────────────────────────────────

const RootContainer = styled.div`
  position: sticky;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  top: 0;
  right: 0;
  left: 0;
  width: 100%;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: ${({ theme }) => theme.color.surface.base}e6;
  border-bottom: 1px solid ${({ theme }) => theme.color.surface.border};
  transition: background-color 200ms cubic-bezier(0.22, 1, 0.36, 1), border-color 200ms cubic-bezier(0.22, 1, 0.36, 1);
  /* Respect the iOS PWA safe-area inset so the nav doesn't slip under the
     status bar / notch when running as a standalone home-screen app. */
  padding-top: env(safe-area-inset-top, 0px);
`;

const NavigationContainer = styled.div`
  position: relative;
  margin-inline: auto;
  width: 100%;
  padding-inline: ${({ theme }) => theme.space[4]};

  @media (min-width: ${({ theme }) => theme.breakpoint.sm}) {
    padding-inline: ${({ theme }) => theme.space[6]};
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.lg}) {
    max-width: ${({ theme }) => theme.breakpoint.lg};
    padding-inline: ${({ theme }) => theme.space[6]};
  }
`;

const NavigationWrapper = styled.div`
  display: flex;
  align-items: center;
  height: 4rem;

  @media (min-width: ${({ theme }) => theme.breakpoint.md}) {
    height: 5rem;
  }
`;

const NavigationHeader = styled.header`
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};

  @media (min-width: ${({ theme }) => theme.breakpoint.md}) {
    gap: ${({ theme }) => theme.space[12]};
  }
`;

// ── Logo ──────────────────────────────────────────────────────────────────────

const StyledLogoLink = styled(Link)`
  display: inline-flex;
  text-decoration: none;
`;

const LogoTitle = styled.span`
  color: ${({ theme }) => theme.color.frost.deep};
  display: inline-block;
  font-weight: ${({ theme }) => theme.typography.weight.heavy};
  font-size: ${({ theme }) => theme.typography.size.xl};
  background-image: linear-gradient(
    268.67deg,
    ${({ theme }) => theme.color.frost.teal} 3.43%,
    ${({ theme }) => theme.color.frost.sky} 15.69%,
    ${({ theme }) => theme.color.frost.blue} 55.54%,
    ${({ theme }) => theme.color.frost.deep} 99%
  );
  background-size: 100%;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
`;

const ImageWrapper = styled.span`
  display: none;
  position: relative;
  width: 10rem;

  @media (min-width: ${({ theme }) => theme.breakpoint.md}) {
    display: inline-block;
  }
`;

const DragoniteImage = styled(motion.img)`
  position: absolute;
  left: 2px;
  top: -100px;
  height: 10rem;
  width: 10rem;
  transform: matrix(-1, 0, 0, -1, 0, 0) !important;
  filter: ${({ theme }) => theme.dropShadow.sm};
`;

// ── Nav links (desktop) ───────────────────────────────────────────────────────

const NavContainer = styled.nav`
  position: relative;
`;

const NavList = styled.ul`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]};
  list-style: none;
  padding: 0;
  margin: 0;
`;

const List = styled.li`
  text-decoration: none;
  position: relative;
`;

const StyledLink = styled(Link)`
  display: inline-flex;
  font-size: ${({ theme }) => theme.typography.size.md};
  padding: 0;
  text-decoration: none;
`;

const NavButton = styled(motion.button)`
  flex-direction: column;
  height: 3rem;
  color: ${({ theme }) => theme.color.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  font-size: ${({ theme }) => theme.typography.size.md};
  text-decoration: none;
  text-transform: capitalize;
  padding: 0 ${({ theme }) => theme.space[4]};
  display: flex;
  justify-content: center;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: center;
  transition: color ${({ theme }) => theme.transition.fast};

  &:hover {
    color: ${({ theme }) => theme.color.frost.blue};
  }
`;

const ActiveIndicator = styled(motion.div)`
  position: absolute;
  bottom: 4px;
  left: ${({ theme }) => theme.space[4]};
  right: ${({ theme }) => theme.space[4]};
  height: 2px;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.color.frost.teal},
    ${({ theme }) => theme.color.frost.blue}
  );
  border-radius: 1px;
`;

// ── Icon buttons ──────────────────────────────────────────────────────────────

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: ${({ theme }) => theme.space[2]};
  color: ${({ theme }) => theme.color.text.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  transition: color ${({ theme }) => theme.transition.fast},
    background-color ${({ theme }) => theme.transition.fast};

  &:hover {
    color: ${({ theme }) => theme.color.text.primary};
    background: ${({ theme }) => theme.color.text.primaryHover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.frost.blue};
    outline-offset: 2px;
  }
`;

const MobileControls = styled.div`
  display: flex;
  align-items: center;
`;

const DesktopControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
`;

// ── Bottom tab bar (mobile) ───────────────────────────────────────────────────

const BottomNav = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  background: ${({ theme }) => theme.color.surface.base}f2;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid ${({ theme }) => theme.color.surface.border};
  padding-bottom: env(safe-area-inset-bottom, 0px);
  display: flex;
`;

const TabItem = styled(Link)<{ $active: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: ${({ theme }) => `${theme.space[2]} 0 ${theme.space[3]}`};
  text-decoration: none;
  color: ${({ $active, theme }) =>
    $active ? theme.color.frost.blue : theme.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.weight.semibold : theme.typography.weight.medium};
  font-family: inherit;
  transition: color 150ms cubic-bezier(0.22, 1, 0.36, 1);
  -webkit-tap-highlight-color: transparent;
`;

const TabIconWrap = styled.div`
  position: relative;
  width: 2.5rem;
  height: 1.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ActivePill = styled(motion.div)`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => `${theme.color.frost.blue}1c`};
`;

const LockIconBtn = styled(IconButton)<{ $locked: boolean }>`
  color: ${({ $locked, theme }) =>
    $locked ? theme.color.aurora.orange : theme.color.text.secondary};

  &:hover {
    color: ${({ $locked, theme }) =>
      $locked ? theme.color.aurora.orange : theme.color.text.primary};
    background: ${({ $locked, theme }) =>
      $locked ? `${theme.color.aurora.orange}18` : theme.color.text.primaryHover};
  }
`;

// ── Theme icon toggle ─────────────────────────────────────────────────────────

function ThemeIcon({ isDark }: { isDark: boolean }) {
  return (
    <AnimatePresence mode='wait' initial={false}>
      {isDark ? (
        <motion.span
          key='sun'
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ display: 'flex' }}
        >
          <IconSun stroke={2} size={18} />
        </motion.span>
      ) : (
        <motion.span
          key='moon'
          initial={{ rotate: 90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: -90, opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ display: 'flex' }}
        >
          <IconMoon stroke={2} size={18} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// ── Nav data ──────────────────────────────────────────────────────────────────

const navLinks = [
  { to: '/collections',  label: 'Collection', icon: IconCards    },
  { to: '/sets',     label: 'Sets',       icon: IconPackage  },
  { to: '/studio',   label: 'Studio',     icon: IconPencil   },
  { to: '/overview', label: 'Stats',      icon: IconChartBar },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function NavigationBar() {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const { isDark, toggle } = useThemeMode();
  const { isReadOnly, toggle: toggleReadOnly } = useReadOnly();

  return (
    <>
      <RootContainer>
        <NavigationContainer>
          <NavigationWrapper>
            <NavigationHeader>
              <StyledLogoLink to='/' style={{ display: 'flex' }}>
                <LogoTitle>POLARDEX</LogoTitle>
                <ImageWrapper>
                  <DragoniteImage
                    src='https://img.pokemondb.net/sprites/home/normal/dragonite.png'
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.2 }}
                  />
                </ImageWrapper>
              </StyledLogoLink>

              {isMobile ? (
                <MobileControls>
                  <LockIconBtn
                    $locked={isReadOnly}
                    onClick={toggleReadOnly}
                    aria-label={isReadOnly ? 'Disable view-only mode' : 'Enable view-only mode'}
                    title={isReadOnly ? 'View-only ON — tap to unlock (⌘⇧L)' : 'Enable view-only mode (⌘⇧L)'}
                  >
                    {isReadOnly ? <IconLock size={18} stroke={2} /> : <IconLockOpen size={18} stroke={1.75} />}
                  </LockIconBtn>
                  <IconButton
                    onClick={toggle}
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    <ThemeIcon isDark={isDark} />
                  </IconButton>
                </MobileControls>
              ) : (
                <DesktopControls>
                  <LayoutGroup>
                    <NavContainer>
                      <NavList>
                        {navLinks.map(({ to, label }) => (
                          <List key={to}>
                            <StyledLink to={to}>
                              <NavButton
                                whileHover={{ y: -1 }}
                                whileTap={tapPress}
                                transition={springSnappy}
                              >
                                {label}
                              </NavButton>
                            </StyledLink>
                            {pathname === to && (
                              <ActiveIndicator layoutId='nav-underline' />
                            )}
                          </List>
                        ))}
                      </NavList>
                    </NavContainer>
                  </LayoutGroup>
                  <LockIconBtn
                    $locked={isReadOnly}
                    onClick={toggleReadOnly}
                    aria-label={isReadOnly ? 'Disable view-only mode' : 'Enable view-only mode'}
                    title={isReadOnly ? 'View-only ON — click to unlock (⌘⇧L)' : 'Enable view-only mode (⌘⇧L)'}
                  >
                    {isReadOnly ? <IconLock size={18} stroke={2} /> : <IconLockOpen size={18} stroke={1.75} />}
                  </LockIconBtn>
                  <IconButton
                    onClick={toggle}
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    <ThemeIcon isDark={isDark} />
                  </IconButton>
                </DesktopControls>
              )}
            </NavigationHeader>
          </NavigationWrapper>
        </NavigationContainer>
      </RootContainer>

      {/* ── Bottom tab bar (mobile only) ── */}
      {isMobile && (
        <LayoutGroup id='bottom-nav'>
          <BottomNav aria-label='Main navigation'>
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <TabItem key={to} to={to} $active={active} aria-current={active ? 'page' : undefined}>
                  <TabIconWrap>
                    {active && (
                      <ActivePill
                        layoutId='bottom-pill'
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon size={20} stroke={active ? 2.5 : 1.75} />
                  </TabIconWrap>
                  {label}
                </TabItem>
              );
            })}
          </BottomNav>
        </LayoutGroup>
      )}
    </>
  );
}
