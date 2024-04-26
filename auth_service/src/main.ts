import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as log4js from 'log4js';

log4js.configure({
  appenders: {
    everything: {
      type: 'dateFile',
      filename: './logger/playage.log',
      maxLogSize: 10485760,
      backups: 3,
      compress: true
    }
  },
  categories: {
    default: { appenders: ['everything'], level: 'debug' }
  }
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      port: 9020,
    },
  });
  await app.startAllMicroservices();
  // app.use(cookieParser());
  // await app.listen(9022);
}
bootstrap();