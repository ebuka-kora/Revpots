import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const DEFAULT_TAB_BAR_HEIGHT = 56;

/**
 * Returns the bottom tab bar height when inside a Bottom Tab Navigator,
 * or a default (56) when outside (e.g. stack screen or context not ready).
 * Avoids "Couldn't find the bottom tab bar height" errors.
 */
export function useSafeBottomTabBarHeight(): number {
  try {
    return useBottomTabBarHeight();
  } catch {
    return DEFAULT_TAB_BAR_HEIGHT;
  }
}
