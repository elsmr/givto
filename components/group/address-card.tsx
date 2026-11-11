import { AddressForm, AddressLines, addressSummary, useAddressMutationOptions } from '@/components/account/address-book';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { StatCard } from '@/components/ui/stat-card';
import { useTRPC, useTRPCClient } from '@/lib/client/trpc';
import { MAX_ADDRESSES, type PostalAddress } from '@/lib/schema/user';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Mailbox } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';

type EditionInput = { groupSlug: string; editionNumber: number };

/**
 * "Your address" on the overview (80), in editions that send gifts by post: where my Santa sends my gift,
 * picked from my address book for this group. A new address goes to the book and is picked here.
 */
export const AddressCard = ({ groupSlug }: { groupSlug: string }) => {
  const t = useTranslations('group.address');
  const tAccount = useTranslations('account.address');
  const trpc = useTRPC();
  const client = useTRPCClient();
  const options = useAddressMutationOptions();
  const [mode, setMode] = useState<'view' | 'pick' | 'add'>('view');
  const mine = useQuery(trpc.address.mine.queryOptions({ groupSlug }));
  const book = useQuery(trpc.account.addresses.queryOptions());
  const [pickedId, setPickedId] = useState('');
  const close = () => setMode('view');
  const pick = useMutation(trpc.address.pick.mutationOptions(options(t('picked'), close)));
  const addAndPick = useMutation({
    mutationFn: async (address: PostalAddress) => {
      const { id } = await client.account.addAddress.mutate({ address });
      await client.address.pick.mutate({ groupSlug, addressId: id });
    },
    ...options(tAccount('saved'), close),
  });

  if (mine.isPending || book.isPending) return null;
  const current = mine.data?.address;
  const { addresses = [], defaultAddressId = null } = book.data ?? {};

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Mailbox} tone="yellow">
          {t('title')}
        </IconCardTitle>
        <CardDescription>{t('private')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!current || mode === 'add' ? (
          <AddressForm busy={addAndPick.isPending} onSubmit={(address) => addAndPick.mutate(address)} onCancel={current ? close : undefined} />
        ) : mode === 'pick' ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              pick.mutate({ groupSlug, addressId: pickedId });
            }}
          >
            <Field>
              <FieldLabel htmlFor="address-pick">{t('pick-label')}</FieldLabel>
              <NativeSelect id="address-pick" value={pickedId} onChange={(event) => setPickedId(event.target.value)}>
                {addresses.map((address) => (
                  <NativeSelectOption key={address.id} value={address.id}>
                    {address.id === defaultAddressId ? t('default-option', { address: addressSummary(address) }) : addressSummary(address)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={pick.isPending}>
                {t('use')}
              </Button>
              {addresses.length < MAX_ADDRESSES && (
                <Button type="button" variant="neutral" onClick={() => setMode('add')}>
                  {t('add-new')}
                </Button>
              )}
              <Button type="button" variant="neutral" onClick={close}>
                {tAccount('cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="font-semibold">{t('sending-to')}</p>
            <AddressLines address={current} />
            <Button
              variant="neutral"
              className="self-start"
              onClick={() => {
                setPickedId(current.id);
                setMode('pick');
              }}
            >
              {t('change')}
            </Button>
          </div>
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
