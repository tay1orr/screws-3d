const STORAGE_KEY = 'screwdom3d-progress-v2';

function defaultState() {
  return { version: 2, maxUnlocked: 0, completed: [] };
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 2) return defaultState();
    return {
      version: 2,
      maxUnlocked: Number.isInteger(parsed.maxUnlocked) ? parsed.maxUnlocked : 0,
      completed: Array.isArray(parsed.completed) ? parsed.completed.filter(Number.isInteger) : [],
    };
  } catch {
    return defaultState();
  }
}

function writeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable in private browsing. Gameplay still works.
  }
}

export function createProgressStore(levelCount) {
  const state = readState();
  state.maxUnlocked = Math.min(Math.max(0, state.maxUnlocked), Math.max(0, levelCount - 1));

  return {
    isUnlocked(index) {
      return index >= 0 && index < levelCount && index <= state.maxUnlocked;
    },
    isCompleted(index) {
      return state.completed.includes(index);
    },
    complete(index) {
      if (!state.completed.includes(index)) state.completed.push(index);
      if (index + 1 < levelCount) state.maxUnlocked = Math.max(state.maxUnlocked, index + 1);
      writeState(state);
      return { hasNext: index + 1 < levelCount, unlockedIndex: state.maxUnlocked };
    },
    unlockAll() {
      state.maxUnlocked = Math.max(0, levelCount - 1);
      writeState(state);
      return { ...state, completed: [...state.completed] };
    },
    snapshot() {
      return { ...state, completed: [...state.completed] };
    },
  };
}
