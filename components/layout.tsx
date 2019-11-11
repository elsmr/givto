import styled from 'styled-components';
import { theme } from 'styled-tools';

export const LayoutWrapper = styled.div`
  width: 100%;
  max-width: 1200px;
  padding: ${theme('space.2')}px;
  margin: 0 auto;
`;

export const Layout = styled.div`
  min-height: 100vh;
`;
