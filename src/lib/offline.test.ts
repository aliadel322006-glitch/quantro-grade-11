import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  enqueueLearningEvent,
  inspectLearningEventQueue,
  installOnlineSyncTrigger,
  loadLearnerState,
  purgeOfflineLearnerData,
  retryFailedLearningEvents,
  saveLearnerState,
  syncQueuedLearningEvents,
  type OfflineLearningEvent,
} from "@/lib/offline";

function learningEvent(
  clientUuid: string,
  response = "first answer",
): OfflineLearningEvent {
  return {
    clientUuid,
    learnerId: "learner-1",
    assignmentId: "assignment-1",
    lessonVersionId: "lesson-version-1",
    blockId: "block-1",
    objectiveIds: ["objective-1"],
    response,
    attemptNumber: 1,
    clientTimestamp: "2026-08-26T00:00:00.000Z",
  };
}

describe("offline learner storage", () => {
  beforeEach(async () => {
    await purgeOfflineLearnerData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves a defensive copy of learner state", async () => {
    const state = { currentBlockId: "block-2", answers: ["a"] };
    await saveLearnerState("assignment-1", state);
    state.answers.push("changed-after-save");

    await expect(loadLearnerState("assignment-1")).resolves.toEqual({
      currentBlockId: "block-2",
      answers: ["a"],
    });
  });

  it("uses clientUuid as an idempotency key without overwriting the first event", async () => {
    await enqueueLearningEvent(learningEvent("event-1", "original"));
    const duplicate = await enqueueLearningEvent(
      learningEvent("event-1", "replacement"),
    );

    expect(duplicate.event.response).toBe("original");
    const queued = await inspectLearningEventQueue();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.event.response).toBe("original");
  });

  it("removes accepted and server-identified duplicate events", async () => {
    await enqueueLearningEvent(learningEvent("accepted-event"));
    await enqueueLearningEvent(learningEvent("duplicate-event"));

    const summary = await syncQueuedLearningEvents({
      sendBatch: async () => ({
        results: [
          { clientUuid: "accepted-event", status: "accepted" },
          { clientUuid: "duplicate-event", status: "duplicate" },
        ],
      }),
    });

    expect(summary).toMatchObject({
      attempted: 2,
      accepted: 1,
      duplicates: 1,
      remaining: 0,
    });
    await expect(inspectLearningEventQueue()).resolves.toHaveLength(0);
  });

  it("retains a transient failure and can force a later retry", async () => {
    await enqueueLearningEvent(learningEvent("event-for-retry"));

    const first = await syncQueuedLearningEvents({
      force: true,
      now: () => new Date("2026-08-26T01:00:00.000Z"),
      sendBatch: async () => {
        throw new Error("Network unavailable");
      },
    });
    expect(first.retryScheduled).toBe(1);

    const waiting = await inspectLearningEventQueue();
    expect(waiting[0]).toMatchObject({
      retryCount: 1,
      status: "pending",
      lastError: "Network unavailable",
    });

    const second = await syncQueuedLearningEvents({
      force: true,
      sendBatch: async (events) => ({
        results: events.map((event) => ({
          clientUuid: event.clientUuid,
          status: "accepted" as const,
        })),
      }),
    });
    expect(second.accepted).toBe(1);
    await expect(inspectLearningEventQueue()).resolves.toHaveLength(0);
  });

  it("keeps rejected events inspectable until an explicit retry", async () => {
    await enqueueLearningEvent(learningEvent("invalid-event"));

    await syncQueuedLearningEvents({
      sendBatch: async () => ({
        results: [
          {
            clientUuid: "invalid-event",
            status: "rejected",
            error: { code: "INVALID_BLOCK", message: "Unknown block." },
          },
        ],
      }),
    });

    const queued = await inspectLearningEventQueue();
    expect(queued[0]).toMatchObject({
      status: "failed",
      lastError: "Unknown block.",
    });
    await expect(retryFailedLearningEvents()).resolves.toBe(1);
    expect((await inspectLearningEventQueue())[0]?.status).toBe("pending");
  });

  it("maps local fields to the versioned sync API contract", async () => {
    await enqueueLearningEvent(learningEvent("wire-event"));
    const fetcher = vi.fn(
      async (...args: [RequestInfo | URL, RequestInit?]) => {
        void args;
        return new Response(
          JSON.stringify({
            results: [{ clientUuid: "wire-event", status: "accepted" }],
            syncedAt: "2026-08-26T01:00:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    );

    await syncQueuedLearningEvents({ fetcher });

    expect(fetcher).toHaveBeenCalledOnce();
    const [endpoint, request] = fetcher.mock.calls[0] ?? [];
    expect(endpoint).toBe("/api/v1/events/sync");
    expect(JSON.parse(String(request?.body))).toEqual({
      events: [
        {
          clientUuid: "wire-event",
          assignmentId: "assignment-1",
          lessonVersionId: "lesson-version-1",
          blockId: "block-1",
          objectiveIds: ["objective-1"],
          eventType: "response_submitted",
          response: "first answer",
          attempt: 1,
          clientCreatedAt: "2026-08-26T00:00:00.000Z",
        },
      ],
    });
  });

  it("runs the supplied synchronization callback when connectivity returns", async () => {
    const sync = vi.fn(async () => undefined);
    const stop = installOnlineSyncTrigger(sync, { runOnStart: false });

    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(sync).toHaveBeenCalledOnce());

    stop();
  });
});
