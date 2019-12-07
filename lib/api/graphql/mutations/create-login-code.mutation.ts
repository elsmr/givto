import { Mutation } from '../../graphql-schema';

export const createLoginCode: Mutation<{ email: string }> = async (
  _,
  { email },
  { dataSources: { users, loginCodes }, mailer }
): Promise<boolean> => {
  let user = await users.findByEmail(email);

  if (!user) {
    user = (await users.createUsers({ email, name: 'Anonymous' }))[0];
  }
  console.log(user);

  if (user) {
    const loginCode = await loginCodes.create(user._id);
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
