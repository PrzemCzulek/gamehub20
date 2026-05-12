import { useEffect, useState } from 'react';
import { FeedbackToast } from './FeedbackToast';
import { dismissFeedback, subscribeFeedback, type FeedbackItem } from './feedbackQueue';

export function LiveFeed() {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  useEffect(() => subscribeFeedback(setItems), []);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {items.map((item) => (
        <div className="pointer-events-auto" key={item.id}>
          <FeedbackToast item={item} onDismiss={dismissFeedback} />
        </div>
      ))}
    </div>
  );
}
