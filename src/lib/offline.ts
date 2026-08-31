import type { LearningEvent } from "@/lib/types";

// Keep the durable database name so an in-progress offline session survives the rebrand.
const DATABASE_NAME = "future-minds-offline";
const DATABASE_VERSION = 1;
const LEARNER_STATE_STORE = "learner-state";
const LEARNING_EVENT_STORE = "learning-events";
const DEFAULT_SYNC_ENDPOINT = "/api/v1/events/sync";
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_MAX_RETRIES = 8;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

export const CONNECTIVITY_CHANGE_EVENT = "quantro-ai:connectivity-change";
export const LEARNING_QUEUE_CHANGE_EVENT = "quantro-ai:learning-queue-change";
export const LEARNING_SYNC_EVENT = "quantro-ai:learning-sync";

export type LearningEventType =
  | "response_submitted"
  | "assessment_submitted"
  | "reflection_submitted"
  | "simulation_completed"
  | "retrieval_answered";

/**
 * A learning event before the server assigns its database id and score.
 * `clientUuid` is the idempotency key and must remain stable across retries.
 */
export type OfflineLearningEvent = Omit<
  LearningEvent,
  "id" | "syncedAt" | "serverScore"
> & {
  readonly eventType?: LearningEventType;
};

export type QueueEntryStatus = "pending" | "failed";

export interface QueuedLearningEvent {
  readonly clientUuid: string;
  readonly event: OfflineLearningEvent;
  readonly queuedAt: string;
  readonly retryCount: number;
  readonly nextAttemptAt: string;
  readonly status: QueueEntryStatus;
  readonly lastError?: string;
}

interface StoredLearnerState<T = unknown> {
  readonly key: string;
  readonly value: T;
  readonly updatedAt: string;
}

export interface SyncResultItem {
  readonly clientUuid: string;
  readonly status: "accepted" | "duplicate" | "rejected" | "retry";
  readonly serverScore?: {
    readonly score: number;
    readonly maxScore: number;
    readonly isCorrect: boolean;
  };
  readonly gradingState?:
    | "automatically_graded"
    | "manual_pending"
    | "ungraded";
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
    readonly retryable?: boolean;
  };
}

export interface LearningEventBatchResult {
  readonly results?: readonly SyncResultItem[];
  readonly acceptedClientUuids?: readonly string[];
  readonly duplicateClientUuids?: readonly string[];
  readonly retryClientUuids?: readonly string[];
  readonly rejectedClientUuids?: readonly string[];
  readonly syncedAt?: string;
}

export type LearningEventBatchSender = (
  events: readonly OfflineLearningEvent[],
) => Promise<LearningEventBatchResult | undefined>;

export interface SyncQueueOptions {
  readonly batchSize?: number;
  readonly endpoint?: string;
  readonly fetcher?: typeof fetch;
  readonly force?: boolean;
  readonly maxRetries?: number;
  readonly now?: () => Date;
  readonly sendBatch?: LearningEventBatchSender;
}

export interface SyncQueueSummary {
  readonly attempted: number;
  readonly accepted: number;
  readonly duplicates: number;
  readonly retryScheduled: number;
  readonly failed: number;
  readonly remaining: number;
  readonly error?: string;
}

export interface InspectQueueOptions {
  readonly includeFailed?: boolean;
  readonly limit?: number;
  readonly onlyDue?: boolean;
  readonly now?: Date;
}

export interface ServiceWorkerMessageResult {
  readonly ok: boolean;
  readonly cached?: number;
  readonly rejected?: readonly string[];
  readonly error?: string;
}

const memoryState = new Map<string, StoredLearnerState>();
const memoryEvents = new Map<string, QueuedLearningEvent>();

let databasePromise: Promise<IDBDatabase | null> | undefined;
let databaseUnavailable = false;
let activeSync: Promise<SyncQueueSummary> | null = null;

function clone<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function requestAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed.")),
      { once: true },
    );
  });
}

function transactionAsPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("IndexedDB transaction aborted.")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB transaction failed.")),
      { once: true },
    );
  });
}

async function openDatabase(): Promise<IDBDatabase | null> {
  if (databaseUnavailable || typeof globalThis.indexedDB === "undefined") {
    return null;
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve) => {
    let request: IDBOpenDBRequest;

    try {
      request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch {
      databaseUnavailable = true;
      resolve(null);
      return;
    }

    request.addEventListener(
      "upgradeneeded",
      () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(LEARNER_STATE_STORE)) {
          database.createObjectStore(LEARNER_STATE_STORE, { keyPath: "key" });
        }

        if (!database.objectStoreNames.contains(LEARNING_EVENT_STORE)) {
          const store = database.createObjectStore(LEARNING_EVENT_STORE, {
            keyPath: "clientUuid",
          });
          store.createIndex("by-queued-at", "queuedAt", { unique: false });
        }
      },
      { once: true },
    );

    request.addEventListener(
      "success",
      () => {
        const database = request.result;
        database.addEventListener("versionchange", () => {
          database.close();
          databasePromise = undefined;
        });
        resolve(database);
      },
      { once: true },
    );

    request.addEventListener(
      "error",
      () => {
        databaseUnavailable = true;
        resolve(null);
      },
      { once: true },
    );

    request.addEventListener(
      "blocked",
      () => {
        databaseUnavailable = true;
        resolve(null);
      },
      { once: true },
    );
  });

  return databasePromise;
}

function disableDatabase(database?: IDBDatabase): void {
  database?.close();
  databaseUnavailable = true;
  databasePromise = undefined;
}

async function runWithStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  const database = await openDatabase();
  if (!database) {
    return fallback();
  }

  try {
    const transaction = database.transaction(storeName, mode);
    const completed = transactionAsPromise(transaction);
    try {
      const result = await operation(transaction.objectStore(storeName));
      await completed;
      return result;
    } catch (error) {
      await completed.catch(() => undefined);
      throw error;
    }
  } catch {
    disableDatabase(database);
    return fallback();
  }
}

export async function saveLearnerState<T>(
  key: string,
  value: T,
): Promise<void> {
  if (!key.trim()) {
    throw new Error("A non-empty learner state key is required.");
  }

  const record: StoredLearnerState<T> = {
    key,
    value: clone(value),
    updatedAt: new Date().toISOString(),
  };

  await runWithStore(
    LEARNER_STATE_STORE,
    "readwrite",
    async (store) => {
      await requestAsPromise(store.put(record));
    },
    () => {
      memoryState.set(key, clone(record));
    },
  );
}

export async function loadLearnerState<T>(key: string): Promise<T | null> {
  const record = await runWithStore<StoredLearnerState<T> | undefined>(
    LEARNER_STATE_STORE,
    "readonly",
    (store) => requestAsPromise(store.get(key)),
    () => memoryState.get(key) as StoredLearnerState<T> | undefined,
  );

  return record ? clone(record.value) : null;
}

export async function removeLearnerState(key: string): Promise<void> {
  await runWithStore(
    LEARNER_STATE_STORE,
    "readwrite",
    async (store) => {
      await requestAsPromise(store.delete(key));
    },
    () => {
      memoryState.delete(key);
    },
  );
}

function validateLearningEvent(event: OfflineLearningEvent): void {
  if (!event.clientUuid?.trim()) {
    throw new Error("Learning events require a stable clientUuid.");
  }

  if (!event.assignmentId || !event.lessonVersionId || !event.blockId) {
    throw new Error(
      "Learning events require assignmentId, lessonVersionId, and blockId.",
    );
  }
}

export function createClientUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

/** Adds an event once. Re-enqueuing the same clientUuid does not overwrite it. */
export async function enqueueLearningEvent(
  event: OfflineLearningEvent,
): Promise<QueuedLearningEvent> {
  validateLearningEvent(event);

  const now = new Date().toISOString();
  const queued: QueuedLearningEvent = {
    clientUuid: event.clientUuid,
    event: clone(event),
    queuedAt: now,
    retryCount: 0,
    nextAttemptAt: now,
    status: "pending",
  };

  const stored = await runWithStore(
    LEARNING_EVENT_STORE,
    "readwrite",
    async (store) => {
      const existing = (await requestAsPromise(
        store.get(event.clientUuid),
      )) as QueuedLearningEvent | undefined;

      if (existing) {
        return clone(existing);
      }

      await requestAsPromise(store.add(queued));
      return clone(queued);
    },
    () => {
      const existing = memoryEvents.get(event.clientUuid);
      if (existing) {
        return clone(existing);
      }
      memoryEvents.set(event.clientUuid, clone(queued));
      return clone(queued);
    },
  );
  dispatchWindowEvent(LEARNING_QUEUE_CHANGE_EVENT, {
    clientUuid: stored.clientUuid,
  });
  return stored;
}

export async function inspectLearningEventQueue(
  options: InspectQueueOptions = {},
): Promise<readonly QueuedLearningEvent[]> {
  const includeFailed = options.includeFailed ?? true;
  const onlyDue = options.onlyDue ?? false;
  const now = (options.now ?? new Date()).getTime();
  const requestedLimit = options.limit ?? Number.POSITIVE_INFINITY;
  const limit = Math.max(0, requestedLimit);

  const records = await runWithStore<QueuedLearningEvent[]>(
    LEARNING_EVENT_STORE,
    "readonly",
    async (store) => {
      const values = (await requestAsPromise(
        store.getAll(),
      )) as QueuedLearningEvent[];
      return values;
    },
    () => [...memoryEvents.values()].map(clone),
  );

  return records
    .filter((entry) => includeFailed || entry.status !== "failed")
    .filter(
      (entry) => !onlyDue || Date.parse(entry.nextAttemptAt) <= now,
    )
    .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
    .slice(0, limit)
    .map(clone);
}

async function replaceQueueEntries(
  updates: readonly QueuedLearningEvent[],
  removals: readonly string[],
): Promise<void> {
  await runWithStore(
    LEARNING_EVENT_STORE,
    "readwrite",
    async (store) => {
      for (const clientUuid of removals) {
        await requestAsPromise(store.delete(clientUuid));
      }
      for (const entry of updates) {
        await requestAsPromise(store.put(entry));
      }
    },
    () => {
      for (const clientUuid of removals) {
        memoryEvents.delete(clientUuid);
      }
      for (const entry of updates) {
        memoryEvents.set(entry.clientUuid, clone(entry));
      }
    },
  );
}

function asErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 240);
  }
  return "The learning event sync did not complete.";
}

function calculateRetry(
  entry: QueuedLearningEvent,
  error: string,
  now: Date,
  maxRetries: number,
): QueuedLearningEvent {
  const retryCount = entry.retryCount + 1;
  const delay = Math.min(2 ** Math.min(retryCount, 16) * 1000, MAX_RETRY_DELAY_MS);
  const exhausted = retryCount >= maxRetries;

  return {
    ...entry,
    retryCount,
    nextAttemptAt: new Date(now.getTime() + delay).toISOString(),
    status: exhausted ? "failed" : "pending",
    lastError: error,
  };
}

function failedEntry(
  entry: QueuedLearningEvent,
  error: string,
  now: Date,
): QueuedLearningEvent {
  return {
    ...entry,
    nextAttemptAt: now.toISOString(),
    status: "failed",
    lastError: error,
  };
}

function normalizeBatchResult(
  result: LearningEventBatchResult | undefined,
  entries: readonly QueuedLearningEvent[],
): Map<string, SyncResultItem> {
  const normalized = new Map<string, SyncResultItem>();

  for (const item of Array.isArray(result?.results) ? result.results : []) {
    normalized.set(item.clientUuid, item);
  }
  for (const clientUuid of result?.acceptedClientUuids ?? []) {
    normalized.set(clientUuid, { clientUuid, status: "accepted" });
  }
  for (const clientUuid of result?.duplicateClientUuids ?? []) {
    normalized.set(clientUuid, { clientUuid, status: "duplicate" });
  }
  for (const clientUuid of result?.retryClientUuids ?? []) {
    normalized.set(clientUuid, { clientUuid, status: "retry" });
  }
  for (const clientUuid of result?.rejectedClientUuids ?? []) {
    normalized.set(clientUuid, { clientUuid, status: "rejected" });
  }

  // An injected sender may intentionally use an empty success response.
  if (result === undefined) {
    for (const entry of entries) {
      normalized.set(entry.clientUuid, {
        clientUuid: entry.clientUuid,
        status: "accepted",
      });
    }
  }

  return normalized;
}

function toSyncPayload(event: OfflineLearningEvent) {
  return {
    clientUuid: event.clientUuid,
    assignmentId: event.assignmentId,
    lessonVersionId: event.lessonVersionId,
    blockId: event.blockId,
    objectiveIds: event.objectiveIds,
    eventType: event.eventType ?? "response_submitted",
    response: event.response,
    attempt: event.attemptNumber,
    clientCreatedAt: event.clientTimestamp,
  };
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }

  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isBatchResult(value: unknown): value is LearningEventBatchResult {
  return typeof value === "object" && value !== null;
}

async function sendBatchToApi(
  events: readonly OfflineLearningEvent[],
  endpoint: string,
  fetcher: typeof fetch,
): Promise<LearningEventBatchResult> {
  const response = await fetcher(endpoint, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ events: events.map(toSyncPayload) }),
  });
  const body = await parseJsonResponse(response);

  if (response.ok && isBatchResult(body)) {
    return body;
  }
  if (response.ok) {
    return {
      results: events.map((event) => ({
        clientUuid: event.clientUuid,
        status: "accepted" as const,
      })),
    };
  }
  if (isBatchResult(body) && Array.isArray(body.results)) {
    return body;
  }

  // Authentication, throttling, timeout, and server failures may succeed later.
  if (
    response.status === 401 ||
    response.status === 403 ||
    response.status === 408 ||
    response.status === 425 ||
    response.status === 429 ||
    response.status >= 500
  ) {
    throw new Error(`Sync request failed with HTTP ${response.status}.`);
  }

  return {
    results: events.map((event) => ({
      clientUuid: event.clientUuid,
      status: "rejected" as const,
      error: {
        code: `HTTP_${response.status}`,
        message: "The server rejected this event.",
      },
    })),
  };
}

function dispatchWindowEvent(name: string, detail: unknown): void {
  if (
    typeof globalThis.window === "undefined" ||
    typeof globalThis.CustomEvent !== "function"
  ) {
    return;
  }

  globalThis.window.dispatchEvent(new CustomEvent(name, { detail }));
}

async function performSync(
  options: SyncQueueOptions,
): Promise<SyncQueueSummary> {
  const now = options.now ?? (() => new Date());
  const batchSize = Math.min(
    100,
    Math.max(1, Math.floor(options.batchSize ?? DEFAULT_BATCH_SIZE)),
  );
  const maxRetries = Math.max(1, options.maxRetries ?? DEFAULT_MAX_RETRIES);
  const candidates = await inspectLearningEventQueue({
    includeFailed: false,
    onlyDue: !options.force,
    now: now(),
  });
  const sender =
    options.sendBatch ??
    ((events: readonly OfflineLearningEvent[]) =>
      sendBatchToApi(
        events,
        options.endpoint ?? DEFAULT_SYNC_ENDPOINT,
        options.fetcher ?? globalThis.fetch.bind(globalThis),
      ));

  let accepted = 0;
  let duplicates = 0;
  let retryScheduled = 0;
  let failed = 0;
  let lastError: string | undefined;

  for (let offset = 0; offset < candidates.length; offset += batchSize) {
    const batch = candidates.slice(offset, offset + batchSize);
    const batchNow = now();

    try {
      const response = await sender(batch.map((entry) => clone(entry.event)));
      const results = normalizeBatchResult(response, batch);
      const updates: QueuedLearningEvent[] = [];
      const removals: string[] = [];

      for (const entry of batch) {
        const item = results.get(entry.clientUuid);

        if (item?.status === "accepted") {
          accepted += 1;
          removals.push(entry.clientUuid);
        } else if (item?.status === "duplicate") {
          duplicates += 1;
          removals.push(entry.clientUuid);
        } else if (item?.status === "rejected" && !item.error?.retryable) {
          failed += 1;
          updates.push(
            failedEntry(
              entry,
              item.error?.message ?? item.error?.code ?? "Event rejected.",
              batchNow,
            ),
          );
        } else {
          const retried = calculateRetry(
            entry,
            item?.error?.message ?? "No acknowledgement was received.",
            batchNow,
            maxRetries,
          );
          if (retried.status === "failed") {
            failed += 1;
          } else {
            retryScheduled += 1;
          }
          updates.push(retried);
        }
      }

      await replaceQueueEntries(updates, removals);
    } catch (error) {
      lastError = asErrorMessage(error);
      const retried = batch.map((entry) =>
        calculateRetry(entry, lastError ?? "Sync failed.", batchNow, maxRetries),
      );
      retryScheduled += retried.filter((entry) => entry.status === "pending").length;
      failed += retried.filter((entry) => entry.status === "failed").length;
      await replaceQueueEntries(retried, []);
    }
  }

  const remaining = (await inspectLearningEventQueue()).length;
  const summary: SyncQueueSummary = {
    attempted: candidates.length,
    accepted,
    duplicates,
    retryScheduled,
    failed,
    remaining,
    ...(lastError ? { error: lastError } : {}),
  };
  dispatchWindowEvent(LEARNING_SYNC_EVENT, summary);
  return summary;
}

/**
 * Synchronizes all currently due events. Concurrent callers share one sync run,
 * while stable client UUIDs let the server safely identify network retries.
 */
export function syncQueuedLearningEvents(
  options: SyncQueueOptions = {},
): Promise<SyncQueueSummary> {
  if (activeSync) {
    return activeSync;
  }

  activeSync = performSync(options).finally(() => {
    activeSync = null;
  });
  return activeSync;
}

export async function retryFailedLearningEvents(): Promise<number> {
  const failed = (await inspectLearningEventQueue()).filter(
    (entry) => entry.status === "failed",
  );
  const now = new Date().toISOString();

  await replaceQueueEntries(
    failed.map((entry) => ({
      ...entry,
      status: "pending",
      retryCount: 0,
      nextAttemptAt: now,
      lastError: undefined,
    })),
    [],
  );

  if (failed.length > 0) {
    dispatchWindowEvent(LEARNING_QUEUE_CHANGE_EVENT, {
      retried: failed.length,
    });
  }

  return failed.length;
}

export function dispatchConnectivityChange(online: boolean): void {
  dispatchWindowEvent(CONNECTIVITY_CHANGE_EVENT, { online });
}

export function installOnlineSyncTrigger(
  sync: () => Promise<unknown> = () =>
    syncQueuedLearningEvents({ force: true }),
  options: { readonly runOnStart?: boolean } = {},
): () => void {
  if (typeof globalThis.window === "undefined") {
    return () => undefined;
  }

  let stopped = false;
  let running = false;
  let runAgain = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const clearRetryTimer = () => {
    if (retryTimer) {
      globalThis.clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const scheduleNextRetry = async () => {
    clearRetryTimer();
    if (stopped || globalThis.navigator?.onLine === false) {
      return;
    }

    const pending = await inspectLearningEventQueue({ includeFailed: false });
    const nextAttempt = Math.min(
      ...pending.map((entry) => Date.parse(entry.nextAttemptAt)),
    );
    if (!Number.isFinite(nextAttempt)) {
      return;
    }

    const delay = Math.max(250, nextAttempt - Date.now());
    retryTimer = globalThis.setTimeout(run, delay);
  };

  const run = () => {
    if (stopped) {
      return;
    }
    clearRetryTimer();
    if (running) {
      runAgain = true;
      return;
    }

    running = true;
    void sync()
      .catch(() => {
        // The queue keeps failed sends for a later retry; avoid an unhandled event.
      })
      .finally(async () => {
        running = false;
        await scheduleNextRetry();
        if (runAgain) {
          runAgain = false;
          run();
        }
      })
      .catch(() => {
        // IndexedDB becoming unavailable must not create an unhandled promise.
      });
  };
  const onOffline = () => clearRetryTimer();
  const onQueueChange = () => {
    if (globalThis.navigator?.onLine !== false) {
      run();
    }
  };
  globalThis.window.addEventListener("online", run);
  globalThis.window.addEventListener("offline", onOffline);
  globalThis.window.addEventListener(LEARNING_QUEUE_CHANGE_EVENT, onQueueChange);

  if ((options.runOnStart ?? true) && globalThis.navigator?.onLine !== false) {
    queueMicrotask(run);
  }

  return () => {
    stopped = true;
    clearRetryTimer();
    globalThis.window.removeEventListener("online", run);
    globalThis.window.removeEventListener("offline", onOffline);
    globalThis.window.removeEventListener(
      LEARNING_QUEUE_CHANGE_EVENT,
      onQueueChange,
    );
  };
}

async function postServiceWorkerMessage(
  message: Readonly<Record<string, unknown>>,
  timeoutMs = 15_000,
): Promise<ServiceWorkerMessageResult> {
  if (
    typeof globalThis.navigator === "undefined" ||
    !("serviceWorker" in globalThis.navigator)
  ) {
    return { ok: false, error: "Service workers are unavailable." };
  }

  try {
    const registration =
      typeof globalThis.navigator.serviceWorker.getRegistration === "function"
        ? await globalThis.navigator.serviceWorker.getRegistration()
        : undefined;
    const worker = globalThis.navigator.serviceWorker.controller ?? registration?.active;
    if (!worker) {
      return { ok: false, error: "No active service worker is available." };
    }

    if (typeof globalThis.MessageChannel !== "function") {
      worker.postMessage(message);
      return { ok: true };
    }

    return await new Promise<ServiceWorkerMessageResult>((resolve) => {
      const channel = new MessageChannel();
      const timer = globalThis.setTimeout(() => {
        channel.port1.close();
        resolve({ ok: false, error: "The service worker did not respond." });
      }, timeoutMs);

      channel.port1.addEventListener(
        "message",
        (event: MessageEvent<ServiceWorkerMessageResult>) => {
          globalThis.clearTimeout(timer);
          channel.port1.close();
          resolve(event.data);
        },
        { once: true },
      );
      channel.port1.start();
      worker.postMessage(message, [channel.port2]);
    });
  } catch (error) {
    return { ok: false, error: asErrorMessage(error) };
  }
}

export async function cacheLessonUrls(
  urls: readonly string[],
): Promise<ServiceWorkerMessageResult> {
  const normalized = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  return postServiceWorkerMessage({
    type: "CACHE_LESSON_URLS",
    urls: normalized,
  });
}

export function clearPrivateServiceWorkerCaches(): Promise<ServiceWorkerMessageResult> {
  return (async () => {
    const workerResult = await postServiceWorkerMessage({
      type: "CLEAR_PRIVATE_CACHES",
    });

    if (typeof globalThis.caches === "undefined") {
      return workerResult;
    }

    try {
      const names = await globalThis.caches.keys();
      const privateNames = names.filter((name) =>
        /^(?:quantro-ai|future-minds)-(?:navigation|lessons)-/.test(name),
      );
      await Promise.all(
        privateNames.map((name) => globalThis.caches.delete(name)),
      );
      return { ok: true };
    } catch {
      return workerResult;
    }
  })();
}

/** Clears all learner state and queued responses on logout/shared-device handoff. */
export async function purgeOfflineLearnerData(): Promise<void> {
  const database = await openDatabase();

  if (database) {
    try {
      const transaction = database.transaction(
        [LEARNER_STATE_STORE, LEARNING_EVENT_STORE],
        "readwrite",
      );
      const completed = transactionAsPromise(transaction);
      transaction.objectStore(LEARNER_STATE_STORE).clear();
      transaction.objectStore(LEARNING_EVENT_STORE).clear();
      await completed;
    } catch {
      disableDatabase(database);
    }
  }

  memoryState.clear();
  memoryEvents.clear();
  await clearPrivateServiceWorkerCaches();
}
