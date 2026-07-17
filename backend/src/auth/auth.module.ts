import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TwoFactorService } from './two-factor.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { MailModule } from '../mail/mail.module.js';
import { RefreshTokenCleanupService } from './refresh-token-cleanup.service.js';

@Module({
  imports: [PassportModule, JwtModule.register({}), MailModule],
  controllers: [AuthController],
  providers: [AuthService, TwoFactorService, JwtStrategy, RefreshTokenCleanupService],
  exports: [AuthService],
})
export class AuthModule {}
