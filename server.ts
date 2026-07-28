import 'dotenv/config';
import "reflect-metadata";
import { NestFactory, HttpAdapterHost } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./src/backend/app.module";
import { GlobalExceptionFilter } from "./src/backend/common/filters/global-exception.filter";
import { PrismaService } from "./src/backend/prisma/prisma.service";
import { createServer as createViteServer } from "vite";
import path from "path";
import express from "express";
import helmet from "helmet";
import { Reflector } from "@nestjs/core";
async function startServer() {
  const logger = new Logger("Bootstrap");

  // Ensure DATABASE_URL is never empty to prevent Prisma initialization errors
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
    process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
    logger.warn('DATABASE_URL is missing or invalid. Using placeholder to prevent crash. Please configure it in Settings.');
  }

  const app = await NestFactory.create(AppModule);

  // Register global exception filter — same manual pattern as the former PrismaClientExceptionFilter.
  // app.get() is safe here because all providers are initialised after NestFactory.create().
  const adapterHost    = app.get(HttpAdapterHost);
  const prismaService  = app.get(PrismaService);
  app.useGlobalFilters(new GlobalExceptionFilter(adapterHost, prismaService));

  const isProd = process.env.NODE_ENV === 'production';

  // The QR codes printed for tables embed this origin. Left unset in production
  // they would point customers at localhost, so fail loudly instead.
  if (isProd && !process.env.FRONTEND_URL) {
    throw new Error(
      'FRONTEND_URL is not set. Table QR codes would be generated pointing at ' +
      'localhost. Set it to the public site origin, e.g. https://chabapos.com',
    );
  }

  // Production Hardening
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for Vite development
  }));

  // The SPA and the API are served from the same origin, so browsers never need
  // CORS for normal use. Allow only the public origin in production; stay open
  // in development so tooling and devices on the LAN can reach the API.
  if (isProd) {
    app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });
  } else {
    app.enableCors();
  }

  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));


  const PORT = Number(process.env.PORT) || 3000;

  // Vite middleware for development
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Ensure Vite doesn't intercept API requests
    app.use((req, res, next) => {
      if (req.url.startsWith('/api')) {
        return next();
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    // SPA fallback: hand any non-API GET back to index.html so client-side
    // routes survive a refresh or a direct link.
    //
    // Written as middleware rather than `get('*')` because @nestjs/platform-express
    // bundles Express 5, whose path-to-regexp rejects a bare '*' and throws at
    // startup. Requests under /api fall through to the Nest router untouched.
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.url.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  await app.listen(PORT, "0.0.0.0");
  logger.log(
    isProd
      ? `Server running in production on port ${PORT} — public origin ${process.env.FRONTEND_URL}`
      : `Server running on http://localhost:${PORT}`,
  );
}

startServer();
