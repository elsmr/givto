import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { StatCard } from '@/components/ui/stat-card';
import { toast } from '@/components/ui/toast';
import { useErrorMessage } from '@/components/wishlist/use-error-message';
import { useTRPC } from '@/lib/client/trpc';
import { countryCodes, type CountryCode } from '@/lib/countries';
import type { PostalAddress } from '@/lib/schema/edition';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mailbox } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

type EditionInput = { groupSlug: string; editionNumber: number };

/** The WaitingCard's "Add your address" focuses this field. */
export const ADDRESS_FIELD_ID = 'address-line1';

const browserCountry = (): CountryCode | '' => {
  const region = typeof navigator === 'undefined' ? undefined : new Intl.Locale(navigator.language).maximize().region;
  return countryCodes.find((code) => code === region) ?? '';
};

const AddressLines = ({ address, name }: { address: PostalAddress; name?: string }) => {
  const locale = useLocale();
  const country = new Intl.DisplayNames([locale], { type: 'region' }).of(address.country);
  const lines = [address.recipient ?? name, ...address.lines, `${address.postalCode} ${address.city}`, address.region, country];
  return <address className="whitespace-pre-line not-italic">{lines.filter(Boolean).join('\n')}</address>;
};

type AddressFormProps = { initial: PostalAddress | null; busy: boolean; onSubmit: (address: PostalAddress) => void; onCancel?: () => void };

const AddressForm = ({ initial, busy, onSubmit, onCancel }: AddressFormProps) => {
  const t = useTranslations('group.address');
  const locale = useLocale();
  const [draft, setDraft] = useState(() => ({
    recipient: initial?.recipient ?? '',
    line1: initial?.lines[0] ?? '',
    line2: initial?.lines[1] ?? '',
    postalCode: initial?.postalCode ?? '',
    city: initial?.city ?? '',
    region: initial?.region ?? '',
    country: initial?.country ?? browserCountry(),
  }));
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const countries = countryCodes
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .toSorted((a, b) => a.name.localeCompare(b.name, locale));

  const field = (key: Exclude<keyof typeof draft, 'country'>, label: string, autoComplete: string, required: boolean) => (
    <Field>
      <FieldLabel htmlFor={key === 'line1' ? ADDRESS_FIELD_ID : `address-${key}`}>{label}</FieldLabel>
      <Input
        id={key === 'line1' ? ADDRESS_FIELD_ID : `address-${key}`}
        autoComplete={autoComplete}
        required={required}
        maxLength={100}
        value={draft[key]}
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
      />
    </Field>
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.country) return;
    onSubmit({
      ...(draft.recipient.trim() && { recipient: draft.recipient }),
      lines: [draft.line1, draft.line2].filter((line) => line.trim()),
      postalCode: draft.postalCode,
      city: draft.city,
      ...(draft.region.trim() && { region: draft.region }),
      country: draft.country,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {field('recipient', t('recipient'), 'name', false)}
      {field('line1', t('line1'), 'address-line1', true)}
      {field('line2', t('line2'), 'address-line2', false)}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {field('postalCode', t('postal-code'), 'postal-code', true)}
        {field('city', t('city'), 'address-level2', true)}
      </div>
      {field('region', t('region'), 'address-level1', false)}
      <Field>
        <FieldLabel htmlFor="address-country">{t('country')}</FieldLabel>
        <NativeSelect
          id="address-country"
          autoComplete="country"
          required
          value={draft.country}
          onChange={(event) => setDraft({ ...draft, country: event.target.value as CountryCode })}
        >
          <NativeSelectOption value="">{t('choose-country')}</NativeSelectOption>
          {countries.map(({ code, name }) => (
            <NativeSelectOption key={code} value={code}>
              {name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {t('save')}
        </Button>
        {onCancel && (
          <Button type="button" variant="neutral" onClick={onCancel}>
            {t('cancel')}
          </Button>
        )}
      </div>
    </form>
  );
};

/** "Your address" on the overview (80), in editions that send gifts by post: only my Santa sees it, from the draw on. */
export const AddressCard = (input: EditionInput) => {
  const t = useTranslations('group.address');
  const errorMessage = useErrorMessage();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const mine = useQuery(trpc.address.mine.queryOptions(input));
  const options = (saved: string) => ({
    onSuccess: () => {
      setEditing(false);
      toast.add({ title: saved, type: 'success' as const });
    },
    onError: (error: unknown) => toast.add({ title: errorMessage(error), type: 'error' as const }),
    onSettled: () => queryClient.invalidateQueries(trpc.address.pathFilter()),
  });
  const save = useMutation(trpc.address.set.mutationOptions(options(t('saved'))));
  const clear = useMutation(trpc.address.clear.mutationOptions(options(t('removed'))));

  if (mine.isPending) return null;
  const address = mine.data ?? null;

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Mailbox} tone="yellow">
          {t('title')}
        </IconCardTitle>
        <CardDescription>{t('private')}</CardDescription>
      </CardHeader>
      <CardContent>
        {address && !editing ? (
          <div className="flex flex-col gap-4">
            <AddressLines address={address} />
            <div className="flex flex-wrap gap-3">
              <Button variant="neutral" onClick={() => setEditing(true)}>
                {t('change')}
              </Button>
              <Button variant="neutral" disabled={clear.isPending} onClick={() => clear.mutate(input)}>
                {t('remove')}
              </Button>
            </div>
          </div>
        ) : (
          <AddressForm
            initial={address}
            busy={save.isPending}
            onSubmit={(next) => save.mutate({ ...input, address: next })}
            onCancel={address ? () => setEditing(false) : undefined}
          />
        )}
      </CardContent>
    </Card>
  );
};

/** "Post it to" on the giftee tab (80): my giftee's address, or that they haven't added one yet. */
export const GifteeAddressCard = (input: EditionInput) => {
  const t = useTranslations('group.address');
  const trpc = useTRPC();
  const giftee = useQuery(trpc.address.giftee.queryOptions(input));

  if (!giftee.data) return null;
  const { name, address } = giftee.data;
  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Mailbox} tone="yellow">
          {t('post-to')}
        </IconCardTitle>
      </CardHeader>
      <CardContent>{address ? <AddressLines address={address} name={name} /> : <p>{t('giftee-missing', { name })}</p>}</CardContent>
    </Card>
  );
};

/** Organizer (80): how many people added their address, and who hasn't. Never an address. */
export const MissingAddressesStat = (input: EditionInput) => {
  const t = useTranslations('group.stats');
  const format = useFormatter();
  const trpc = useTRPC();
  const missing = useQuery(trpc.address.missing.queryOptions(input));

  if (!missing.data) return null;
  const { people, missing: names } = missing.data;
  return (
    <StatCard
      icon={Mailbox}
      tone="yellow"
      title={t('addresses')}
      value={`${people - names.length}/${people}`}
      unit={names.length > 0 ? t('addresses-missing', { names: format.list(names) }) : t('addresses-all')}
    />
  );
};
