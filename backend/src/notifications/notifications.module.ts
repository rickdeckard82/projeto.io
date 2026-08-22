import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { MailModule } from '../mail/mail.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationPreferencesController } from './preferences.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationPreferencesService } from './preferences.service.js';
import { DueDateCheckService } from './due-date-check.service.js';
import { EmailChannelService } from './channels/email-channel.service.js';
import { TelegramChannelService } from './channels/telegram-channel.service.js';
import { WebhookChannelService } from './channels/webhook-channel.service.js';
import { PushoverChannelService } from './channels/pushover-channel.service.js';
import { GoogleChatChannelService } from './channels/google-chat-channel.service.js';

@Module({
  imports: [RealtimeModule, MailModule],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsService,
    NotificationPreferencesService,
    DueDateCheckService,
    EmailChannelService,
    TelegramChannelService,
    WebhookChannelService,
    PushoverChannelService,
    GoogleChatChannelService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
