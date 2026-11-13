import { WhoIsNextEndgame } from '@/components/giftday/presenter/who-is-next-endgame';
import { WhoIsNextReel } from '@/components/giftday/presenter/who-is-next-reel';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { parseNames, pickNames } from '@/lib/pick';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useState, type FormEvent } from 'react';

/** Pause between two spins when picking several names one after another. */
const NEXT_SPIN_MS = 800;
/** The presenter's reel and cards, sized for the page. */
const reelSize = 'w-full min-w-0 px-4 text-4xl leading-[1.3em] sm:text-6xl';
const cardSize = 'px-4 py-3 text-3xl leading-none sm:px-6 sm:py-4 sm:text-4xl';

/** `names`: the reel's names; `target`: where it lands; `queue`: the names still to spin for after it. */
type Spin = { id: number; names: string[]; target: string; queue: string[]; landed: boolean };

/**
 * Picks names at random on this device (`lib/pick`), with the presenter's reel: one at a time or
 * several, each spun in turn or all at once. Picked names leave the pool until Start over.
 */
export const NamePicker = () => {
  const t = useTranslations('pick');
  const format = useFormatter();
  const id = useId();
  const [text, setText] = useState('');
  const [count, setCount] = useState('1');
  const [spinEach, setSpinEach] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [latest, setLatest] = useState<string[]>([]);
  const [spin, setSpin] = useState<Spin | null>(null);

  const names = parseNames(text);
  const pool = names.filter((name) => !picked.includes(name));
  const howMany = Math.min(Math.max(Number.parseInt(count, 10) || 1, 1), Math.max(pool.length, 1));
  const busy = spin !== null && (!spin.landed || spin.queue.length > 0);

  useEffect(() => {
    if (!spin?.landed || spin.queue.length === 0) return;
    const [target, ...queue] = spin.queue;
    const timer = setTimeout(
      () => setSpin({ id: spin.id + 1, names: spin.names.filter((name) => name !== spin.target), target, queue, landed: false }),
      NEXT_SPIN_MS
    );
    return () => clearTimeout(timer);
  }, [spin]);

  const pick = (event: FormEvent) => {
    event.preventDefault();
    if (busy || pool.length === 0) return;
    const [target, ...queue] = pickNames(pool, howMany);
    if (queue.length > 0 && !spinEach) {
      setPicked([...picked, target, ...queue]);
      setLatest([target, ...queue]);
      setSpin(null);
      return;
    }
    setSpin({ id: (spin?.id ?? 0) + 1, names: pool, target, queue, landed: false });
  };

  const onLanded = () => {
    if (!spin || spin.landed) return;
    setPicked((current) => [...current, spin.target]);
    setLatest([spin.target]);
    setSpin({ ...spin, landed: true });
  };

  const startOver = () => {
    setPicked([]);
    setLatest([]);
    setSpin(null);
  };

  const stage = !spin ? (
    <WhoIsNextReel names={[]} target="" status="idle" onLanded={onLanded} className={reelSize} />
  ) : spin.names.length > 3 ? (
    <WhoIsNextReel key={spin.id} names={spin.names} target={spin.target} status="spinning" onLanded={onLanded} className={reelSize} />
  ) : spin.names.length > 1 ? (
    <WhoIsNextEndgame key={spin.id} names={spin.names} target={spin.target} status="spinning" onLanded={onLanded} className={cardSize} />
  ) : (
    <WhoIsNextReel key={spin.id} names={spin.names} target={spin.target} status="skipped" onLanded={onLanded} className={reelSize} />
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-h-36 items-center justify-center overflow-hidden px-1 py-4">{stage}</div>
      <p role="status" className="sr-only">
        {latest.length > 0 && t('announce', { names: format.list(latest) })}
      </p>
      {/* noValidate: How many above what's left picks what's left, instead of blocking Pick. */}
      <form onSubmit={pick} noValidate className="flex flex-col gap-5">
        <Field>
          <Label htmlFor={`${id}-names`}>{t('names')}</Label>
          <Textarea
            id={`${id}-names`}
            aria-describedby={`${id}-names-help`}
            rows={6}
            value={text}
            readOnly={busy}
            onChange={(event) => setText(event.target.value)}
          />
          <FieldDescription id={`${id}-names-help`}>{t('names-help')}</FieldDescription>
        </Field>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <Field className="w-28">
            <Label htmlFor={`${id}-count`}>{t('how-many')}</Label>
            <Input
              id={`${id}-count`}
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(pool.length, 1)}
              value={count}
              readOnly={busy}
              onChange={(event) => setCount(event.target.value)}
            />
          </Field>
          {howMany > 1 && (
            <div className="flex h-11 items-center gap-3">
              <Switch id={`${id}-spin`} checked={spinEach} onCheckedChange={setSpinEach} disabled={busy} />
              <Label htmlFor={`${id}-spin`} className="text-base">
                {t('spin-each')}
              </Label>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy || pool.length === 0} focusableWhenDisabled>
            {t('pick')}
          </Button>
          <Button type="button" variant="neutral" onClick={startOver} disabled={busy || picked.length === 0} focusableWhenDisabled>
            {t('start-over')}
          </Button>
          {names.length > 0 && <p className="text-sm text-muted">{t('left', { left: pool.length, total: names.length })}</p>}
        </div>
      </form>
      {picked.length > 0 && (
        <div className="flex flex-col gap-2">
          <p id={`${id}-picked`} className="font-bold">
            {t('picked')}
          </p>
          <ol aria-labelledby={`${id}-picked`} className="flex list-decimal flex-col gap-1 pl-8 text-lg font-semibold marker:text-muted">
            {picked.map((name) => (
              <li key={name} className="break-words">
                {name}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
