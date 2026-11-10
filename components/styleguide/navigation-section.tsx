import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StyleguideRow, StyleguideSection } from './styleguide-section';

export const NavigationSection = () => (
  <StyleguideSection id="navigation" title="Navigation">
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
