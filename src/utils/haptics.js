/**
 * Cross-platform Web Haptic Feedback Utility
 * Trigger small vibration patterns on supported mobile devices
 */
export const triggerHaptic = (pattern = 15) => {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof window.navigator.vibrate === 'function') {
    try {
      window.navigator.vibrate(pattern);
    } catch {
      // Ignore unsupported or restricted vibration calls
    }
  }
};
