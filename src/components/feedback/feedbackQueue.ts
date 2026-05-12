export type FeedbackType = 'xp' | 'level-up' | 'achievement' | 'quest' | 'personal-best';

export type FeedbackItem = {
  id: string;
  type: FeedbackType;
  title: string;
  message: string;
  detail?: string;
  durationMs?: number;
};

type Listener = (items: FeedbackItem[]) => void;

const listeners = new Set<Listener>();
let items: FeedbackItem[] = [];
const maxItems = 4;

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

export function pushFeedback(input: Omit<FeedbackItem, 'id'>): FeedbackItem {
  const item: FeedbackItem = {
    ...input,
    id: createId(),
  };

  items = [item, ...items].slice(0, maxItems);
  notify();

  window.setTimeout(() => dismissFeedback(item.id), item.durationMs ?? (item.type === 'achievement' ? 5200 : 3600));
  return item;
}
