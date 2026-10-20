type Entry<T> = {
  userId: string;
  value: T;
};

export type UserMemoryCache<T> = {
  peek: (userId: string) => T | null;
  remember: (userId: string, value: T) => void;
  invalidate: () => void;
  epoch: () => number;
  load: (userId: string, fetcher: () => Promise<T>, options?: { fresh?: boolean }) => Promise<T>;
};

/** One in-memory value for the signed-in user. A new sign-in drops it. */
export function createUserMemoryCache<T>(): UserMemoryCache<T> {
  let entry: Entry<T> | null = null;
  let currentEpoch = 0;
  let inflight: { userId: string; epoch: number; promise: Promise<T> } | null = null;

  function peek(userId: string): T | null {
    if (!entry || entry.userId !== userId) {
      return null;
    }
    return entry.value;
  }

  function remember(userId: string, value: T) {
    entry = { userId, value };
  }

  function invalidate() {
    currentEpoch += 1;
    entry = null;
    inflight = null;
  }

  function load(userId: string, fetcher: () => Promise<T>, options?: { fresh?: boolean }): Promise<T> {
    if (!options?.fresh) {
      const cached = peek(userId);
      if (cached) {
        return Promise.resolve(cached);
      }
    }
    if (inflight && inflight.userId === userId && inflight.epoch === currentEpoch) {
      return inflight.promise;
    }
    const started = currentEpoch;
    const promise = fetcher().then(
      (value) => {
        if (started === currentEpoch) {
          entry = { userId, value };
        }
        if (inflight?.promise === promise) {
          inflight = null;
        }
        return value;
      },
      (error: unknown) => {
        if (inflight?.promise === promise) {
          inflight = null;
        }
        throw error;
      },
    );
    inflight = { userId, epoch: started, promise };
    return promise;
  }

  return {
    peek,
    remember,
    invalidate,
    epoch: () => currentEpoch,
    load,
  };
}

const OPENED_PAGE_LIMIT = 8;

export type OpenedPageCache<T> = {
  peek: (userId: string, key: string) => T | null;
  remember: (userId: string, key: string, value: T) => void;
  invalidate: () => void;
  epoch: () => number;
};

/** A few recently opened records for this tab, newest first. */
export function createOpenedPageCache<T>(): OpenedPageCache<T> {
  let ownerId: string | null = null;
  let entries: Array<{ key: string; value: T }> = [];
  let currentEpoch = 0;

  function invalidate() {
    currentEpoch += 1;
    ownerId = null;
    entries = [];
  }

  function peek(userId: string, key: string): T | null {
    if (ownerId !== userId) {
      return null;
    }
    return entries.find((entry) => entry.key === key)?.value ?? null;
  }

  function remember(userId: string, key: string, value: T) {
    if (ownerId !== userId) {
      ownerId = userId;
      entries = [];
    }
    entries = [{ key, value }, ...entries.filter((entry) => entry.key !== key)].slice(0, OPENED_PAGE_LIMIT);
  }

  return {
    peek,
    remember,
    invalidate,
    epoch: () => currentEpoch,
  };
}
