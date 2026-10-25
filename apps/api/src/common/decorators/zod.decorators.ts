import { Body, Param, Query } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

export const ZodBody = (schema: ZodType) => Body(new ZodValidationPipe(schema));
export const ZodQuery = (schema: ZodType) => Query(new ZodValidationPipe(schema));
export const ZodParam = (name: string, schema: ZodType) => Param(name, new ZodValidationPipe(schema));
