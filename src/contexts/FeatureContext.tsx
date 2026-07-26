import React, { createContext, useContext, useState, useCallback } from 'react';
import { FEATURES, type FeatureKey } from '../lib/feature-config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeatureContextType {
  /** Feature keys the current branch is allowed to use. */
  allowedFeatures: string[];
  /** Returns true if the given feature key is in the allowed list. */
  hasFeature: (key: FeatureKey | string) => boolean;
  /**
   * Call this after loading the branch's subscription plan from the API.
   * Pass the plan's `features` JSON array (array of FeatureKey strings).
   */
  setAllowedFeatures: (features: string[]) => void;
  /** Unlock every feature (useful for development / super-admin view). */
  grantAll: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const FeatureContext = createContext<FeatureContextType>({
  allowedFeatures: [],
  hasFeature: () => false,
  setAllowedFeatures: () => {},
  grantAll: () => {},
});

export const useFeature = () => useContext(FeatureContext);

// ── Provider ──────────────────────────────────────────────────────────────────

const ALL_FEATURE_KEYS = Object.values(FEATURES);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default: NO features allowed.
  // Dashboard calls setAllowedFeatures() after loading the brand's plan.
  // Safe default: if plan never loads, everything stays locked.
  const [allowedFeatures, setAllowedFeaturesState] = useState<string[]>([]);

  const hasFeature = useCallback(
    (key: string) => allowedFeatures.includes(key),
    [allowedFeatures],
  );

  const setAllowedFeatures = useCallback((features: string[]) => {
    setAllowedFeaturesState(features);
  }, []);

  const grantAll = useCallback(() => {
    setAllowedFeaturesState(ALL_FEATURE_KEYS);
  }, []);

  return (
    <FeatureContext.Provider value={{ allowedFeatures, hasFeature, setAllowedFeatures, grantAll }}>
      {children}
    </FeatureContext.Provider>
  );
};
