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
    id: 'cyan_precision',
    type: 'frame',
    label: 'Cyan Precision',
    className: 'border-cyan-300/45 shadow-[0_0_22px_rgba(34,211,238,0.20)]',
  },
  {
    id: 'precision_i',
    type: 'title',
    label: 'Precision I',
  },
  {
    id: 'reflex_bronze',
    type: 'badge',
    label: 'Reflex Bronze',
    className: 'border-amber-300/35 bg-amber-300/10 text-amber-100',
  },
  {
    id: 'the_fastest',
    type: 'title',
    label: 'The Fastest',
  },
  {
    id: 'memory_keeper',
    type: 'title',
    label: 'Memory Keeper',
  },
  {
    id: 'cps_freak',
    type: 'badge',
    label: 'CPS Freak',
    className: 'border-fuchsia-300/35 bg-fuchsia-300/10 text-fuchsia-100',
  },
];

export function getCosmetic(id?: string): CosmeticDefinition | undefined {
  return id ? cosmetics.find((cosmetic) => cosmetic.id === id) : undefined;
}
