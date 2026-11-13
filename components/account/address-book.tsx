import { LoadFailed } from '@/components/shell/load-failed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { countryCodes, type CountryCode } from '@/lib/countries';
import { MAX_ADDRESSES, type PostalAddress } from '@/lib/schema/user';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

/** The WaitingCard's "Add your address" focuses this field. */
export const ADDRESS_FIELD_ID = 'address-line1';

const browserCountry = (): CountryCode | '' => {
  const region = typeof navigator === 'undefined' ? undefined : new Intl.Locale(navigator.language).maximize().region;
  return countryCodes.find((code) => code === region) ?? '';
};

/** One line, to tell addresses apart in lists and pickers. */
export const addressSummary = (address: PostalAddress) => `${address.lines[0]}, ${address.postalCode} ${address.city}`;

export const AddressLines = ({ address, name }: { address: PostalAddress; name?: string }) => {
  const locale = useLocale();
  const country = new Intl.DisplayNames([locale], { type: 'region' }).of(address.country);
  const lines = [address.recipient ?? name, ...address.lines, `${address.postalCode} ${address.city}`, address.region, country];
  return <address className="whitespace-pre-line not-italic">{lines.filter(Boolean).join('\n')}</address>;
};

type AddressFormProps = { initial?: PostalAddress; busy: boolean; onSubmit: (address: PostalAddress) => void; onCancel?: () => void };

export const AddressForm = ({ initial, busy, onSubmit, onCancel }: AddressFormProps) => {
  const t = useTranslations('account.address');
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
      <FieldLabel htmlFor={key === 'line1' ? ADDRESS_FIELD_ID : `address-${key}`} optional={!required}>
        {label}
      </FieldLabel>
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

/** Options for any address mutation: a toast, and fresh address book and group addresses after. */
export const useAddressMutationOptions = () => {
  const t = useTranslations('account');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return (saved: string, onSuccess?: () => void) => ({
    onSuccess: () => {
      onSuccess?.();
      toast.add({ title: saved });
    },
    onError: () => toast.add({ title: t('errors.generic'), type: 'error' as const }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.account.addresses.queryKey() }),
        queryClient.invalidateQueries(trpc.address.pathFilter()),
      ]),
  });
};

/** /account (80): the address book. Groups post to the default unless one is picked there; only the Santa in a by-post Secret Santa sees it. */
export const AddressBook = () => {
  const t = useTranslations('account.address');
  const tErrors = useTranslations('account.errors');
  const trpc = useTRPC();
  const options = useAddressMutationOptions();
  // The address being edited, 'new' for the add form: one form at a time.
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const book = useQuery(trpc.account.addresses.queryOptions());
  const close = () => setEditing(null);
  const add = useMutation(trpc.account.addAddress.mutationOptions(options(t('saved'), close)));
  const update = useMutation(trpc.account.updateAddress.mutationOptions(options(t('saved'), close)));
  const remove = useMutation(trpc.account.removeAddress.mutationOptions(options(t('removed'))));
  const makeDefault = useMutation(trpc.account.setDefaultAddress.mutationOptions(options(t('default-saved'))));

  if (book.isPending) return <Skeleton className="h-16" />;
  if (book.isError) return <LoadFailed message={tErrors('generic')} onRetry={() => void book.refetch()} />;
  const { addresses = [], defaultAddressId = null } = book.data ?? {};

  return (
    <>
      {addresses.length > 0 && (
        <ul className="flex flex-col gap-3">
          {addresses.map(({ id, ...address }) => (
            <li key={id} className="flex flex-col gap-3 border-2 border-outline p-3">
              {editing === id ? (
                <AddressForm initial={address} busy={update.isPending} onSubmit={(next) => update.mutate({ id, address: next })} onCancel={close} />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <AddressLines address={address} />
                    {id === defaultAddressId && <Badge variant="mint">{t('default')}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="neutral" aria-label={`${t('edit')}: ${addressSummary(address)}`} onClick={() => setEditing(id)}>
                      {t('edit')}
                    </Button>
                    {id !== defaultAddressId && (
                      <Button
                        variant="neutral"
                        disabled={makeDefault.isPending}
                        aria-label={`${t('make-default')}: ${addressSummary(address)}`}
                        onClick={() => makeDefault.mutate({ id })}
                      >
                        {t('make-default')}
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      disabled={remove.isPending}
                      aria-label={`${t('remove')}: ${addressSummary(address)}`}
                      onClick={() => remove.mutate({ id })}
                    >
                      {t('remove')}
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing === 'new' ? (
        <AddressForm busy={add.isPending} onSubmit={(address) => add.mutate({ address })} onCancel={close} />
      ) : (
        addresses.length < MAX_ADDRESSES && (
          <Button className="self-start" onClick={() => setEditing('new')}>
            {t('add')}
          </Button>
        )
      )}
    </>
  );
};
