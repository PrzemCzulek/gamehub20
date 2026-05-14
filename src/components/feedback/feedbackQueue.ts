import { playFeedbackSound } from '../../utils/audioFeedback';

export type FeedbackType = 'xp' | 'level-up' | 'achievement' | 'quest' | 'personal-best' | 'reward';
export type FeedbackPriority = 'low' | 'medium' | 'high';

export type FeedbackItem = {
  id: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  title: string;
  message: string;
  detail?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'hidden';
  durationMs?: number;
};

type Listener = (items: FeedbackItem[]) => void;

const listeners = new Set<Listener>();
let items: FeedbackItem[] = [];
const maxItems = 3;
let lastLowSignature = '';
let lastLowAt = 0;

const defaultPriorityByType: Record<FeedbackType, FeedbackPriority> = {
  xp: 'low',
  quest: 'medium',
  'personal-best': 'medium',
  'level-up': 'high',
  achievement: 'high',
  reward: 'high',
};

const defaultDurationByPriority: Record<FeedbackPriority, number> = {
  low: 1800,
  medium: 3300,
  high: 5400,
};

function createId(): string {
  return `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function notify() {
  listeners.forEach((listener) => listener(items));
}

export function subscribeFeedback(listener: Listener): () => void {
  listeners.add(listener);
  listener(items);

  return () => {
    listeners.delete(listener);
  };
}

export function dismissFeedback(id: string): void {
  items = items.filter((item) => item.id !== id);
  notify();
}

export function pushFeedback(input: Omit<FeedbackItem, 'id' | 'priority'> & { priority?: FeedbackPriority }): FeedbackItem {
  const priority = input.priority ?? defaultPriorityByType[input.type];
  const signature = `${input.type}:${input.title}:${input.message}:${input.detail ?? ''}`;
  const now = Date.now();

  if (priority === 'low' && signature === lastLowSignature && now - lastLowAt < 900) {
    const existing = items.find((current) => current.priority === 'low' && `${current.type}:${current.title}:${current.message}:${current.detail ?? ''}` === signature);
    if (existing) return existing;
  }

  const item: FeedbackItem = {
    ...input,
    priority,
    id: createId(),
  };

  if (item.priority === 'low') {
    items = items.filter((current) => current.priority !== 'low');
    lastLowSignature = signature;
    lastLowAt = now;
  }

  items = [item, ...items].slice(0, maxItems);
  notify();

  if (item.priority === 'high') {
    playFeedbackSound(item.type === 'achievement' ? 'achievement' : item.type === 'reward' ? 'reward' : 'high');
  }

  window.setTimeout(() => dismissFeedback(item.id), item.durationMs ?? defaultDurationByPriority[item.priority]);
  return item;
}
