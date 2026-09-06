import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { validateSecurityEnv } from './common/config/security-env.js';

/**
 * Ponto de entrada da aplicação NestJS. Cria a instância do app e configura,
 * nesta ordem, os pilares transversais que todo request atravessa: parsing de
 * cookies (necessário para ler o JWT httpOnly), prefixo global de rota,
 * validação/transform automática de DTOs, filtro global de exceções (formato
 * padronizado de erro) e CORS com `credentials: true` (exigido para que o
 * navegador envie os cookies httpOnly de auth em requisições cross-origin do
 * frontend). Por fim sobe o servidor HTTP na porta configurada.
 */
async function bootstrap() {
  // Antes de tudo: barra a subida em produção se algum segredo estiver ausente/de exemplo.
  validateSecurityEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Em produção a aplicação roda atrás do Nginx Proxy Manager (ver README). Confiar no
  // primeiro proxy faz o Express usar o `X-Forwarded-For` (IP real do cliente, necessário
  // para o rate limit por IP acertar o alvo) e o `X-Forwarded-Proto` (esquema https correto).
  app.set('trust proxy', 1);

  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${port}`);
}

bootstrap();
