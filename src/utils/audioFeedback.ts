export type FeedbackSoundType = 'high' | 'achievement' | 'reward';

const achievementPingPath = '/audio/achievement-ping.mp3';
let achievementPing: HTMLAudioElement | null = null;

function getAchievementPing(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') {
    return null;
  }

  if (!achievementPing) {
    achievementPing = new Audio(achievementPingPath);
    achievementPing.preload = 'auto';
    achievementPing.volume = 0.42;
  }

  return achievementPing;
}

export function preloadFeedbackSounds(): void {
  try {
    getAchievementPing()?.load();
  } catch {
    return;
  }
}

export function playFeedbackSound(type: FeedbackSoundType): void {
  if (type !== 'high' && type !== 'achievement' && type !== 'reward') {
    return;
  }

  try {
    const audio = getAchievementPing();
    if (!audio) return;

    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Missing files or autoplay blocks should never affect UI feedback.
    });
  } catch {
    return;
  }
}
