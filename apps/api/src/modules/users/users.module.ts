import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CouplesModule } from '../couples/couples.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [JwtModule.register({}), CouplesModule, EntitlementsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
