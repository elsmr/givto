import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StyleguideRow, StyleguideSection } from './styleguide-section';

const badgeVariants = [
  'default',
  'yellow',
  'mint',
  'coral',
  'primary-muted',
] as const;

export const DisplaySection = () => (
  <StyleguideSection id="display" title="Cards, badges and avatars">
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Family Secret Santa</CardTitle>
          <CardDescription>Gift day 24 December · 6 people</CardDescription>
        </CardHeader>
        <CardContent>
          Everyone has added a wish. The draw is on 1 December.
        </CardContent>
        <CardFooter>
          <Button>Open</Button>
        </CardFooter>
      </Card>
      <Card className="bg-yellow shadow-brand">
        <CardHeader>
          <CardTitle>Your giftee is Cat</CardTitle>
          <CardDescription className="text-ink">
            Brand shadow, for the big reveal.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
    <StyleguideRow label="Badges">
      {badgeVariants.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </StyleguideRow>
    <StyleguideRow label="Avatars">
      <Avatar size="sm">
        <AvatarFallback>A</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>B</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>C</AvatarFallback>
      </Avatar>
      <AvatarGroup>
        {['D', 'E', 'F'].map((initial) => (
          <Avatar key={initial}>
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        ))}
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>
    </StyleguideRow>
  </StyleguideSection>
);
