import { AccountMenu } from '@/components/shell/account-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StyleguideRow, StyleguideSection } from './styleguide-section';

const sampleUser = { name: 'Ann', email: 'ann@example.com' };

export const NavigationSection = () => (
  <StyleguideSection id="navigation" title="Navigation">
    <StyleguideRow label="Account menu (signed in; the header above shows signed out)">
      <AccountMenu user={sampleUser} />
    </StyleguideRow>
    <StyleguideRow label="Tabs">
      <Tabs defaultValue="wishlist" className="max-w-md">
        <TabsList>
          <TabsTrigger value="wishlist">My wishlist</TabsTrigger>
          <TabsTrigger value="giftee">Your giftee</TabsTrigger>
        </TabsList>
        <TabsContent value="wishlist">Wool socks, a good book.</TabsContent>
        <TabsContent value="giftee">
          Cat hasn&apos;t added wishes yet.
        </TabsContent>
      </Tabs>
    </StyleguideRow>
  </StyleguideSection>
);
