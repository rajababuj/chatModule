import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

import * as log4js from 'log4js';
log4js.configure({
  appenders: {
    everything: {
      type: 'dateFile',
      filename: './logger/playage.log',
      maxLogSize: 10485760,
      backups: 3,
      compress: true,
    },
  },
  categories: {
    default: { appenders: ['everything'], level: 'debug' },
  },
});
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:3000','http://localhost:3001', 'https://playage.elaunchinfotech.in/', 'http://194.233.85.136:9030'],
    credentials: true, // Make sure to include this if you are using credentials
  });
  app.use(cookieParser());
  await app.listen(3000);
}
bootstrap();
