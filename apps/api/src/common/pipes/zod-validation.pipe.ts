import { type ArgumentMetadata, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { AppError, ErrorCode } from '@couple/shared';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        'Certaines informations sont invalides.',
        400,
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message, code: i.code })),
      );
    }
    return result.data;
  }
}
