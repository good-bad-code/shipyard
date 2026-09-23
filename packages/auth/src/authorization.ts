import type { OrganizationRole } from "@shipyard/core";

const ROLE_RANK: Record<OrganizationRole, number> = {
  member: 1,
  admin: 2,
  owner: 3
};

export interface AuthorizationCheck {
  actorRole: OrganizationRole;
  minimumRole?: OrganizationRole;
  allowedRoles?: OrganizationRole[];
}

export class AuthorizationError extends Error {
  constructor(message = "Not authorized.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function hasRequiredRole(actorRole: OrganizationRole, minimumRole: OrganizationRole): boolean {
  return ROLE_RANK[actorRole] >= ROLE_RANK[minimumRole];
}

export function isRoleAllowed(actorRole: OrganizationRole, allowedRoles: OrganizationRole[]): boolean {
  return allowedRoles.includes(actorRole);
}

export function assertAuthorized(check: AuthorizationCheck): void {
  if (check.minimumRole && !hasRequiredRole(check.actorRole, check.minimumRole)) {
    throw new AuthorizationError();
  }

  if (check.allowedRoles && !isRoleAllowed(check.actorRole, check.allowedRoles)) {
    throw new AuthorizationError();
  }
}
