import styled from '@emotion/styled';
import { Box } from './ui/box';
import GivtoLogo from '../../../assets/givto-logo.svg';
import { LayoutWrapper } from './ui/layout';
import { Link } from './ui/link';
import { Select } from './ui/select';
import { useRouter } from 'next/router';
import { ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';

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
              const secure =
                process.env.NODE_ENV !== 'development' ? '; secure' : '';
              document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${
                60 * 60 * 24 * 365 * 5
              }; samesite=strict${secure}`;
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
                {/* Lucide dropped brand icons; this is Feather's GitHub icon */}
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
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
