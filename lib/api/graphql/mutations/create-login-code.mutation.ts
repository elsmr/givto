import { Mutation } from '../../graphql-schema';

export const createLoginCode: Mutation<{
  email: string;
  name?: string;
}> = async (
  _,
  { email, name },
  { dataSources: { users, loginCodes }, mailer }
): Promise<boolean> => {
  let user = await users.findByEmail(email);

  console.log('Initial user', user);

  if (!user) {
    console.log('no user found for', email);
    user = (await users.createUsers({ email, name: name || 'Anonymous' }))[0];
    console.log('created user', user);
  }

  if (user) {
    const loginCode = await loginCodes.create(user._id);
    console.log('Sending email', loginCode, email);
    const result = await mailer.sendMail({
      to: { name: user.name, email: user.email },
      subject: 'Your Temporary Givto Login Code',
      template: 'login-code',
      variables: {
        loginCode
      }
    });

    console.log(result);
  }

  return true;
};
