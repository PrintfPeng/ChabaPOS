import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useFeature } from '../contexts/FeatureContext';
import type { FeatureKey } from '../lib/feature-config';

interface Props {
  featureKey: FeatureKey;
  children: React.ReactNode;
}

/**
 * Wraps a route and redirects to the branch overview if the current branch's
 * subscription plan does not include the required feature key.
 */
export function FeatureGuard({ featureKey, children }: Props) {
  const { hasFeature } = useFeature();
  const { brandId, branchId } = useParams<{ brandId: string; branchId: string }>();

  if (!hasFeature(featureKey)) {
    return <Navigate to={`/brands/${brandId}/branches/${branchId}`} replace />;
  }

  return <>{children}</>;
}
