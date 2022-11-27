import useEventListener from '@use-it/event-listener';
import { useMutation } from 'graphql-hooks';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import React, {
  ChangeEvent,
  RefObject,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useForm, FieldErrors, FieldErrorsImpl } from 'react-hook-form';
import { AuthContext } from '../auth/auth.util';
import { ConfirmEmailModal } from './confirm-email-modal';
import { Box } from './ui/box';
import { Button, ButtonReset } from './ui/button';
import { Input } from './ui/input';
import { Loader } from './ui/loader';
import { Link } from './ui/link';
import css from '@styled-system/css';
import { IconButton } from './ui/icon-button';
import { Plus, Trash } from 'react-feather';
import { useTranslations } from 'next-intl';
import { Select } from './ui/select';
import { GroupSettingsInput, UserInput } from '../../api/graphql-schema';

const Form = Box.withComponent('form');
const INITIAL_INVITEE_AMOUNT = 2;
const MAX_INVITEE_AMOUNT = 50;
const MIN_INVITEE_AMOUNT_EXCEPTIONS = 4;

const CREATE_GROUP_MUTATION = `mutation CreateGroup($creator: UserInput!, $invitees: [UserInput]!, $settings: GroupSettingsInput) {
  createGroup(
    creator: $creator
    invitees: $invitees
    settings: $settings
  ) {
    slug
  }
}`;

interface Contact {
  name: string;
  email: string;
}

interface FormValues {
  creator: Contact;
  invitees: Contact[];
  locale: string;
  name: string;
  localeByEmail?: { locale: string }[];
  exclusions: {
    from: string;
    to: string;
  }[];
}

const emailRegex =
  /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

const FormError: React.FC<{
  errors: FieldErrors<FormValues>;
}> = ({ errors }) => {
  const t = useTranslations('create-group');
  const hasDuplicateError =
    errors.creator?.email?.message === 'duplicate' ||
    errors.invitees?.some?.((error) => error?.email?.message === 'duplicate');
  const hasCreatorError = errors.creator?.email || errors.creator?.name;

  if (hasDuplicateError) {
    return (
      <Box color="secondary" paddingRight={2}>
        {t('validation.duplicate')}
      </Box>
    );
  }

  if (hasCreatorError) {
    <Box color="secondary" paddingRight={2}>
      {hasCreatorError ? t('validation.creator') : t('validation.invitee')}
    </Box>;
  }

  return <Box color="secondary" paddingRight={2}></Box>;
};

interface ContactFieldProps {
  field: string;
  namePlaceholder: string;
  emailPlaceholder: string;
  register: Function;
  onInput?: (event: ChangeEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  required?: boolean;
  error?: FieldErrorsImpl<FormValues>['creator'];
  inputRef?: RefObject<HTMLInputElement>;
}

const ContactField: React.FC<ContactFieldProps> = ({
  field,
  emailPlaceholder,
  namePlaceholder,
  register,
  onInput,
  autoFocus,
  required,
  error,
  inputRef,
}) => {
  return (
    <Box display="flex" flexDirection={['column', 'row']} marginBottom={3}>
      <Input
        flex={1}
        aria-label="Name"
        marginRight={[0, 2]}
        marginBottom={[2, 0]}
        borderColor={error?.name && 'danger'}
        placeholder={namePlaceholder}
        autoFocus={autoFocus}
        ref={inputRef}
        {...register(`${field}.name`, { required })}
        onInput={onInput}
      />
      <Input
        type="email"
        aria-label="Email"
        borderColor={error?.email && 'danger'}
        flex={4}
        placeholder={emailPlaceholder}
        {...register(`${field}.email`, {
          required,
          pattern: emailRegex,
        })}
      />
    </Box>
  );
};

const PlaceholderContactField: React.FC = () => {
  const t = useTranslations('create-group');
  return (
    <Box
      display="flex"
      marginBottom={3}
      p={2}
      color="textMuted"
      borderColor="muted"
      borderStyle="dashed"
      borderWidth={1}
      borderRadius={8}
    >
      {t('more_invitees_hint')}
    </Box>
  );
};

export const CreateGroupForm: React.FunctionComponent<{
  inputRef?: RefObject<HTMLInputElement>;
}> = ({ inputRef }) => {
  const {
    register,
    handleSubmit,
    formState: { isSubmitted, errors },
    setValue,
    setError,
    getValues,
    watch,
  } = useForm<FormValues>();
  const router = useRouter();
  const { locale, locales = [] } = router;
  const { user } = useContext(AuthContext);
  const [inviteeAmount, setInviteeAmount] = useState(INITIAL_INVITEE_AMOUNT);
  const [confirmCreator, setConfirmCreator] = useState<Contact | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exclusionAmount, setExclusionAmount] = useState(0);
  const [localeByEmailEnabled, setLocaleByEmailEnabled] = useState(false);
  const [createGroup] = useMutation<
    { createGroup: { slug: string } },
    {
      creator: UserInput;
      invitees: UserInput[];
      settings?: GroupSettingsInput;
    }
  >(CREATE_GROUP_MUTATION);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const invitees = watch('invitees') ?? [];
  const creator = watch('creator');
  const exclusions = watch('exclusions') ?? [];
  const t = useTranslations('create-group');
  const participants = [creator, ...invitees].filter(
    (participant) =>
      participant && participant.name.trim() && participant.email.trim()
  );

  useEventListener('beforeunload', (event) => {
    const hasEnteredInvitee = getValues().invitees[0].name;
    if (hasEnteredInvitee && !isSubmitted) {
      event.preventDefault();
      event.returnValue = true;
    }
  });

  const submitGroup = async () => {
    setIsSubmittingGroup(true);
    const { creator, invitees, exclusions, locale, localeByEmail, name } =
      getValues();
    const { data } = await createGroup({
      variables: {
        creator,
        invitees: invitees.filter(
          (inv) => emailRegex.test(inv.email) && inv.name.trim().length > 0
        ),
        settings: {
          name,
          exclusions,
          locale,
          locales:
            localeByEmail?.map(({ locale }, i) => ({
              locale,
              email: participants[i].email,
            })) ?? [],
        },
      },
    });
    if (data) {
      await router.push(`/g/${data.createGroup.slug}`);
      setIsSubmittingGroup(false);
      setConfirmCreator(null);
    }
  };

  const onSubmit = async ({ creator, invitees }: FormValues) => {
    const allUsers = [creator, ...invitees];
    const emailUserMap = allUsers.reduce(
      (acc, user) => ({ ...acc, [user.email]: (acc[user.email] || 0) + 1 }),
      {} as Record<string, number>
    );
    const duplicateEmails = Object.keys(emailUserMap).filter(
      (email) => emailUserMap[email] > 1
    );

    if (duplicateEmails.length > 0) {
      const duplicateIndex = allUsers.findIndex(
        (user) => user.email === duplicateEmails[0]
      );
      const fieldWithDuplicate: 'creator.email' | `invitees.${number}.email` =
        duplicateIndex === 0
          ? 'creator.email'
          : `invitees.${duplicateIndex - 1}.email`;

      setError(fieldWithDuplicate, { type: 'validate', message: 'duplicate' });
      return;
    }
    if (user) {
      submitGroup();
    } else {
      setConfirmCreator(creator);
    }
  };

  const onInput = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    if (
      event.target.value &&
      index === inviteeAmount - 1 &&
      inviteeAmount < MAX_INVITEE_AMOUNT
    ) {
      setInviteeAmount(inviteeAmount + 1);
    }
  };

  useEffect(() => {
    if (user) {
      setValue('creator.name', user.name);
      setValue('creator.email', user.email);
    }
  }, [user]);

  return (
    <>
      <Form id="create-group" onSubmit={handleSubmit(onSubmit)}>
        {!user && (
          <Box mb={4}>
            <ContactField
              field="creator"
              error={errors.creator}
              required
              namePlaceholder={t('name')}
              emailPlaceholder={t('email')}
              register={register}
              inputRef={inputRef}
            />
          </Box>
        )}
        {new Array(inviteeAmount).fill(null).map((_, index) => (
          <ContactField
            key={index}
            field={`invitees[${index}]`}
            error={errors.invitees?.[index]}
            required={index < 2}
            namePlaceholder={t('invite-name')}
            emailPlaceholder={t('invite-email')}
            register={register}
            onInput={onInput(index)}
          />
        ))}
        {inviteeAmount === INITIAL_INVITEE_AMOUNT && (
          <PlaceholderContactField />
        )}

        {showAdvanced && (
          <Box my={4}>
            <Box as="h3" mb={2}>
              {t('advanced-title')}
            </Box>
            <Box my={3}>
              <Box display="flex" alignItems="center" as="label">
                <Box as="span" mr={2}>
                  {t('group-name')}
                </Box>
                <Input
                  {...register('name')}
                  placeholder={t('group-name-placeholder', {
                    name: creator.name,
                  })}
                />
              </Box>
            </Box>
            <Box my={3}>
              <Box as="h4" my={2}>
                {t('exclusions.title')}
              </Box>
              {participants.length >= MIN_INVITEE_AMOUNT_EXCEPTIONS ? (
                <Box>
                  <Box as="p" mt={2} mb={3}>
                    {t('exclusions.description', {
                      count: participants.length,
                      max: participants.length - 3,
                    })}
                  </Box>
                  {new Array(exclusionAmount).fill(null).map((_, index) => (
                    <Box key={index} display="flex" alignItems="center" my={2}>
                      <Select {...register(`exclusions.${index}.from`)}>
                        {participants.map((participant, i) => (
                          <option
                            key={participant.email}
                            value={participant.email}
                          >
                            {participant.name} ({participant.email})
                          </option>
                        ))}
                      </Select>

                      <Box mx={3}>{t('and')}</Box>

                      <Select {...register(`exclusions.${index}.to`)}>
                        {participants
                          .filter(
                            (participant) =>
                              exclusions[index]?.from !== participant.email
                          )
                          .map((participant) => (
                            <option
                              key={participant.email}
                              value={participant.email}
                            >
                              {participant.name} ({participant.email})
                            </option>
                          ))}
                      </Select>

                      {index === exclusionAmount - 1 && (
                        <Box ml={3}>
                          <IconButton
                            bg="danger"
                            color="black"
                            size="small"
                            onClick={() => {
                              setValue(`exclusions`, exclusions.slice(0, -1));
                              setExclusionAmount((prev) => prev - 1);
                            }}
                          >
                            <Trash size={16} />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  ))}
                  {exclusionAmount < participants.length - 3 && (
                    <IconButton
                      flexShrink={0}
                      display="flex"
                      type="button"
                      mt={2}
                      alignItems="center"
                      onClick={() => {
                        setExclusionAmount((prev) => prev + 1);
                      }}
                    >
                      <Plus size={16} />
                      <Box fontSize={2} px={2}>
                        {t('exclusions.add')}
                      </Box>
                    </IconButton>
                  )}
                </Box>
              ) : (
                <Box as="p">{t('exclusions.unavailable')}</Box>
              )}
            </Box>
            <Box my={3}>
              <Box as="h4" mt={4} mb={2}>
                {t('language.title')}
              </Box>
              {invitees.length > 0 && (
                <Box display="block" my={2} as="label">
                  <Box
                    as="input"
                    type="checkbox"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const { checked } = event.target;
                      if (!checked) {
                        setValue('localeByEmail', []);
                      }
                      setLocaleByEmailEnabled(checked);
                    }}
                  ></Box>
                  {t('language_by_email')}
                </Box>
              )}
              {!localeByEmailEnabled ? (
                <Box display="flex" alignItems="center">
                  <Select defaultValue={locale} {...register('locale')}>
                    {locales.map((l) => (
                      <option key={l} value={l}>
                        {t('lang', { locale: l })}
                      </option>
                    ))}
                  </Select>
                </Box>
              ) : (
                participants.map((participant, index) => (
                  <Box
                    key={participant.email}
                    my={2}
                    display="flex"
                    alignItems="center"
                  >
                    <Box>
                      {participant.name} ({participant.email}){' '}
                    </Box>
                    <Select
                      ml={3}
                      defaultValue={locale}
                      {...register(`localeByEmail.${index}.locale`)}
                    >
                      {locales.map((l) => (
                        <option key={l} value={l}>
                          {t('lang', { locale: l })}
                        </option>
                      ))}
                    </Select>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )}

        <FormError errors={errors} />
        <Box
          marginTop={2}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box marginRight={2}>
            <ButtonReset
              color="textMuted"
              type="button"
              fontSize={1}
              css={css({
                textDecoration: 'underline',
                '&:hover, &:focus': {
                  color: 'primary',
                },
              })}
              onClick={() => setShowAdvanced((prev) => !prev)}
            >
              {showAdvanced ? t('hide-advanced') : t('show-advanced')}
            </ButtonReset>
          </Box>

          {isSubmittingGroup && !confirmCreator ? (
            <Loader type="bar" />
          ) : (
            <Button>{t('create')}</Button>
          )}
        </Box>
      </Form>
      {confirmCreator && (
        <ConfirmEmailModal
          onConfirm={submitGroup}
          onClose={() => setConfirmCreator(null)}
          email={confirmCreator.email}
          name={confirmCreator.name}
        />
      )}
    </>
  );
};
