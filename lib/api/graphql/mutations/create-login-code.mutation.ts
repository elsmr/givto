import qs from 'querystring';
import { Mutation } from '../../graphql-schema';

export const createLoginCode: Mutation<{
  email: string;
  name: string;
  redirectUrl?: string;
}> = async (
  _,
  { email, name, redirectUrl },
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
    const loginCode = await loginCodes.create(user._id, redirectUrl);
    const params = qs.encode({ email, code: loginCode });
    console.log('Sending email', loginCode, email);
    const result = redirectUrl
      ? await mailer.sendMail({
          to: { name: user.name, email: user.email },
          subject: 'Sign in to Givto',
          template: 'login-code',
          variables: {
            email,
            link: `https://givto.app/go?${params}`
          }
        })
      : await mailer.sendMail({
          to: { name: user.name, email: user.email },
          subject: 'Confirm your email address on Givto',
          template: 'confirm-email',
          variables: {
            code: loginCode
          }
        });

    console.log(result);
  }

  return true;
};
