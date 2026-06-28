// Structural dependency rule shared by the renderer and unit tests.
// A part remains locked only while one of the parts resting on it is still
// attached. Once the upper part starts falling, the next layer can be removed.
export function hasAttachedPartDependency(part, allParts) {
  const blockingIds = part?.spec?.blockedBy ?? [];
  if (blockingIds.length === 0) return false;

  const attachedIds = new Set(
    allParts
      .filter(candidate => candidate.state === 'attached')
      .map(candidate => candidate.spec?.id)
      .filter(Boolean)
  );

  return blockingIds.some(id => attachedIds.has(id));
}
