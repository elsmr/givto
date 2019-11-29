import { withTheme } from 'emotion-theming';
import BarLoader from 'react-spinners/BarLoader';
import BoxLoader from 'react-spinners/SquareLoader';
import { Theme } from '../../theme';

interface LoaderProps {
  type: 'bar' | 'box';
  theme: Theme;
}

const BaseLoader: React.FC<LoaderProps> = ({ type, theme }) => {
  if (type === 'bar') {
    return <BarLoader color={theme.colors.primary} />;
  }

  return <BoxLoader color={theme.colors.primary} />;
};

export const Loader = withTheme(BaseLoader);
