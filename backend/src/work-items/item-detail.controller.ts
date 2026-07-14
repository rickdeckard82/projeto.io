import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { WorkItemsService } from './work-items.service';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { UpdateItemAssigneesDto } from './dto/update-item-assignees.dto';
import { UpdateItemLabelsDto } from './dto/update-item-labels.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

@Controller('items/:itemId')
@UseGuards(ProjectMemberGuard)
@ProjectResource('workItem', 'itemId')
export class ItemDetailController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Get()
  findOne(@Param('itemId') itemId: string) {
    return this.workItemsService.findOne(itemId);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Patch()
  update(@Param('itemId') itemId: string, @Body() dto: UpdateItemDto) {
    return this.workItemsService.update(itemId, dto);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Patch('status')
  updateStatus(@Param('itemId') itemId: string, @Body() dto: UpdateItemStatusDto) {
    return this.workItemsService.updateStatus(itemId, dto.statusId);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Patch('assignees')
  updateAssignees(@Param('itemId') itemId: string, @Body() dto: UpdateItemAssigneesDto) {
    return this.workItemsService.updateAssignees(itemId, dto.userIds);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Patch('labels')
  updateLabels(@Param('itemId') itemId: string, @Body() dto: UpdateItemLabelsDto) {
    return this.workItemsService.updateLabels(itemId, dto.labelIds);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Delete()
  remove(@Param('itemId') itemId: string) {
    return this.workItemsService.remove(itemId);
  }
}
