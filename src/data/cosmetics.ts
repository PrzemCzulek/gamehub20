export type CosmeticType = 'title' | 'frame' | 'badge';

export type CosmeticDefinition = {
  id: string;
  type: CosmeticType;
  label: string;
  description?: string;
  className?: string;
};

export const cosmetics: CosmeticDefinition[] = [
  {
    id: 'reflex_rookie',
    type: 'title',
    label: 'Reflex Rookie',
  },
  {
    id: 'precision_i',
    type: 'title',
    label: 'Precision I',
  },
  {
    id: 'cps_freak',
    type: 'title',
    label: 'CPS Freak',
  },
  {
    id: 'memory_keeper',
    type: 'title',
    label: 'Memory Keeper',
  },
  {
    id: 'the_fastest',
    type: 'title',
    label: 'The Fastest',
  },
  {
    id: 'cyan_precision_frame',
    type: 'frame',
    label: 'Cyan Precision',
    className: 'border-cyan-300/45 shadow-[0_0_24px_rgba(34,211,238,0.22)]',
  },
  {
    id: 'reflex_neon_frame',
    type: 'frame',
    label: 'Reflex Neon',
    className: 'border-sky-300/45 shadow-[0_0_24px_rgba(56,189,248,0.20),inset_0_0_18px_rgba(34,211,238,0.045)]',
  },
  {
    id: 'purple_focus_frame',
    type: 'frame',
    label: 'Purple Focus',
    className: 'border-violet-300/45 shadow-[0_0_26px_rgba(168,85,247,0.22)]',
  },
  {
    id: 'reflex_bronze',
    type: 'badge',
    label: 'Reflex Bronze',
    className: 'border-amber-300/35 bg-amber-300/10 text-amber-100',
  },
  {
    id: 'cps_freak_badge',
    type: 'badge',
    label: 'CPS Freak',
    className: 'border-fuchsia-300/35 bg-fuchsia-300/10 text-fuchsia-100',
  },
  {
    id: 'aim_focus_badge',
    type: 'badge',
    label: 'Aim Focus',
    className: 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100',
  },
  {
    id: 'cyan_precision',
    type: 'frame',
    label: 'Cyan Precision',
    description: 'Legacy alias',
    className: 'border-cyan-300/45 shadow-[0_0_24px_rgba(34,211,238,0.22)]',
  },
];

export function getCosmetic(id?: string, type?: CosmeticType): CosmeticDefinition | undefined {
  if (!id) return undefined;
  return cosmetics.find((cosmetic) => cosmetic.id === id && (!type || cosmetic.type === type));
}
