import { SetMetadata } from '@nestjs/common';

export type ProjectResourceKind = 'project' | 'workItem' | 'document' | 'module';

export const PROJECT_RESOURCE_KEY = 'projectResource';

export interface ProjectResourceMeta {
  kind: ProjectResourceKind;
  param: string;
}

/**
 * Tells ProjectMemberGuard how to resolve the project id for this route.
 * `param` is the name of the route param holding the resource id.
 * `kind` = 'project' means the param IS the project id directly;
 * other kinds mean the param is a work item / document / module id whose
 * project must be looked up.
 */
export const ProjectResource = (kind: ProjectResourceKind, param: string) =>
  SetMetadata(PROJECT_RESOURCE_KEY, { kind, param } as ProjectResourceMeta);
