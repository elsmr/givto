import { GroupTabBar } from '@/components/group/group-tab-bar';
import { groupTabs } from '@/components/group/use-group-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StyleguideRow, StyleguideSection } from './styleguide-section';

export const TabsSection = () => (
  <StyleguideSection
    id="tabs"
    title="Tabs"
    description="Segmented: switching views of one thing (the group home, a setting with a few options); the active segment is raised. Default: a filled active tab, for simple panels."
  >
    <StyleguideRow label="Segmented (GroupTabBar)">
      <Tabs defaultValue="overview">
        <GroupTabBar tabs={groupTabs} />
      </Tabs>
    </StyleguideRow>
    <StyleguideRow label="Segmented, text only">
      <Tabs defaultValue="system" className="w-fit">
        <TabsList variant="segmented" aria-label="Theme">
          <TabsTrigger value="light" className="min-h-11">Light</TabsTrigger>
          <TabsTrigger value="dark" className="min-h-11">Dark</TabsTrigger>
          <TabsTrigger value="system" className="min-h-11">System</TabsTrigger>
        </TabsList>
      </Tabs>
    </StyleguideRow>
    <StyleguideRow label="Default">
      <Tabs defaultValue="wishlist" className="max-w-md">
        <TabsList>
          <TabsTrigger value="wishlist">My wishlist</TabsTrigger>
          <TabsTrigger value="giftee">Your giftee</TabsTrigger>
        </TabsList>
        <TabsContent value="wishlist">Wool socks, a good book.</TabsContent>
        <TabsContent value="giftee">Cat hasn&apos;t added wishes yet.</TabsContent>
      </Tabs>
    </StyleguideRow>
  </StyleguideSection>
);
