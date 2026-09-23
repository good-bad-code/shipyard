export type UserRole = "owner" | "admin" | "member" | "viewer";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  organizationId: string;
  role: UserRole;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actorUserId: string;
  organizationId: string;
  occurredAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ServiceStatus {
  name: "database" | "redis" | "email";
  status: "up" | "down" | "unknown";
  detail?: string;
}

export interface HealthStatusResponse {
  service: "shipyard";
  version: string;
  status: "ok" | "degraded";
  timestamp: string;
  services: ServiceStatus[];
}
