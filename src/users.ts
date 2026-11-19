import { Router } from 'express';
import { HttpError } from './http';
import { Session, SessionStatus, User } from './models';
import { objectId, requiredText } from './validation';

export const users = Router();

users.post('/', async (request, response) => {
  const fullName = requiredText(request.body?.fullName, 'fullName');
  const email = requiredText(request.body?.email, 'email').toLowerCase();
  const phone = requiredText(request.body?.phone, 'phone');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'email must be a valid email address');
  }

  const user = await User.create({ fullName, email, phone });
  response.status(201).json(user);
});

users.get('/:id/sessions', async (request, response) => {
  const userId = objectId(request.params.id, 'id');
  if (!await User.exists({ _id: userId })) {
    throw new HttpError(404, 'User not found');
  }

  const [history] = await Session.aggregate([
    { $match: { userId } },
    {
      $facet: {
        upcomingSessions: [
          { $match: { status: SessionStatus.booked } },
          { $sort: { startTime: 1, _id: 1 } },
        ],
        completedSessions: [
          { $match: { status: SessionStatus.completed } },
          { $sort: { completedAt: -1, _id: 1 } },
        ],
      },
    },
  ]);

  response.json(history);
});
