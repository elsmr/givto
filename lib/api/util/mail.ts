import { MongoLoginCodes, MongoUser } from '../data-sources/mongo';
import { UserInput } from '../graphql-schema';
import { Mailer } from '../mail';

export const sendInviteEmails = async (
  slug: string,
  users: MongoUser[],
  creator: UserInput,
  mailer: Mailer,
  loginCodes: MongoLoginCodes
) => {
  const mailPromises: Promise<any>[] = [];

  for (const user of users) {
    const inviteCode = await loginCodes.create(user._id, true);
    mailPromises.push(
      mailer.sendMail({
        from: { name: `${creator.name} via Givto` },
        to: user,
        subject: `You've been invited to a Secret Santa by ${creator.name}!`,
        template: 'invite',
        variables: {
          creator: creator.name,
          link: `https://givto.app/g/${slug}?invite=${inviteCode}`
        }
      })
    );
  }
  console.log('waiting for emails...');
  await Promise.all(mailPromises);
  console.log('emails done');
};
