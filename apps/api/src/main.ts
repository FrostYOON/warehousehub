import 'reflect-metadata';
import * as fs from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  BadRequestException,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

const UNSAFE_JWT_SECRETS = [
  'change_me_long_random_string',
  'change_me',
  'secret',
  'jwt_secret',
  'test',
];

function validateJwtSecretForProduction(cfg: ConfigService): void {
  if (cfg.get<string>('NODE_ENV') !== 'production') return;

  const secret = cfg.get<string>('JWT_SECRET');
  if (!secret || secret.length < 32) {
    throw new Error(
      'Production requires JWT_SECRET to be set and at least 32 characters. ' +
        'Use a cryptographically secure random string.',
    );
  }
  if (UNSAFE_JWT_SECRETS.some((s) => secret.toLowerCase().includes(s))) {
    throw new Error(
      'JWT_SECRET must not contain default or predictable values in production.',
    );
  }
}

async function bootstrap() {
  // uploads 디렉터리 보장 (monorepo/turbo 환경에서 pathError 방지)
  const uploadsRoot = join(__dirname, '..', 'uploads');
  const uploadsProfiles = join(uploadsRoot, 'profiles');
  for (const dir of [uploadsRoot, uploadsProfiles]) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.warn(`Failed to ensure uploads dir: ${dir}`, err);
    }
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // /uploads 정적 서빙 (ServeStaticModule 대체 - path-to-regexp PathError 방지)
  app.use('/uploads', express.static(uploadsRoot));

  const cfg = app.get(ConfigService);
  validateJwtSecretForProduction(cfg);

  const port = cfg.get<number>('API_PORT', 3001);

  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS (web 붙을 때: HttpOnly cookie 사용하려면 credentials + 정확한 origin 필요)
  const originsRaw = cfg.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const origins = originsRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length > 0 ? origins : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cache-Control',
      'Pragma',
      'X-Request-Id',
      'X-Device-Id',
      'X-Device-Name',
      'X-Client-Device-Id',
      'X-Client-Device-Name',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((e) =>
          e.constraints ? Object.values(e.constraints) : [`${e.property}: invalid`],
        );
        return new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: messages.join('; '),
          details: { errors: errors.map((e) => ({ property: e.property, constraints: e.constraints })) },
        });
      },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger (프로덕션 기본 비활성화, SWAGGER_ENABLED=true로 명시 시 활성화)
  const swaggerEnabled =
    cfg.get<string>(
      'SWAGGER_ENABLED',
      process.env.NODE_ENV === 'production' ? 'false' : 'true',
    ) !== 'false';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('WarehouseHub API')
      .setDescription('WarehouseHub API description')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port);
  console.log(`Server is running on port ${port}`);
  if (swaggerEnabled) {
    console.log(`Swagger is running on port ${port}/api`);
  }
}
void bootstrap();
