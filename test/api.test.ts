import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import mongoose, { Types } from 'mongoose';
import { app } from '../src/app';
import { Session, Teacher, User } from '../src/models';

let server: Server | undefined;
let baseUrl: string;
let databaseReady = false;

before(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017', {
    dbName: `englishyaari_test_${randomUUID().replaceAll('-', '')}`,
    serverSelectionTimeoutMS: 5000,
  });
  databaseReady = true;
  await Promise.all([User.init(), Teacher.init(), Session.init()]);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  try {
    if (server?.listening) {
      const closed = once(server, 'close');
      server.close();
      await closed;
    }
    if (databaseReady) await mongoose.connection.dropDatabase();
  } finally {
    await mongoose.disconnect();
  }
});

async function request(status: number, path: string, method = 'GET', body?: object) {
  const result = await fetch(baseUrl + path, {
    method,
    ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await result.json();
  assert.equal(result.status, status, JSON.stringify(data));
  return data;
}

test('booking lifecycle, UTC availability, and concurrent state transitions', async () => {
  const teacher = await Teacher.create({
    fullName: 'Demo Teacher', email: 'teacher@example.com', specialization: 'English', experience: 5,
  });
  const learner = { fullName: 'Demo User', email: 'Learner@Example.com', phone: '+919876543210' };
  const user = await request(201, '/users', 'POST', learner);
  assert.equal(user.email, 'learner@example.com');
  await request(409, '/users', 'POST', { ...learner, email: ' learner@example.com ' });
  await request(400, '/users', 'POST', { ...learner, phone: 123 });

  const unknownId = new Types.ObjectId().toString();
  const historyPath = `/users/${user._id}/sessions`;
  const availability = `/sessions/available?dateTimestamp=${Date.parse('2030-01-01T14:00:00Z')}`;
  const slot = { teacherId: teacher.id, startTime: '2030-01-01T00:00:00Z', endTime: '2030-01-01T00:30:00Z' };
  await request(400, '/sessions', 'POST', { ...slot, endTime: slot.startTime });
  await request(400, '/sessions', 'POST', { ...slot, startTime: '2029-02-30T00:00:00Z' });
  await request(404, '/sessions', 'POST', { ...slot, teacherId: unknownId });
  await request(400, '/sessions/available?dateTimestamp=invalid');
  await request(404, `/users/${unknownId}/sessions`);
  assert.deepEqual(await request(200, historyPath), { upcomingSessions: [], completedSessions: [] });

  const session = await request(201, '/sessions', 'POST', slot);
  assert.equal(session.status, 'AVAILABLE');
  assert.equal(session.userId, null);
  assert.equal(session.completedAt, null);
  await request(201, '/sessions', 'POST', {
    ...slot, startTime: '2030-01-02T00:00:00Z', endTime: '2030-01-02T00:30:00Z',
  });
  assert.deepEqual(await request(200, availability), [session]);

  const bookPath = `/sessions/${session._id}/book`;
  const completePath = `/sessions/${session._id}/complete`;
  await request(409, completePath, 'PATCH');
  await request(404, bookPath, 'POST', { userId: unknownId });
  await request(404, `/sessions/${unknownId}/book`, 'POST', { userId: user._id });
  await request(404, `/sessions/${unknownId}/complete`, 'PATCH');

  const booking = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id }) };
  const responses = await Promise.all([fetch(baseUrl + bookPath, booking), fetch(baseUrl + bookPath, booking)]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
  const bodies = await Promise.all(responses.map(async (response) => await response.json()));
  const booked = bodies[responses.findIndex((response) => response.status === 200)];
  assert.equal(booked.userId, user._id);
  assert.equal(booked.status, 'BOOKED');
  assert.deepEqual(await request(200, availability), []);
  assert.deepEqual(await request(200, historyPath), { upcomingSessions: [booked], completedSessions: [] });

  const completed = await request(200, completePath, 'PATCH');
  assert.equal(completed.status, 'COMPLETED');
  assert.ok(Number.isFinite(Date.parse(completed.completedAt)));
  await request(409, completePath, 'PATCH');
  await request(409, bookPath, 'POST', { userId: user._id });
  assert.deepEqual(await request(200, historyPath), { upcomingSessions: [], completedSessions: [completed] });
});
