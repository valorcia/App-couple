import { Controller, Get, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { checkoutSchema, portalSchema } from '@couple/validation';
import type { BillingProductDto, BillingStatusDto, CheckoutSessionDto } from '@couple/types';
import { AppError, ErrorCode } from '@couple/shared';
import { ZodBody } from '@/common/decorators/zod.decorators';
import { type AuthUser, type CoupleContext, CurrentCouple, CurrentUser, Public, RequireCouple } from '@/common/decorators/auth.decorators';
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Public()
  @Get('billing/products')
  products(): Promise<BillingProductDto[]> {
    return this.billing.products();
  }

  @ApiBearerAuth()
  @RequireCouple()
  @Get('billing/status')
  status(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext): Promise<BillingStatusDto> {
    return this.billing.status({ userId: user.id, couple });
  }

  @ApiBearerAuth()
  @RequireCouple()
  @Post('billing/checkout')
  @HttpCode(200)
  checkout(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodBody(checkoutSchema) body: typeof checkoutSchema._output): Promise<CheckoutSessionDto> {
    return this.billing.createCheckout({ userId: user.id, couple }, body.productCode, body.successPath, body.cancelPath);
  }

  @ApiBearerAuth()
  @RequireCouple()
  @Post('billing/portal')
  @HttpCode(200)
  portal(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodBody(portalSchema) body: typeof portalSchema._output): Promise<CheckoutSessionDto> {
    return this.billing.createPortal({ userId: user.id, couple }, body.returnPath);
  }

  @Public()
  @ApiExcludeEndpoint()
  @Post('webhooks/stripe')
  @HttpCode(200)
  stripe(@Req() req: Request & { rawBody?: Buffer }, @Headers('stripe-signature') signature?: string) {
    if (!req.rawBody) throw new AppError(ErrorCode.VALIDATION_FAILED, 'Corps brut indisponible.', 400);
    return this.billing.handleStripeWebhook(req.rawBody, signature);
  }

  @Public()
  @ApiExcludeEndpoint()
  @Post('webhooks/revenuecat')
  @HttpCode(200)
  revenuecat(@Req() req: Request, @Headers('authorization') authorization?: string) {
    return this.billing.handleRevenueCatWebhook(req.body, authorization);
  }
}
