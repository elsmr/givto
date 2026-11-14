import { LoadFailed } from '@/components/shell/load-failed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardDivider, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { isInBudget } from '@/components/wishlist/format-price';
import { WishCard } from '@/components/wishlist/wish-card';
import { useTRPC, type RouterOutputs } from '@/lib/client/trpc';
import { useFocusAfterEdit } from '@/lib/client/use-focus-after-edit';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, StickyNote, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { EditionInput } from './edition-input';
import { TipForm } from './tip-form';
import { useBetweenError } from './use-between-error';

type BoardsView = NonNullable<RouterOutputs['board']['list']>;
type BoardView = BoardsView['boards'][number];
type PostView = BoardView['posts'][number];

const useInvalidateBoards = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: trpc.board.pathKey() });
};

const Post = ({ input, post, name, canEdit }: { input: EditionInput; post: PostView; name: string; canEdit: boolean }) => {
  const t = useTranslations('between.boards');
  const errorMessage = useBetweenError();
  const trpc = useTRPC();
  const onSettled = useInvalidateBoards();
  const [editing, setEditing] = useState(false);
  const editButton = useFocusAfterEdit(editing);
  const update = useMutation(trpc.board.update.mutationOptions({ onSuccess: () => setEditing(false), onSettled }));
  const remove = useMutation(
    trpc.board.delete.mutationOptions({
      onSuccess: () => toast.add({ title: t('deleted'), type: 'success' }),
      onError: (error) => toast.add({ title: errorMessage(error), type: 'error' }),
      onSettled,
    })
  );
  const author = post.mine ? t('post-yours') : post.author ? t('post-from', { name: post.author.name }) : t('post-anonymous');

  return (
    <li className="flex flex-col gap-2 border-b-2 border-outline pb-3 last:border-b-0">
      {editing ? (
        <TipForm
          copy="boards"
          initial={{ aboutMemberId: '', text: post.text, anonymous: post.anonymous }}
          submitLabel={t('save')}
          busy={update.isPending}
          error={update.error ? errorMessage(update.error) : undefined}
          onSubmit={({ text, anonymous }) => update.mutate({ ...input, postId: post.id, text, anonymous })}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <p className="break-words whitespace-pre-line">{post.text}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">{author}</span>
            {post.mine && post.anonymous && <Badge>{t('anonymous-badge')}</Badge>}
            {post.mine && canEdit && (
              <>
                <Button ref={editButton} variant="neutral" size="sm" aria-label={t('edit-label', { name })} onClick={() => setEditing(true)}>
                  <Pencil aria-hidden="true" />
                  {t('edit')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  aria-label={t('delete-label', { name })}
                  onClick={() => remove.mutate({ ...input, postId: post.id })}
                >
                  <Trash2 aria-hidden="true" />
                  {t('delete')}
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </li>
  );
};

const Board = ({ input, board, view }: { input: EditionInput; board: BoardView; view: BoardsView }) => {
  const t = useTranslations('between.boards');
  const errorMessage = useBetweenError();
  const trpc = useTRPC();
  const onSettled = useInvalidateBoards();
  // A fresh form after each post.
  const [formKey, setFormKey] = useState(0);
  const create = useMutation(trpc.board.create.mutationOptions({ onSuccess: () => setFormKey((key) => key + 1), onSettled }));

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={StickyNote} tone="yellow">
          {t('board-title', { name: board.name })}
        </IconCardTitle>
        <CardDescription>{t('board-hint', { name: board.name })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {board.posts.length === 0 ? (
          <p>{t('empty')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {board.posts.map((post) => (
              <Post key={post.id} input={input} post={post} name={board.name} canEdit={view.canWrite} />
            ))}
          </ul>
        )}
        {view.canWrite ? (
          <TipForm
            key={formKey}
            copy="boards"
            initial={{ aboutMemberId: board.memberId, text: '', anonymous: false }}
            submitLabel={t('add')}
            busy={create.isPending}
            error={create.error ? errorMessage(create.error) : undefined}
            onSubmit={({ text, anonymous }) => create.mutate({ ...input, aboutMemberId: board.memberId, text, anonymous })}
          />
        ) : (
          <p className="text-muted">{t('closed')}</p>
        )}
      </CardContent>
      <CardDivider />
      <CardContent className="flex flex-col gap-3">
        <h3 className="font-heading text-lg font-bold">{t('wishes-title', { name: board.name })}</h3>
        {board.wishes.length === 0 ? (
          <p>{t('wishes-empty', { name: board.name })}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {board.wishes.map((wish) => (
              <li key={wish.id}>
                <WishCard wish={wish} inBudget={isInBudget(wish.price, view.budget)} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

/** The "Boards" tab of a conspiracy (90): a board per person but me, where the others plan one gift for them. */
export const BoardsPanel = ({ input }: { input: EditionInput }) => {
  const t = useTranslations('between.boards');
  const tErrors = useTranslations('between.errors');
  const trpc = useTRPC();
  const list = useQuery(trpc.board.list.queryOptions(input));
  if (list.isPending) return <Skeleton className="h-40" />;
  if (list.isError) return <LoadFailed message={tErrors('INTERNAL')} onRetry={() => void list.refetch()} />;
  const view = list.data;
  if (!view) return null;

  return (
    <div className="flex flex-col gap-6">
      <p>{t('intro')}</p>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {view.boards.map((board) => (
          <Board key={board.memberId} input={input} board={board} view={view} />
        ))}
      </div>
    </div>
  );
};
