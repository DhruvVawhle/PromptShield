"use client";

import * as React from "react";
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Key, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  MoreHorizontal, 
  Shield, 
  FileText,
  Clock,
  Sparkles,
  X
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type RoleType = "Owner" | "Security Admin" | "Security Operator" | "Auditor";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  status: "Active" | "Invited";
  lastActive: string;
  mfaEnabled: boolean;
  isCurrentUser?: boolean;
}

const ROLES_INFO: Record<RoleType, { description: string; permissions: string[]; badgeTone: "allow" | "warn" | "sanitize" | "block" }> = {
  Owner: {
    description: "Full control over organization security policies, billing, tenant settings, and member access.",
    permissions: ["All Policy Mutations", "Incident Triage & Close", "Audit Log Export", "API Keys", "Member Administration"],
    badgeTone: "block",
  },
  "Security Admin": {
    description: "Can create and modify guardrail policies, threshold parameters, and incident investigation workflows.",
    permissions: ["Policy Create & Edit", "Incident Resolution", "Telemetry & Diagnostics", "Audit Log Review"],
    badgeTone: "allow",
  },
  "Security Operator": {
    description: "Monitors real-time alerts, analyzes prompt incidents, and annotates triage findings.",
    permissions: ["Incident Review & Notes", "Playground Sandbox", "System Telemetry"],
    badgeTone: "warn",
  },
  Auditor: {
    description: "Read-only compliance officer role for reviewing immutable audit logs and incident records.",
    permissions: ["Audit Log Explorer (Read-Only)", "Incident History (Read-Only)", "Policy Inspection"],
    badgeTone: "sanitize",
  },
};

export function UsersClient() {
  const { user } = useAuth();
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("All Roles");
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<RoleType>("Security Operator");
  const [inviteSuccess, setInviteSuccess] = React.useState(false);

  const initialMembers: TeamMember[] = React.useMemo(() => [
    {
      id: "u-curr",
      name: user?.displayName || user?.email?.split("@")[0] || "Security Lead",
      email: user?.email || "admin@promptshield.io",
      role: "Owner",
      status: "Active",
      lastActive: "Just now",
      mfaEnabled: true,
      isCurrentUser: true,
    },
    {
      id: "u-2",
      name: "Marcus Vance",
      email: "m.vance@promptshield.io",
      role: "Security Admin",
      status: "Active",
      lastActive: "14 minutes ago",
      mfaEnabled: true,
    },
    {
      id: "u-3",
      name: "Elena Rostova",
      email: "e.rostova@promptshield.io",
      role: "Security Operator",
      status: "Active",
      lastActive: "2 hours ago",
      mfaEnabled: true,
    },
    {
      id: "u-4",
      name: "Devon Chen",
      email: "d.chen@compliance.firm",
      role: "Auditor",
      status: "Active",
      lastActive: "Yesterday",
      mfaEnabled: true,
    },
  ], [user]);

  const [members, setMembers] = React.useState<TeamMember[]>(initialMembers);

  const filteredMembers = React.useMemo(() => {
    return members.filter((m) => {
      if (roleFilter !== "All Roles" && m.role !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      }
      return true;
    });
  }, [members, roleFilter, search]);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newMember: TeamMember = {
      id: `u-${Date.now()}`,
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: inviteRole,
      status: "Invited",
      lastActive: "Invitation pending",
      mfaEnabled: false,
    };

    setMembers((prev) => [...prev, newMember]);
    setInviteEmail("");
    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setIsInviteOpen(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Team & Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage reviewer access scopes, role permissions, and tenant security isolation.
          </p>
        </div>

        <Button onClick={() => setIsInviteOpen(true)} className="inline-flex items-center gap-2 self-start sm:self-auto">
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Active team</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tracking-tight text-foreground">{members.length}</span>
            <span className="text-xs text-muted-foreground">reviewers</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Scoped to tenant isolation</p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Admin accounts</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {members.filter((m) => m.role === "Owner" || m.role === "Security Admin").length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">Policy Write Access</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Full mutation permissions</p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Audit compliance</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {members.filter((m) => m.role === "Auditor").length}
            </span>
            <span className="text-xs text-blue-600 font-medium">Read-Only Logs</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">SOC2 / ISO 27001 readiness</p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Two-factor enforcement</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tracking-tight text-emerald-600">100%</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Mandatory
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Hardware token & TOTP enabled</p>
        </Panel>
      </div>

      {/* Team Table & Filter Bar */}
      <Panel className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {["All Roles", "Owner", "Security Admin", "Security Operator", "Auditor"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition",
                  roleFilter === r
                    ? "bg-foreground text-background"
                    : "border border-border bg-surface text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Member List */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">MFA</th>
                <th className="pb-3 font-semibold">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMembers.map((member) => {
                const info = ROLES_INFO[member.role];
                return (
                  <tr key={member.id} className="hover:bg-surface-subtle/50 transition">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{member.name}</span>
                            {member.isCurrentUser ? (
                              <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                                You
                              </span>
                            ) : null}
                          </div>
                          <span className="text-muted-foreground">{member.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <StatusBadge tone={info.badgeTone} label={member.role} />
                      </span>
                    </td>

                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            member.status === "Active" ? "bg-emerald-500" : "bg-amber-500"
                          )}
                        />
                        {member.status}
                      </span>
                    </td>

                    <td className="py-3.5 pr-4">
                      {member.mfaEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> Enforced
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Pending</span>
                      )}
                    </td>

                    <td className="py-3.5 text-muted-foreground tabular-nums">
                      {member.lastActive}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* RBAC Role Architecture Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.entries(ROLES_INFO) as [RoleType, typeof ROLES_INFO[RoleType]][]).map(([role, details]) => (
          <Panel key={role} className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{role}</h3>
              </div>
              <StatusBadge tone={details.badgeTone} label={role} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{details.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {details.permissions.map((perm) => (
                <span
                  key={perm}
                  className="rounded-md border border-border bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-foreground"
                >
                  {perm}
                </span>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      {/* Security Architecture Guarantee */}
      <Panel className="border-border bg-surface-subtle p-5">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 shrink-0 text-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">Security model & guarantees</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Tenant authorization is enforced on all API routes using verified Firebase ID token claims. All Firestore collections have strict client write denials (<code className="font-mono text-[11px]">allow write: if false;</code>). Database mutations and incident triage actions are cryptographically logged to the tamper-resistant audit trail.
            </p>
          </div>
        </div>
      </Panel>

      {/* Invite Member Modal */}
      {isInviteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground">Invite Team Member</h3>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground">Email Address</label>
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="mt-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground">Assign Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as RoleType)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="Security Operator">Security Operator (Alerts & Triage)</option>
                  <option value="Security Admin">Security Admin (Policy Management)</option>
                  <option value="Auditor">Auditor (Compliance & Audit Trail)</option>
                  <option value="Owner">Owner (Full Permissions)</option>
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">{ROLES_INFO[inviteRole].description}</p>
              </div>

              {inviteSuccess ? (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Invitation sent successfully!
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="text-xs">
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
