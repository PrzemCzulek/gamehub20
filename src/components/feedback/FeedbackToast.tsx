import type { FeedbackItem } from './feedbackQueue';

type FeedbackToastProps = {
  item: FeedbackItem;
  onDismiss: (id: string) => void;
};

const styleByType: Record<FeedbackItem['type'], { card: string; label: string; icon: string }> = {
  xp: {
    card: 'border-cyan-300/18 bg-cyan-300/[0.055] shadow-[0_0_18px_rgba(34,211,238,0.10)]',
    label: 'text-cyan-100',
    icon: 'XP',
  },
  quest: {
    card: 'border-teal-300/24 bg-teal-300/[0.065] shadow-[0_0_22px_rgba(45,212,191,0.12)]',
    label: 'text-teal-100',
    icon: 'Q',
  },
  'personal-best': {
    card: 'border-fuchsia-300/26 bg-fuchsia-300/[0.07] shadow-[0_0_24px_rgba(217,70,239,0.13)]',
    label: 'text-fuchsia-100',
    icon: 'PB',
  },
  'level-up': {
    card: 'border-violet-300/34 bg-violet-300/[0.095] shadow-[0_0_32px_rgba(168,85,247,0.20)]',
    label: 'text-violet-100',
    icon: 'LV',
  },
  achievement: {
    card: 'border-amber-200/34 bg-amber-200/[0.09] shadow-[0_0_34px_rgba(251,191,36,0.18)]',
    label: 'text-amber-100',
    icon: 'A',
  },
  reward: {
    card: 'border-cyan-200/36 bg-cyan-200/[0.09] shadow-[0_0_34px_rgba(34,211,238,0.20)]',
    label: 'text-cyan-100',
    icon: 'R',
  },
};

const achievementStyleByRarity: Record<string, { card: string; badge: string; accent: string }> = {
  common: {
    card: 'border-cyan-200/35 bg-cyan-200/[0.085] shadow-[0_0_30px_rgba(34,211,238,0.16)]',
    badge: 'border-cyan-200/35 bg-cyan-200/10 text-cyan-100',
    accent: 'from-cyan-200/60 via-white/18 to-transparent',
  },
  rare: {
    card: 'border-blue-300/40 bg-blue-300/[0.095] shadow-[0_0_36px_rgba(96,165,250,0.20)]',
    badge: 'border-blue-300/45 bg-blue-300/10 text-blue-100',
    accent: 'from-blue-300/70 via-cyan-200/25 to-transparent',
  },
  epic: {
    card: 'border-violet-300/45 bg-violet-300/[0.10] shadow-[0_0_40px_rgba(168,85,247,0.22)]',
    badge: 'border-amber-200/45 bg-amber-200/10 text-amber-100',
    accent: 'from-amber-200/70 via-violet-300/30 to-transparent',
  },
  legendary: {
    card: 'border-amber-200/50 bg-amber-200/[0.12] shadow-[0_0_42px_rgba(251,191,36,0.24)]',
    badge: 'border-amber-200/55 bg-amber-200/12 text-amber-100',
    accent: 'from-amber-200/80 via-cyan-200/20 to-transparent',
  },
  mythic: {
    card: 'border-fuchsia-200/50 bg-fuchsia-300/[0.11] shadow-[0_0_44px_rgba(217,70,239,0.22)]',
    badge: 'border-fuchsia-200/55 bg-fuchsia-300/12 text-fuchsia-100',
    accent: 'from-cyan-200/70 via-fuchsia-300/35 to-amber-200/35',
  },
};

export function FeedbackToast({ item, onDismiss }: FeedbackToastProps) {
  const baseStyle = styleByType[item.type];
  const achievementStyle =
    item.type === 'achievement' ? achievementStyleByRarity[item.rarity ?? 'common'] ?? achievementStyleByRarity.common : undefined;
  const isHigh = item.priority === 'high';
  const isLow = item.priority === 'low';
  const cardStyle = achievementStyle?.card ?? baseStyle.card;

  return (
    <button
      className={`feedback-toast relative w-full overflow-hidden rounded-xl border text-left backdrop-blur-md transition duration-200 hover:scale-[1.008] ${
        isHigh ? 'feedback-toast-high p-4' : isLow ? 'p-3 opacity-90' : 'p-3.5'
      } ${cardStyle}`}
      onClick={() => onDismiss(item.id)}
      type="button"
    >
      {achievementStyle && <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${achievementStyle.accent}`} />}
      <div className="flex items-start gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/28 text-[0.6rem] font-black uppercase tracking-wide ${
            achievementStyle ? achievementStyle.badge : baseStyle.label
          }`}
        >
          {baseStyle.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[0.62rem] font-black uppercase tracking-[0.18em] ${baseStyle.label}`}>{item.title}</p>
          <p className={`${isHigh ? 'mt-1.5 text-base' : 'mt-1 text-sm'} truncate font-black text-white`}>{item.message}</p>
          {item.detail && <p className="mt-1.5 truncate text-xs font-semibold uppercase tracking-wide text-slate-300">{item.detail}</p>}
        </div>
      </div>
    </button>
  );
}
