import { app } from './app';
import { connectDatabase } from './database';
import { Session, User } from './models';

async function start(): Promise<void> {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  await connectDatabase();
  await User.createIndexes();
  await Session.init();
  const server = app.listen(port, () => console.log(`Listening on port ${port}`));
  server.on('error', (error) => {
    console.error('Could not start HTTP server', error);
    process.exit(1);
  });
}

void (async () => {
  try {
    await start();
  } catch (error) {
    console.error('Could not start the application', error);
    process.exit(1);
  }
})();
