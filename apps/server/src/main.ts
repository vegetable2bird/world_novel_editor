import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';
import { existsSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 多租户：允许前端同源/跨域调用
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  // 生产：托管前端构建产物（apps/web/dist），非 /api 路由回退 index.html
  // 兼容不同 cwd（仓库根 / apps/server），逐一探测候选路径
  const candidates = [
    path.resolve(__dirname, '../../../apps/web/dist'),
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(process.cwd(), '../web/dist'),
  ];
  const webDist = candidates.find((p) => existsSync(p));
  if (webDist) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 8787;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[wanxiang] server listening on :${port}`);
}
bootstrap();
