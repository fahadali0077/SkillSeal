import 'dotenv/config';
import app from './app';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { createServer } from 'http';
import { initSocket } from './config/socket';
import logger from './utils/logger';

const PORT = process.env.PORT || 10000;

async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();

    const httpServer = createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
