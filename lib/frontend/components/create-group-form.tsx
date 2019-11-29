import { useMutation } from 'graphql-hooks';
import { useRouter } from 'next/router';
import { ChangeEvent, useState } from 'react';
import useForm from 'react-hook-form';
import { FieldError } from 'react-hook-form/dist/types';
import { LoginModal } from './login-modal';
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

type Errors = Partial<Record<string, FieldError>>;

const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

const FormSectionTitle: React.FC = ({ children }) => {
  return (
    <Box py={2} as="h2">
      {children}
    </Box>
  );
};

const FormError: React.FC<{
  errors: Errors;
}> = ({ errors }) => {
  const errorFields = Object.keys(errors);
  const hasError = errorFields.length > 0;
  const hasCreatorError = errorFields.some(key => key.startsWith('creator'));

  return (
    <Box color="secondary" paddingRight={2}>
      {hasError
        ? hasCreatorError
          ? 'Please input your name and email'
          : 'Please provide a name and email for at least 2 friends'
        : ''}
    </Box>
  );
};

interface ContactFieldProps {
  id: string;
  namePlaceholder: string;
  emailPlaceholder: string;
  register: Function;
  onInput?: (event: ChangeEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  required?: boolean;
  errors: Errors;
}

const ContactField: React.FC<ContactFieldProps> = ({
  id,
  emailPlaceholder,
  namePlaceholder,
  register,
  onInput,
  autoFocus,
  required,
  errors
}) => {
  return (
    <Box display="flex" flexDirection={['column', 'row']} marginBottom={3}>
      <Input
        name={`${id}.name`}
        flex={1}
        aria-label="Name"
        marginRight={[0, 2]}
        marginBottom={[2, 0]}
        borderColor={errors[`${id}.name`] ? 'danger' : 'black'}
        placeholder={namePlaceholder}
        autoFocus={autoFocus}
        ref={register({ required })}
        onInput={onInput}
      />
      <Input
        name={`${id}.email`}
        type="email"
        aria-label="Email"
        borderColor={errors[`${id}.email`] ? 'danger' : 'black'}
        flex={4}
        placeholder={emailPlaceholder}
        ref={register({
          required,
          pattern: emailRegex
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

export const CreateGroupForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    errors,
    getValues,
    formState: { isSubmitting }
  } = useForm<FormValues>();
  const [inviteeAmount, setInviteeAmount] = useState(INITIAL_INVITEE_AMOUNT);
  const [slugToConfirm, setSlugToConfirm] = useState('');
  const [createGroup] = useMutation<
    { createGroup: { slug: string } },
    FormValues
  >(CREATE_GROUP_MUTATION);
  const router = useRouter();

  const onSubmit = async ({ creator, invitees }: FormValues) => {
    const result = await createGroup({
      variables: {
        creator,
        invitees: invitees.filter(
          inv => emailRegex.test(inv.email) && inv.name.trim().length > 0
        )
      }
    });
    setSlugToConfirm(result.data.createGroup.slug);
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

  const onLogin = () => {
    router.push(`/g/${slugToConfirm}`);
    setSlugToConfirm('');
  };

  const onClose = () => {
    setSlugToConfirm('');
  };

  return (
    <>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormSectionTitle>What's your name?</FormSectionTitle>
        <ContactField
          id="creator"
          required
          autoFocus
          namePlaceholder="Your Name"
          emailPlaceholder="Your Email Address"
          register={register}
          errors={errors}
        />
        <FormSectionTitle>Invite your friends</FormSectionTitle>
        {new Array(inviteeAmount).fill(null).map((_, index) => (
          <ContactField
            key={index}
            id={`invitees[${index}]`}
            required={index < 2}
            namePlaceholder="Your Friend's Name"
            emailPlaceholder="Your Friend's Email Address"
            register={register}
            onInput={onInput(index)}
            errors={errors}
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
          <Box>
            {isSubmitting && <Loader type="bar" />}
            <FormError errors={errors} />
          </Box>

          <Button>Create</Button>
        </Box>
      </Form>
      {slugToConfirm && (
        <LoginModal
          email={getValues({ nest: true }).creator.email}
          onLogin={onLogin}
          onClose={onClose}
        ></LoginModal>
      )}
    </>
  );
};
