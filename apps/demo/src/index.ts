import type { Organization, User, AuditEvent } from "@shipyard/core";

const organization: Organization = {
  id: "org_demo",
  slug: "launch-team",
  name: "Launch Team",
  createdAt: new Date().toISOString()
};

const user: User = {
  id: "usr_demo",
  email: "founder@example.com",
  displayName: "Demo Founder",
  organizationId: organization.id,
  role: "owner",
  createdAt: new Date().toISOString()
};

const event: AuditEvent = {
  id: "evt_demo",
  action: "organization.created",
  actorUserId: user.id,
  organizationId: organization.id,
  occurredAt: new Date().toISOString(),
  metadata: { source: "@shipyard/demo", success: true }
};

console.log("Shipyard demo domain objects");
console.log(JSON.stringify({ organization, user, event }, null, 2));
