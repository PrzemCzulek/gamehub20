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
    <div className="pointer-events-none fixed right-3 top-16 z-50 flex w-[min(21.5rem,calc(100vw-1.5rem))] flex-col gap-2 sm:right-5 sm:top-[4.5rem]">
      {items.map((item) => (
        <div className="pointer-events-auto" key={item.id}>
          <FeedbackToast item={item} onDismiss={dismissFeedback} />
        </div>
      ))}
    </div>
  );
}
