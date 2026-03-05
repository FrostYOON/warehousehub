import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const cfg = app.get(ConfigService);
  const port = cfg.get<number>('API_PORT', 3001);

  app.use(cookieParser());

  // CORS (web 붙을 때: HttpOnly cookie 사용하려면 credentials + 정확한 origin 필요)
  const originsRaw = cfg.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const origins = originsRaw.split(',').map((o) => o.trim()).filter(Boolean);

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
      // enableImplicitConversion: true 시 Boolean("false")가 true로 잘못 변환됨
      // (비어있지 않은 문자열은 JS에서 truthy). isActive=false 쿼리 파싱 오류 방지.
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger
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

  await app.listen(port);
  console.log(`Server is running on port ${port}`);
  console.log(`Swagger is running on port ${port}/api`);
}
void bootstrap();
