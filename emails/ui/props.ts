import type { Locale } from '../../lib/schema/common';
import type { FooterProps } from './footer';

/** What every notification about a group takes; `url` is the button's absolute link. */
export interface NoticeProps {
  locale: Locale;
  group: string;
  url: string;
  /** Set when the email goes to the manager of a managed member. */
  forName?: string;
  unsubscribe?: FooterProps['unsubscribe'];
}
