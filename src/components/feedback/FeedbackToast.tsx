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

const achievementStyleByRarity: Record<string, { card: string; badge: string; accent: string }> = {
  common: {
    card: 'border-cyan-200/35 bg-cyan-200/[0.09] shadow-[0_0_36px_rgba(34,211,238,0.18)]',
    badge: 'border-cyan-200/35 bg-cyan-200/10 text-cyan-100',
    accent: 'from-cyan-200/60 via-white/20 to-transparent',
  },
  rare: {
    card: 'border-blue-300/40 bg-blue-300/[0.10] shadow-[0_0_42px_rgba(96,165,250,0.22)]',
    badge: 'border-blue-300/45 bg-blue-300/10 text-blue-100',
    accent: 'from-blue-300/70 via-cyan-200/25 to-transparent',
  },
  epic: {
    card: 'border-violet-300/45 bg-violet-300/[0.11] shadow-[0_0_46px_rgba(168,85,247,0.24)]',
    badge: 'border-amber-200/45 bg-amber-200/10 text-amber-100',
    accent: 'from-amber-200/70 via-violet-300/30 to-transparent',
  },
};

export function FeedbackToast({ item, onDismiss }: FeedbackToastProps) {
  const isAchievement = item.type === 'achievement';
  const isMajor = isAchievement || item.type === 'level-up';
  const achievementStyle = isAchievement ? achievementStyleByRarity[item.rarity ?? 'common'] ?? achievementStyleByRarity.common : undefined;

  if (isAchievement && achievementStyle) {
    return (
      <button
        className={`feedback-toast achievement-unlock-toast relative min-h-32 w-full overflow-hidden rounded-2xl border p-5 text-left backdrop-blur transition hover:scale-[1.01] ${achievementStyle.card}`}
        onClick={() => onDismiss(item.id)}
        type="button"
      >
        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${achievementStyle.accent}`} />
        <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-amber-100">{item.title}</p>
        <p className="mt-3 text-xl font-black text-white">{item.message}</p>
        {item.detail && (
          <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] ${achievementStyle.badge}`}>
            {item.detail}
          </span>
        )}
      </button>
    );
  }

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
