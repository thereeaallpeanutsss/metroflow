/**
 * iOS-inspired Haptic Feedback Engine
 * Leverages Navigator.vibrate with specialized vibration durations and sequences
 * precisely mimicking Apple's Taptic Engine feedback profiles:
 * - UISelectionFeedbackGenerator (delicate tick: 8ms)
 * - UIImpactFeedbackGenerator (light: 12ms, medium: 22ms, heavy: 36ms, rigid: 16ms, soft: 18ms)
 * - UINotificationFeedbackGenerator (success: [12, 45, 26], warning: [22, 50, 22], error: [28, 40, 28, 40, 42])
 * - Route Calculation Celebration: [16, 45, 28] (crisp two-beat tactile confirmation)
 */

import { useState, useEffect } from 'react';

export type HapticType =
  | 'selection'       // 8ms delicate tick (tab switches, line filters, chip taps)
  | 'light'           // 12ms crisp tap (regular buttons, station select, toggles)
  | 'medium'          // 22ms firm tap (swap stations, calculate button, modal trigger)
  | 'heavy'           // 36ms prominent tap (major network changes, clear all)
  | 'rigid'           // 16ms sharp impact (accented actions, locks)
  | 'soft'            // 18ms cushioned tap (smooth controls)
  | 'success'         // [12, 45, 26] two-stage pulse (route found, saved favorite, disruption resolved)
  | 'warning'         // [22, 50, 22] double pulse (avoid disruption toggle, clear action)
  | 'error'           // [28, 40, 28, 40, 42] triple buzz (same station origin/dest, invalid input)
  | 'routeCalculated'; // [16, 45, 28] crisp celebration pattern for calculated routes

const PATTERNS: Record<HapticType, number | number[]> = {
  selection: 8,
  light: 12,
  medium: 22,
  heavy: 36,
  rigid: 16,
  soft: 18,
  success: [12, 45, 26],
  warning: [22, 50, 22],
  error: [28, 40, 28, 40, 42],
  routeCalculated: [16, 45, 28],
};

const STORAGE_KEY = 'metroflow_haptics_enabled';
const HAPTICS_EVENT = 'metroflow_haptics_change';

let hapticsEnabled = true;

// Initialize from localStorage
try {
  const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved !== null) {
    hapticsEnabled = saved === 'true';
  }
} catch {
  hapticsEnabled = true;
}

export function isHapticsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'navigator' in window &&
    typeof navigator.vibrate === 'function'
  );
}

export function getHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled));
      window.dispatchEvent(new CustomEvent(HAPTICS_EVENT, { detail: enabled }));
    }
  } catch {}
}

export function triggerHaptic(type: HapticType = 'light'): void {
  if (!hapticsEnabled) return;
  if (
    typeof window === 'undefined' ||
    !('navigator' in window) ||
    typeof navigator.vibrate !== 'function'
  ) {
    return;
  }

  try {
    const pattern = PATTERNS[type] ?? 12;
    navigator.vibrate(pattern);
  } catch {
    // Silent fail if vibration is blocked or not supported on current platform
  }
}

// Convenient shorthand API
export const haptic = {
  selection: () => triggerHaptic('selection'),
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  rigid: () => triggerHaptic('rigid'),
  soft: () => triggerHaptic('soft'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
  routeCalculated: () => triggerHaptic('routeCalculated'),
  button: () => triggerHaptic('light'),
  primaryAction: () => triggerHaptic('medium'),
};

/**
 * React hook for consuming and updating haptics preference in settings components
 */
export function useHaptics() {
  const [enabled, setEnabledState] = useState<boolean>(getHapticsEnabled);
  const supported = isHapticsSupported();

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      setEnabledState(custom.detail);
    };

    window.addEventListener(HAPTICS_EVENT, handler);
    return () => window.removeEventListener(HAPTICS_EVENT, handler);
  }, []);

  const toggle = (nextState: boolean) => {
    setHapticsEnabled(nextState);
    setEnabledState(nextState);
    if (nextState) {
      triggerHaptic('medium');
    }
  };

  return {
    enabled,
    setEnabled: toggle,
    isSupported: supported,
    trigger: triggerHaptic,
  };
}
