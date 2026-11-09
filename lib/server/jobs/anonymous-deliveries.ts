import { AnswerEmail, answerSubject } from '../../../emails/answer';
import { PsstEmail, psstSubject } from '../../../emails/psst';
import { QuestionEmail, questionSubject } from '../../../emails/question';
import { siteUrl } from '../../../emails/ui/site';
import type { Collections } from '../db';
import { isAfterDrawOpen } from '../between/santa-role';
import { sendNotice } from '../mail/notice';
import { memberRecipient } from '../mail/recipients';
import { groupUrl } from '../mail/urls';
import { visibleWishes } from '../wishlist/wish-view';
import { editionContext } from './edition-context';
import { runEach } from './run-each';

// Psst!s and questions (30, 52) were given a fixed-time slot by S3 (`sendAfter` /
// `notifyAfter`, lib/anonymous-delay); they go out once that slot has passed. The emails
// carry nothing about the Santa and come from the same address as every other email.

const BATCH = 200;

export const deliverAnonymousMessages = async (db: Collections, now: Date) => {
  const context = editionContext(db);
  const due = { $lte: now };

  const nudges = await db.nudges.find({ sendAfter: due, sentAt: { $exists: false } }).limit(BATCH).toArray();
  const psst = await runEach('psst', nudges, async (nudge) => {
    const found = await context(nudge.editionId);
    const giftee = found?.group.members.find((m) => m.id === nudge.gifteeMemberId);
    const to = found && giftee && isAfterDrawOpen(found.edition) && (await memberRecipient(db, found.group, giftee));
    // "Add some ideas" is moot once there are wishes; the in-app notice drops it too.
    const moot = nudge.kind === 'emptyWishlist' && giftee && (await visibleWishes(db, giftee)).length > 0;
    const result = to && !moot
      ? await sendNotice(db, {
          key: `psst:${nudge._id}`,
          kind: 'psst',
          to,
          category: 'santaMessages',
          editionId: nudge.editionId,
          memberId: nudge.gifteeMemberId,
          render: (unsubscribe) => {
            const url = to.forName ? groupUrl(to.locale, found.group.slug) : siteUrl(to.locale, '/wishlist');
            const props = { locale: to.locale, group: found.group.name, url, forName: to.forName, unsubscribe, kind: nudge.kind };
            return { subject: psstSubject(props), body: PsstEmail(props) };
          },
        })
      : 'skipped';
    await db.nudges.updateOne({ _id: nudge._id }, { $set: { sentAt: now } });
    return result;
  });

  const asked = await db.questions.find({ notifyAfter: due, notifiedAt: { $exists: false } }).limit(BATCH).toArray();
  const questions = await runEach('question', asked, async (question) => {
    const found = await context(question.editionId);
    const giftee = found?.group.members.find((m) => m.id === question.gifteeMemberId);
    const to = found && giftee && isAfterDrawOpen(found.edition) && (await memberRecipient(db, found.group, giftee));
    const result = to
      ? await sendNotice(db, {
          key: `question:${question._id}`,
          kind: 'question',
          to,
          category: 'santaMessages',
          editionId: question.editionId,
          memberId: question.gifteeMemberId,
          render: (unsubscribe) => {
            const props = { locale: to.locale, group: found.group.name, url: groupUrl(to.locale, found.group.slug), forName: to.forName, unsubscribe, question: question.text };
            return { subject: questionSubject(props), body: QuestionEmail(props) };
          },
        })
      : 'skipped';
    await db.questions.updateOne({ _id: question._id }, { $set: { notifiedAt: now } });
    return result;
  });

  const answered = await db.questions
    .find({ 'answer.notifyAfter': due, 'answer.notifiedAt': { $exists: false } })
    .limit(BATCH)
    .toArray();
  const answers = await runEach('answer', answered, async (question) => {
    const found = await context(question.editionId);
    const santa = found?.group.members.find((m) => m.id === question.askerMemberId);
    const to = found && santa && question.answer && (await memberRecipient(db, found.group, santa));
    const answer = question.answer?.text ?? '';
    const result = to
      ? await sendNotice(db, {
          key: `answer:${question._id}`,
          kind: 'answer',
          to,
          category: 'wishlistUpdates',
          editionId: question.editionId,
          memberId: question.askerMemberId,
          render: (unsubscribe) => {
            const props = { locale: to.locale, group: found.group.name, url: groupUrl(to.locale, found.group.slug), forName: to.forName, unsubscribe, question: question.text, answer };
            return { subject: answerSubject(props), body: AnswerEmail(props) };
          },
        })
      : 'skipped';
    await db.questions.updateOne({ _id: question._id }, { $set: { 'answer.notifiedAt': now } });
    return result;
  });

  return { psst, questions, answers };
};
