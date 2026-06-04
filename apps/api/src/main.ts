import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  console.log(`OpenMDIM API listening on http://localhost:${port}`);
}

void bootstrap();
