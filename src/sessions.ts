import { Router } from 'express';
import { HttpError } from './http';
import { Session, SessionStatus, Teacher, User } from './models';
import { objectId, sessionDate, utcDay } from './validation';

export const sessions = Router();

sessions.post('/', async (request, response) => {
  const teacherId = objectId(request.body?.teacherId, 'teacherId');
  const startTime = sessionDate(request.body?.startTime, 'startTime');
  const endTime = sessionDate(request.body?.endTime, 'endTime');
  if (endTime <= startTime) {
    throw new HttpError(400, 'endTime must be greater than startTime');
  }
  if (!await Teacher.exists({ _id: teacherId })) {
    throw new HttpError(404, 'Teacher not found');
  }

  const session = await Session.create({ teacherId, startTime, endTime });
  response.status(201).json(session);
});

sessions.get('/available', async (request, response) => {
  const startTime = utcDay(request.query.dateTimestamp);
  const available = await Session.aggregate([
    { $match: { status: SessionStatus.available, startTime } },
    { $sort: { startTime: 1, _id: 1 } },
  ]);

  response.json(available);
});

sessions.post('/:id/book', async (request, response) => {
  const id = objectId(request.params.id, 'id');
  const userId = objectId(request.body?.userId, 'userId');
  if (!await User.exists({ _id: userId })) {
    throw new HttpError(404, 'User not found');
  }

  const session = await Session.findOneAndUpdate(
    { _id: id, status: SessionStatus.available },
    { $set: { status: SessionStatus.booked, userId } },
    { new: true },
  );

  if (!session) {
    if (!await Session.exists({ _id: id })) throw new HttpError(404, 'Session not found');
    throw new HttpError(409, 'Only available sessions can be booked');
  }
  response.json(session);
});

sessions.patch('/:id/complete', async (request, response) => {
  const id = objectId(request.params.id, 'id');
  const session = await Session.findOneAndUpdate(
    { _id: id, status: SessionStatus.booked },
    { $set: { status: SessionStatus.completed }, $currentDate: { completedAt: true } },
    { new: true },
  );

  if (!session) {
    if (!await Session.exists({ _id: id })) throw new HttpError(404, 'Session not found');
    throw new HttpError(409, 'Only booked sessions can be completed');
  }
  response.json(session);
});
