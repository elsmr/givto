import { text } from '@storybook/addon-knobs';
import React from 'react';
import { Box } from '../src/components/Box';

export default {
  title: 'Box'
};

export const simple = () => <Box>{text('Label', 'Box Content')}</Box>;
