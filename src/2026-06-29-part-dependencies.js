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

// Screws and structural support are separate concerns. A visible screw may be
// removed at any time, but the part only falls after its own screws are gone
// and every part resting on it has started to move away.
export function canReleaseUnfastenedPart(part, allParts) {
  return part?.state === 'attached'
    && (part.screws?.length ?? 0) === 0
    && !hasAttachedPartDependency(part, allParts);
}
