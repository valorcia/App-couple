import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { ContentAdminController } from './content/content.controller';
import { ContentAdminService } from './content/content.service';

@Module({ controllers: [ContentAdminController, AdminController], providers: [AdminService, ContentAdminService, AdminBootstrapService] })
export class AdminModule {}
