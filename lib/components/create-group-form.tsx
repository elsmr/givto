import useForm from 'react-hook-form';
import { Box } from './ui/box';
import { Button } from './ui/button';
import { Input } from './ui/input';

const Form = Box.withComponent('form');

export const CreateGroupForm: React.FC = () => {
  const { register, handleSubmit, errors } = useForm();
  const onSubmit = console.log;

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Box m={0} py={2} as="h2">
        What's your name?
      </Box>
      <Box display="flex" marginBottom={3}>
        <Input
          name="creator-name"
          flex={1}
          marginRight={2}
          placeholder="Your Name"
          ref={register({ required: true })}
        />
        <Input
          name="creator-email"
          type="email"
          flex={4}
          placeholder="Your Email Address"
          ref={register({ required: true })}
        />
      </Box>
      <Box m={0} py={2} as="h2">
        Invite your friends
      </Box>
      <Box display="flex" marginBottom={3}>
        <Input
          name="invitee1-name"
          flex={1}
          marginRight={2}
          placeholder="A Friend's Name"
          ref={register({ required: true })}
        />
        <Input
          name="invitee1-name"
          type="email"
          flex={4}
          placeholder="A Friend's Email Address"
          ref={register({ required: true })}
        />
      </Box>
      <Box display="flex" marginBottom={3}>
        <Input
          flex={1}
          marginRight={2}
          placeholder="A Friend's Name"
          ref={register({ required: true })}
        />
        <Input
          type="email"
          flex={4}
          placeholder="A Friend's Email Address"
          ref={register({ required: true })}
        />
      </Box>
      <Box marginTop={4} display="flex" justifyContent="flex-end">
        <Box>{JSON.stringify(errors)}</Box>
        <Button>Create</Button>
      </Box>
    </Form>
  );
};
