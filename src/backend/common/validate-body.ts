import { Type, ValidationPipe } from '@nestjs/common';

/**
 * Body validation that actually runs under this project's runtime.
 *
 * The server is executed by `tsx` (esbuild), which ignores the
 * `emitDecoratorMetadata` tsconfig flag. Without `design:paramtypes`, Nest's
 * global ValidationPipe cannot resolve a handler's DTO class, decides there is
 * nothing to validate, and lets the raw body through untouched — class-validator
 * decorators are silently ignored.
 *
 * Passing the DTO explicitly via `expectedType` restores validation. This is the
 * same class of workaround as the explicit `@Inject(Foo)` used across the
 * backend, and for the same underlying reason.
 *
 * Usage:
 *   create(@Body(validateBody(CreateFooDto)) dto: CreateFooDto) { ... }
 */
export const validateBody = (dto: Type<any>) =>
  new ValidationPipe({
    expectedType: dto,
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
