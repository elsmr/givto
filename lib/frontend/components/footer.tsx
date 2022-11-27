import styled from '@emotion/styled';
import { Box } from './ui/box';
import GivtoLogo from '../../../assets/givto-logo.svg';
import { LayoutWrapper } from './ui/layout';
import { Link } from './ui/link';
import { Select } from './ui/select';
import { useRouter } from 'next/router';
import { GitHub } from 'react-feather';
import { ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { setCookie } from 'typescript-cookie';

const StyledLogo = styled(GivtoLogo)`
  transform: rotate(-15deg);
  width: 72px;
`;

const Foot = styled(Box)`
  width: 100%;
  min-height: 260px;
`.withComponent('footer');

export const Footer = () => {
  const router = useRouter();
  const { asPath, query, pathname, locales = [], locale } = router;
  const t = useTranslations('footer');

  return (
    <Foot bg="muted">
      <LayoutWrapper
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        py={5}
      >
        <Box marginBottom={4}>
          <StyledLogo />
        </Box>

        <Box marginBottom={2} display="flex" alignItems="center">
          <Select
            as="select"
            ml={2}
            borderColor="textMuted"
            defaultValue={router.locale}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              const newLocale = event.target.value;
              setCookie('NEXT_LOCALE', newLocale, {
                expires: 365 * 5,
                secure: process.env.NODE_ENV !== 'development',
                sameSite: 'Strict',
              });
              router.push({ pathname, query }, asPath, {
                locale: newLocale,
              });
            }}
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {t('lang', { locale: l })}
              </option>
            ))}
          </Select>
        </Box>
        <Box display="flex" marginBottom={2} alignItems="center">
          <Link href="https://github.com/elsmr/givto" mr={2}>
            <Box display="flex" alignItems="center">
              <Box marginRight={1}>
                <GitHub size={16} />
              </Box>{' '}
              {t('view-source')}
            </Box>
          </Link>
          <Box>
            {t('by')} <Link href="https://elsmr.dev">elsmr</Link>
          </Box>
        </Box>
      </LayoutWrapper>
    </Foot>
  );
};
