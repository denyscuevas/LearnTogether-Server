import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prismaClient.ts";
import { confirmMeeting, getMeeting, getMyMeetings } from "../controllers/MeetingController.ts";

const originals = {
    findUnique: prisma.meeting.findUnique,
    findMany: prisma.meeting.findMany,
    createMany: prisma.meetingConfirmation.createMany,
};

afterEach(() => {
    prisma.meeting.findUnique = originals.findUnique;
    prisma.meeting.findMany = originals.findMany;
    prisma.meetingConfirmation.createMany = originals.createMany;
    mock.restoreAll();
});

function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

function request(userId, meetingId = "meeting-1") {
    return { user: userId ? { id: userId } : undefined, params: { meetingId } };
}

function setupMeeting(overrides = {}) {
    const meeting = {
        id: "meeting-1",
        creatorId: "creator",
        attendeeIds: ["creator", "attendee"],
        endTime: new Date("2020-01-01T00:00:00Z"),
        ...overrides,
    };
    const confirmations = new Map();
    const detailed = () => ({
        ...meeting,
        course: { code: "COMP", name: "Computing" },
        confirmations: [...confirmations.values()],
    });
    prisma.meeting.findUnique = mock.fn(async ({ where, include }) => {
        if (where.id !== meeting.id) return null;
        return include ? detailed() : meeting;
    });
    prisma.meeting.findMany = mock.fn(async () => [detailed()]);
    const create = prisma.meetingConfirmation.createMany = mock.fn(async ({ data, skipDuplicates }) => {
        assert.equal(skipDuplicates, true);
        for (const { meetingId, userId } of data) {
            assert.equal(meetingId, meeting.id);
            if (!confirmations.has(userId)) confirmations.set(userId, { userId, confirmedAt: new Date() });
        }
        return { count: 1 };
    });
    return { meeting, confirmations, create };
}

test("only authenticated attendees can confirm an existing meeting", async () => {
    const { create } = setupMeeting();
    for (const [user, id, status] of [
        [undefined, "meeting-1", 401],
        ["stranger", "meeting-1", 404],
        ["creator", "missing", 404],
    ]) {
        const res = response();
        await confirmMeeting(request(user, id), res);
        assert.equal(res.statusCode, status);
    }
    assert.equal(create.mock.callCount(), 0);
});

test("attendees cannot confirm a meeting before its end", async () => {
    const { create } = setupMeeting({ endTime: new Date(Date.now() + 60_000) });
    const res = response();
    await confirmMeeting(request("creator"), res);
    assert.equal(res.statusCode, 409);
    assert.equal(create.mock.callCount(), 0);
});

test("confirmations are idempotent and all attendees must confirm", async () => {
    const { confirmations } = setupMeeting();
    const first = response();
    await confirmMeeting(request("creator"), first);
    assert.deepEqual(first.body.meeting.confirmationStatus, {
        confirmedCount: 1, totalAttendees: 2, isFullyConfirmed: false,
    });

    const repeated = [response(), response()];
    await Promise.all(repeated.map((res) => confirmMeeting(request("creator"), res)));
    assert.equal(confirmations.size, 1);
    for (const res of repeated) {
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.meeting.confirmationStatus.isFullyConfirmed, false);
    }

    const last = response();
    await confirmMeeting(request("attendee"), last);
    assert.deepEqual(last.body.meeting.confirmationStatus, {
        confirmedCount: 2, totalAttendees: 2, isFullyConfirmed: true,
    });
    assert.deepEqual(last.body.meeting.confirmations.map(({ userId }) => userId), ["creator", "attendee"]);
});

test("meeting reads expose confirmation progress without counting non-attendees", async () => {
    const { confirmations } = setupMeeting();
    confirmations.set("creator", { userId: "creator", confirmedAt: new Date() });
    confirmations.set("stranger", { userId: "stranger", confirmedAt: new Date() });
    const single = response();
    await getMeeting(request("creator"), single);
    const list = response();
    await getMyMeetings(request("creator"), list);
    const expected = { confirmedCount: 1, totalAttendees: 2, isFullyConfirmed: false };
    assert.deepEqual(single.body.meeting.confirmationStatus, expected);
    assert.deepEqual(list.body.meetings[0].confirmationStatus, expected);
});

test("different attendees can confirm concurrently", async () => {
    const { confirmations } = setupMeeting();
    const responses = [response(), response()];
    await Promise.all([
        confirmMeeting(request("creator"), responses[0]),
        confirmMeeting(request("attendee"), responses[1]),
    ]);
    assert.equal(confirmations.size, 2);
    for (const res of responses) assert.equal(res.statusCode, 200);
    const latest = response();
    await getMeeting(request("creator"), latest);
    assert.equal(latest.body.meeting.confirmationStatus.isFullyConfirmed, true);
});

test("a failed confirmation write returns an error", async () => {
    setupMeeting();
    prisma.meetingConfirmation.createMany.mock.mockImplementation(async () => { throw new Error("database failure"); });
    mock.method(console, "error", () => {});
    const res = response();
    await confirmMeeting(request("creator"), res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, "Failed to confirm meeting");
    assert.equal(console.error.mock.callCount(), 1);
});

test("the confirmation route requires authentication and uses the token identity", async () => {
    setupMeeting();
    process.env.REDIS_PUBLIC_URL = "redis://127.0.0.1:6379";
    process.env.JWT_SECRET = "test-only-secret";
    const { default: router } = await import("../routes/meeting.ts");
    const { default: redis } = await import("../services/redis.ts");
    redis.disconnect();
    mock.method(redis, "get", async () => "0");
    const app = express();
    app.use("/api/meetings", router);
    const server = await new Promise((resolve) => {
        const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });

    try {
        const url = `http://127.0.0.1:${server.address().port}/api/meetings/meeting-1/confirm`;
        const unauthenticated = await fetch(url, { method: "POST" });
        assert.equal(unauthenticated.status, 401);

        const token = jwt.sign({ id: "attendee" }, process.env.JWT_SECRET);
        const authenticated = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(authenticated.status, 200);
        const body = await authenticated.json();
        assert.deepEqual(body.meeting.confirmations.map(({ userId }) => userId), ["attendee"]);
        assert.equal(body.meeting.confirmationStatus.isFullyConfirmed, false);
    } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});
