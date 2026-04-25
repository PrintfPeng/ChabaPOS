import "reflect-metadata";
import { NestFactory, HttpAdapterHost } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./src/backend/app.module";
import { createServer as createViteServer } from "vite";
import path from "path";
import express from "express";
import helmet from "helmet";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./src/backend/auth/jwt-auth.guard";
import { PrismaClientExceptionFilter } from "./src/backend/prisma/prisma-exception.filter";

async function startServer() {
  const logger = new Logger("Bootstrap");

  // Ensure DATABASE_URL is never empty to prevent Prisma initialization errors
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
    process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
    logger.warn('DATABASE_URL is missing or invalid. Using placeholder to prevent crash. Please configure it in Settings.');
  }

  const app = await NestFactory.create(AppModule);

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  // Production Hardening
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for Vite development
  }));
  app.enableCors();

  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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
    
    const server = app.getHttpAdapter().getInstance();
    server.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  await app.listen(PORT, "0.0.0.0");
  logger.log(`Server running on http://localhost:${PORT}`);
}

startServer();
