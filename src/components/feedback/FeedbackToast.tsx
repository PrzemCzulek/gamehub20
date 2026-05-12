import type { FeedbackItem } from './feedbackQueue';

type FeedbackToastProps = {
  item: FeedbackItem;
  onDismiss: (id: string) => void;
};

const styleByType: Record<FeedbackItem['type'], string> = {
  xp: 'border-cyan-300/25 bg-cyan-300/[0.08] shadow-[0_0_24px_rgba(34,211,238,0.14)]',
  'level-up': 'border-violet-300/35 bg-violet-300/[0.10] shadow-[0_0_32px_rgba(168,85,247,0.20)]',
  achievement: 'border-amber-200/35 bg-amber-200/[0.10] shadow-[0_0_34px_rgba(251,191,36,0.18)]',
  quest: 'border-teal-300/30 bg-teal-300/[0.08] shadow-[0_0_26px_rgba(45,212,191,0.15)]',
  'personal-best': 'border-fuchsia-300/35 bg-fuchsia-300/[0.10] shadow-[0_0_30px_rgba(217,70,239,0.16)]',
};

export function FeedbackToast({ item, onDismiss }: FeedbackToastProps) {
  const isMajor = item.type === 'achievement' || item.type === 'level-up';

  return (
    <button
      className={`feedback-toast w-full rounded-xl border p-4 text-left backdrop-blur transition hover:scale-[1.01] ${styleByType[item.type]} ${
        isMajor ? 'min-h-28' : ''
      }`}
      onClick={() => onDismiss(item.id)}
      type="button"
    >
      <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-cyan-100">{item.title}</p>
      <p className={`${isMajor ? 'mt-2 text-lg' : 'mt-1 text-sm'} font-bold text-white`}>{item.message}</p>
      {item.detail && <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-300">{item.detail}</p>}
    </button>
  );
}
