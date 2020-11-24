import useEventListener from '@use-it/event-listener';
import { useMutation } from 'graphql-hooks';
import { useRouter } from 'next/router';
import React, {
  ChangeEvent,
  RefObject,
  useContext,
  useEffect,
  useState,
} from 'react';
import { DeepMap, FieldError, useForm } from 'react-hook-form';
import { AuthContext } from '../auth/auth.util';
import { ConfirmEmailModal } from './confirm-email-modal';
import { Box } from './ui/box';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader } from './ui/loader';

const Form = Box.withComponent('form');
const INITIAL_INVITEE_AMOUNT = 2;
const MAX_INVITEE_AMOUNT = 50;

const CREATE_GROUP_MUTATION = `mutation CreateGroup($creator: UserInput!, $invitees: [UserInput]!) {
  createGroup(
    creator: $creator
    invitees: $invitees
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
}

const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

const FormSectionTitle: React.FC = ({ children }) => {
  return (
    <Box py={2} as="h2">
      {children}
    </Box>
  );
};

const FormError: React.FC<{
  errors: DeepMap<FormValues, FieldError>;
}> = ({ errors }) => {
  const hasDuplicateError =
    errors?.creator?.email?.message === 'duplicate' ||
    errors?.invitees?.some((error) => error?.email?.message === 'duplicate');
  const hasCreatorError = errors.creator?.email || errors.creator?.name;

  if (hasDuplicateError) {
    return (
      <Box color="secondary" paddingRight={2}>
        Please provide unique email addresses
      </Box>
    );
  }

  if (hasCreatorError) {
    <Box color="secondary" paddingRight={2}>
      {hasCreatorError
        ? 'Please input your name and email'
        : 'Please provide a name and email for at least 2 friends'}
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
  error?: DeepMap<Contact, FieldError>;
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
        name={`${field}.name`}
        flex={1}
        aria-label="Name"
        marginRight={[0, 2]}
        marginBottom={[2, 0]}
        borderColor={error?.name ? 'danger' : 'black'}
        placeholder={namePlaceholder}
        autoFocus={autoFocus}
        ref={(element: HTMLInputElement) => {
          register(element, { required });
          if (inputRef) {
            (inputRef as any).current = element;
          }
        }}
        onInput={onInput}
      />
      <Input
        name={`${field}.email`}
        type="email"
        aria-label="Email"
        borderColor={error?.email ? 'danger' : 'black'}
        flex={4}
        placeholder={emailPlaceholder}
        ref={register({
          required,
          pattern: emailRegex,
        })}
      />
    </Box>
  );
};

const PlaceholderContactField: React.FC = () => {
  return (
    <Box
      display="flex"
      marginBottom={3}
      p={2}
      color="textMuted"
      borderColor="muted"
      borderStyle="dashed"
      borderWidth={1}
    >
      Tip! More fields will appear as you add more friends
    </Box>
  );
};

export const CreateGroupForm = React.forwardRef<
  HTMLFormElement,
  {
    inputRef?: RefObject<HTMLInputElement>;
  }
>(({ inputRef }) => {
  const {
    register,
    handleSubmit,
    errors,
    formState: { isSubmitted },
    setValue,
    setError,
    getValues,
  } = useForm<FormValues>();
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [inviteeAmount, setInviteeAmount] = useState(INITIAL_INVITEE_AMOUNT);
  const [confirmCreator, setConfirmCreator] = useState<Contact | null>(null);
  const [createGroup] = useMutation<
    { createGroup: { slug: string } },
    FormValues
  >(CREATE_GROUP_MUTATION);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  useEventListener('beforeunload', (event) => {
    const hasEnteredInvitee = getValues().invitees[0].name;
    if (hasEnteredInvitee && !isSubmitted) {
      event.preventDefault();
      ((event as unknown) as Event).returnValue = true;
    }
  });

  const submitGroup = async () => {
    setIsSubmittingGroup(true);
    const { creator, invitees } = getValues();
    const { data } = await createGroup({
      variables: {
        creator,
        invitees: invitees.filter(
          (inv) => emailRegex.test(inv.email) && inv.name.trim().length > 0
        ),
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
      const fieldWithDuplicate =
        duplicateIndex === 0
          ? 'creator.email'
          : `invitees[${duplicateIndex - 1}].email`;

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
      setValue('creator.name' as any, user.name);
      setValue('creator.email' as any, user.email);
    }
  }, [user]);

  return (
    <>
      <Form id="create-group" onSubmit={handleSubmit(onSubmit)}>
        <FormSectionTitle>What's your name?</FormSectionTitle>
        <ContactField
          field="creator"
          error={errors.creator}
          required
          namePlaceholder="Your Name"
          emailPlaceholder="Your Email Address"
          register={register}
          inputRef={inputRef}
        />
        <FormSectionTitle>Invite your friends</FormSectionTitle>
        {new Array(inviteeAmount).fill(null).map((_, index) => (
          <ContactField
            key={index}
            field={`invitees[${index}]`}
            error={errors.invitees?.[index]}
            required={index < 2}
            namePlaceholder="Your Friend's Name"
            emailPlaceholder="Your Friend's Email Address"
            register={register}
            onInput={onInput(index)}
          />
        ))}
        {inviteeAmount === INITIAL_INVITEE_AMOUNT && (
          <PlaceholderContactField />
        )}
        <Box
          marginTop={4}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box marginRight={2}>
            <FormError errors={errors} />
          </Box>

          {isSubmittingGroup && !confirmCreator ? (
            <Loader type="bar" />
          ) : (
            <Button>Create</Button>
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
});
