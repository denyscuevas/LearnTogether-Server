import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prismaClient.ts";
import { getCourse } from "../controllers/CourseController.ts";

const originalFindUnique = prisma.course.findUnique;

afterEach(() => {
    prisma.course.findUnique = originalFindUnique;
    mock.restoreAll();
});

function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("looks up the course ID and returns its code and name", async () => {
    prisma.course.findUnique = mock.fn(async () => ({ code: "COMP-1000", name: "Computing" }));
    const res = response();
    await getCourse({ params: { courseId: "123" } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { code: "COMP-1000", name: "Computing" });
    assert.deepEqual(prisma.course.findUnique.mock.calls[0].arguments[0], {
        where: { id: 123 },
        select: { code: true, name: true },
    });
});

test("rejects malformed or out-of-range IDs without querying", async () => {
    prisma.course.findUnique = mock.fn();
    for (const id of [undefined, "", "0", "-1", "1.5", "1e2", " 1", "abc", "2147483648", "999999999999999999999"]) {
        const res = response();
        await getCourse({ params: { courseId: id } }, res);
        assert.equal(res.statusCode, 400, `ID ${id}`);
    }
    assert.equal(prisma.course.findUnique.mock.callCount(), 0);
});

test("returns 404 for a missing course", async () => {
    prisma.course.findUnique = mock.fn(async () => null);
    const res = response();
    await getCourse({ params: { courseId: "42" } }, res);
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { message: "Course not found" });
});

test("logs and reports database errors", async () => {
    prisma.course.findUnique = mock.fn(async () => { throw new Error("database failure"); });
    mock.method(console, "error", () => {});
    const res = response();
    await getCourse({ params: { courseId: "42" } }, res);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message: "Failed to fetch course" });
    assert.equal(console.error.mock.callCount(), 1);
});

test("course route requires authentication and serves the lookup", async () => {
    prisma.course.findUnique = mock.fn(async () => ({ code: "COMP-1000", name: "Computing" }));
    process.env.REDIS_PUBLIC_URL = "redis://127.0.0.1:6379";
    process.env.JWT_SECRET = "test-only-secret";
    const { default: router } = await import("../routes/course.ts");
    const { default: redis } = await import("../services/redis.ts");
    redis.disconnect();
    mock.method(redis, "get", async () => "0");
    const app = express();
    app.use("/api/courses", router);
    const server = await new Promise((resolve) => {
        const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });

    try {
        const url = `http://127.0.0.1:${server.address().port}/api/courses/42`;
        const unauthenticated = await fetch(url);
        assert.equal(unauthenticated.status, 401);
        const token = jwt.sign({ id: "user-1" }, process.env.JWT_SECRET);
        const authenticated = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        assert.equal(authenticated.status, 200);
        assert.deepEqual(await authenticated.json(), { code: "COMP-1000", name: "Computing" });
        assert.equal(prisma.course.findUnique.mock.calls[0].arguments[0].where.id, 42);
    } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});
