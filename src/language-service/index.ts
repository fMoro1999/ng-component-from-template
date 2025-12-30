export {
  applyALSQuickFixes,
  isALSAvailable,
  ensureALSActivated,
  getALSStatus,
  type ALSQuickFixOptions,
  type ALSQuickFixResult,
} from './als-integration';

export {
  applyFallbackImports,
  likelyHasMissingImports,
  getPotentiallyMissingImports,
  type FallbackResult,
} from './fallback-handler';
