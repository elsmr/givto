import { Mutation } from '../../graphql-schema';

export const createLoginCode: Mutation<{ email: string }> = async (
  _,
  { email },
  { dataSources: { users, loginCodes }, mailer }
): Promise<boolean> => {
  const user = await users.findByEmail(email);

  if (user) {
    const loginCode = await loginCodes.create(user.email);
    mailer.sendMail({
      to: { name: user.name, email: user.email },
      subject: 'Your Temporary Givto Login Code',
      template: 'login-code',
      variables: {
        loginCode
      }
    });
  }

  return true;
};
