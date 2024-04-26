import * as config from 'config';
import Redis from 'ioredis';

const redisClient = new Redis({
  port: config.get<number>('REDIS_PORT'),
  host: config.get<string>('REDIS_HOST'),
  // Add other configuration options if required
});

export default redisClient;
