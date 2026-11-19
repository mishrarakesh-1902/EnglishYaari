import express from 'express';
import { handleError, HttpError } from './http';
import { sessions } from './sessions';
import { users } from './users';

export const app = express();

app.use(express.json());
app.use('/users', users);
app.use('/sessions', sessions);
app.use(() => {
  throw new HttpError(404, 'Route not found');
});
app.use(handleError);
