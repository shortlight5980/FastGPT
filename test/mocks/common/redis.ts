import { vi } from 'vitest';

// In-memory storage for mock Redis
const createRedisStorage = () => {
  const storage = new Map<string, any>();
  const expiryMap = new Map<string, number>();

  // Check and remove expired keys
  const isExpired = (key: string): boolean => {
    const expiry = expiryMap.get(key);
    if (expiry && expiry < Date.now()) {
      storage.delete(key);
      expiryMap.delete(key);
      return true;
    }
    return false;
  };

  return {
    get: (key: string) => {
      if (isExpired(key)) return null;
      return storage.get(key) ?? null;
    },
    set: (key: string, value: any, exMode?: string, exValue?: number, condition?: string) => {
      if (condition === 'NX' && !isExpired(key) && storage.has(key)) {
        return null;
      }
      storage.set(key, value);
      // Handle EX (seconds) and PX (milliseconds) options
      if (exMode === 'EX' && typeof exValue === 'number') {
        expiryMap.set(key, Date.now() + exValue * 1000);
      } else if (exMode === 'PX' && typeof exValue === 'number') {
        expiryMap.set(key, Date.now() + exValue);
      }
      return 'OK';
    },
    del: (...keys: string[]) => {
      let deletedCount = 0;
      keys.forEach((key) => {
        if (storage.has(key)) {
          storage.delete(key);
          expiryMap.delete(key);
          deletedCount++;
        }
      });
      return deletedCount;
    },
    exists: (...keys: string[]) => {
      let count = 0;
      keys.forEach((key) => {
        if (!isExpired(key) && storage.has(key)) count++;
      });
      return count;
    },
    pexpire: (key: string, milliseconds: number) => {
      if (isExpired(key) || !storage.has(key)) return 0;
      expiryMap.set(key, Date.now() + milliseconds);
      return 1;
    },
    clear: () => {
      storage.clear();
      expiryMap.clear();
    },
    hget: (key: string, field: string) => {
      if (isExpired(key)) return null;
      const value = storage.get(key);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      return value[field] ?? null;
    },
    hset: (key: string, field: string, value: any) => {
      if (isExpired(key)) {
        expiryMap.delete(key);
      }
      const current = storage.get(key);
      const hash =
        current && typeof current === 'object' && !Array.isArray(current) ? { ...current } : {};
      const isNewField = !(field in hash);
      hash[field] = value;
      storage.set(key, hash);
      return isNewField ? 1 : 0;
    },
    hdel: (key: string, ...fields: string[]) => {
      if (isExpired(key)) return 0;
      const current = storage.get(key);
      if (!current || typeof current !== 'object' || Array.isArray(current)) return 0;

      let deletedCount = 0;
      const hash = { ...current };
      for (const field of fields) {
        if (field in hash) {
          delete hash[field];
          deletedCount++;
        }
      }
      storage.set(key, hash);
      return deletedCount;
    },
    hgetall: (key: string) => {
      if (isExpired(key)) return {};
      const value = storage.get(key);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      return { ...value };
    },
    hmset: (key: string, values: Record<string, any>) => {
      if (isExpired(key)) {
        expiryMap.delete(key);
      }
      const current = storage.get(key);
      const hash =
        current && typeof current === 'object' && !Array.isArray(current) ? { ...current } : {};
      storage.set(key, {
        ...hash,
        ...values
      });
      return 'OK';
    }
  };
};

// Shared global Redis storage for all mock clients
const globalRedisStorage = createRedisStorage();

// Create mock client with shared storage
const createSharedMockRedisClient = () => {
  return {
    // Connection methods
    on: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue('OK'),
    duplicate: vi.fn(function (this: any) {
      return createSharedMockRedisClient();
    }),

    // Key-value operations with shared storage
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(globalRedisStorage.get(key))),
    set: vi
      .fn()
      .mockImplementation(
        (key: string, value: any, exMode?: string, exValue?: number, condition?: string) =>
          Promise.resolve(globalRedisStorage.set(key, value, exMode, exValue, condition))
      ),
    del: vi
      .fn()
      .mockImplementation((...keys: string[]) => Promise.resolve(globalRedisStorage.del(...keys))),
    exists: vi
      .fn()
      .mockImplementation((...keys: string[]) =>
        Promise.resolve(globalRedisStorage.exists(...keys))
      ),
    pexpire: vi
      .fn()
      .mockImplementation((key: string, milliseconds: number) =>
        Promise.resolve(globalRedisStorage.pexpire(key, milliseconds))
      ),
    eval: vi
      .fn()
      .mockImplementation(
        (_script: string, _keyCount: number, key: string, token: string, ttl?: number) => {
          if (globalRedisStorage.get(key) !== token) return Promise.resolve(0);
          if (typeof ttl === 'number') return Promise.resolve(globalRedisStorage.pexpire(key, ttl));
          return Promise.resolve(globalRedisStorage.del(key));
        }
      ),
    keys: vi.fn().mockResolvedValue([]),
    scan: vi.fn().mockImplementation((cursor) => {
      if (cursor === '0') return ['100', ['key1', 'key2']];
      if (cursor === '100') return ['0', ['key3']];
      return ['0', []];
    }),

    // Hash operations
    hget: vi
      .fn()
      .mockImplementation((key: string, field: string) =>
        Promise.resolve(globalRedisStorage.hget(key, field))
      ),
    hset: vi
      .fn()
      .mockImplementation((key: string, field: string, value: any) =>
        Promise.resolve(globalRedisStorage.hset(key, field, value))
      ),
    hdel: vi
      .fn()
      .mockImplementation((key: string, ...fields: string[]) =>
        Promise.resolve(globalRedisStorage.hdel(key, ...fields))
      ),
    hgetall: vi
      .fn()
      .mockImplementation((key: string) => Promise.resolve(globalRedisStorage.hgetall(key))),
    hmset: vi
      .fn()
      .mockImplementation((key: string, values: Record<string, any>) =>
        Promise.resolve(globalRedisStorage.hmset(key, values))
      ),

    // Expiry operations
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-1),
    expireat: vi.fn().mockResolvedValue(1),

    // Increment operations
    incr: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(1),
    incrby: vi.fn().mockResolvedValue(1),
    decrby: vi.fn().mockResolvedValue(1),
    incrbyfloat: vi.fn().mockResolvedValue(1),

    // Server commands
    info: vi.fn().mockResolvedValue(''),
    ping: vi.fn().mockResolvedValue('PONG'),
    flushdb: vi.fn().mockImplementation(() => {
      globalRedisStorage.clear();
      return Promise.resolve('OK');
    }),

    // List operations
    lpush: vi.fn().mockResolvedValue(1),
    rpush: vi.fn().mockResolvedValue(1),
    lpop: vi.fn().mockResolvedValue(null),
    rpop: vi.fn().mockResolvedValue(null),
    llen: vi.fn().mockResolvedValue(0),

    // Set operations
    sadd: vi.fn().mockResolvedValue(1),
    srem: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
    sismember: vi.fn().mockResolvedValue(0),

    // pipeline
    pipeline: vi.fn(() => ({
      del: vi.fn().mockReturnThis(),
      unlink: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([])
    })),
    multi: vi.fn(() => ({
      incr: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, 1]])
    })),

    // Internal storage for testing purposes
    _storage: globalRedisStorage
  };
};

// Mock Redis connections to prevent connection errors in tests
vi.mock('@fastgpt/service/common/redis', async (importOriginal) => {
  const actual = (await importOriginal()) as any;

  return {
    ...actual,
    newQueueRedisConnection: vi.fn(createSharedMockRedisClient),
    newWorkerRedisConnection: vi.fn(createSharedMockRedisClient),
    getGlobalRedisConnection: vi.fn(() => {
      if (!global.mockRedisClient) {
        global.mockRedisClient = createSharedMockRedisClient();
      }
      return global.mockRedisClient;
    }),
    initRedisClient: vi.fn().mockResolvedValue(createSharedMockRedisClient())
  };
});

// Initialize global.redisClient with mock before any module imports it
// This prevents getGlobalRedisConnection() from creating a real Redis client
if (!global.redisClient) {
  global.redisClient = createSharedMockRedisClient() as any;
}
