import { useTheme } from '@emotion/react';
import BarLoader from 'react-spinners/BarLoader';
import BoxLoader from 'react-spinners/SquareLoader';
import { Theme } from '../../theme';
import { Layout } from './layout';

interface LoaderProps {
  type: 'bar' | 'box';
}

export const Loader: React.FC<LoaderProps> = ({ type }) => {
  const theme = useTheme() as Theme;

  if (type === 'bar') {
    return <BarLoader color={theme.colors.primary} />;
  }

  return <BoxLoader color={theme.colors.primary} />;
};

export const PageLoader: React.FC = () => (
  <Layout display="flex" alignItems="center" justifyContent="center">
    <Loader type="box" />
  </Layout>
);
