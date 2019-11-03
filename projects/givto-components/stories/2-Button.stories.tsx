import { action } from '@storybook/addon-actions';
import { text } from '@storybook/addon-knobs';
import React from 'react';
import { Button } from '../src/components/Button';

export default {
  title: 'Button'
};

export const simple = () => (
  <Button onClick={action('clicked')}>{text('Label', 'Action')}</Button>
);

export const link = () => (
  <Button link onClick={action('clicked')}>
    {text('Label', 'Action')}
  </Button>
);
