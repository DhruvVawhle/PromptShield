"use client";

import * as React from "react";
import { Search, ShieldAlert, Shield, FileText, CheckCircle2, PauseCircle, Clock, ChevronRight, MoreHorizontal, FileEdit, Trash2, Power, PowerOff, Plus, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  subscribePolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  formatRelativeTime,
  type PolicyWithId,
  type CreatePolicyInput,
  type PolicyAction,
  type PolicyStatus,
  type PolicyCategory,
} from "@/lib/policies";
import { cn } from "@/lib/utils";

function getActionTone(action: PolicyAction): "allow" | "warn" | "sanitize" | "block" {
  switch (action) {
    case "ALLOW": return "allow";
    case "WARN": return "warn";
    case "SANITIZE": return "sanitize";
    case "BLOCK": return "block";
    default: return "allow";
  }
}

export function PoliciesClient() {
  const { user, loading: authLoading } = useAuth();
  const [policies, setPolicies] = React.useState<PolicyWithId[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [activeTab, setActiveTab] = React.useState<"All Policies" | "Active" | "Disabled" | "System" | "Custom">("All Policies");
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("All Categories");
  const [actionFilter, setActionFilter] = React.useState<string>("All Actions");

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPolicy, setEditingPolicy] = React.useState<PolicyWithId | null>(null);

  // Form State
  const [formName, setFormName] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [formCategory, setFormCategory] = React.useState<PolicyCategory | string>("Prompt Security");
  const [formAction, setFormAction] = React.useState<PolicyAction>("BLOCK");
  const [formStatus, setFormStatus] = React.useState<PolicyStatus>("Active");
  const [formConditions, setFormConditions] = React.useState("");

  // In-app notification & confirmation state
  const [notification, setNotification] = React.useState<{ message: string; type: "error" | "success" } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PolicyWithId | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const showNotification = (message: string, type: "error" | "success" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  React.useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      queueMicrotask(() => {
        setPolicies([]);
        setLoading(false);
      });
      return;
    }

    queueMicrotask(() => {
      setLoading(true);
    });
    let cancelled = false;

    const unsubscribe = subscribePolicies(
      user.uid,
      (rows) => {
        if (!cancelled) {
          setPolicies(rows);
          setLoading(false);
        }
      },
      (err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authLoading, user?.uid]);

  const openCreateModal = () => {
    setEditingPolicy(null);
    setFormName("");
    setFormDesc("");
    setFormCategory("Prompt Security");
    setFormAction("BLOCK");
    setFormStatus("Active");
    setFormConditions("");
    setIsModalOpen(true);
  };

  const openEditModal = (policy: PolicyWithId) => {
    if (policy.isSystem) return; // Disallow editing system policies via this basic modal for now
    setEditingPolicy(policy);
    setFormName(policy.name);
    setFormDesc(policy.description);
    setFormCategory(policy.category);
    setFormAction(policy.action);
    setFormStatus(policy.status);
    setFormConditions(policy.conditions || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    try {
      const input: CreatePolicyInput = {
        name: formName,
        description: formDesc,
        category: formCategory,
        action: formAction,
        status: formStatus,
        conditions: formConditions,
      };

      if (editingPolicy) {
        await updatePolicy(editingPolicy.id, input);
        showNotification(`Policy "${formName}" updated successfully.`);
      } else {
        await createPolicy(user.uid, input);
        showNotification(`Policy "${formName}" created successfully.`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to save policy", "error");
    }
  };

  const handleToggleStatus = async (policy: PolicyWithId) => {
    if (policy.isSystem) {
      showNotification("Cannot disable system policies directly.", "error");
      return;
    }
    const newStatus = policy.status === "Active" ? "Disabled" : "Active";
    try {
      await updatePolicy(policy.id, { status: newStatus });
      showNotification(`Policy "${policy.name}" set to ${newStatus}.`);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to toggle status", "error");
    }
  };

  const handleDelete = (policy: PolicyWithId) => {
    if (policy.isSystem) {
      showNotification("Cannot delete system policies.", "error");
      return;
    }
    setDeleteTarget(policy);
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePolicy(deleteTarget.id);
      showNotification(`Policy "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to delete policy", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPolicies = React.useMemo(() => {
    return policies.filter((p) => {
      if (activeTab === "Active" && p.status !== "Active") return false;
      if (activeTab === "Disabled" && p.status !== "Disabled") return false;
      if (activeTab === "System" && !p.isSystem) return false;
      if (activeTab === "Custom" && p.isSystem) return false;

      if (categoryFilter !== "All Categories" && p.category !== categoryFilter) return false;
      if (actionFilter !== "All Actions" && p.action !== actionFilter.toUpperCase()) return false;
      
      if (search) {
        const s = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(s);
        const matchesDesc = p.description.toLowerCase().includes(s);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [policies, activeTab, categoryFilter, actionFilter, search]);

  const activeCount = policies.filter(p => p.status === "Active").length;
  const disabledCount = policies.filter(p => p.status === "Disabled").length;
  const systemCount = policies.filter(p => p.isSystem).length;
  const customCount = policies.filter(p => !p.isSystem).length;

  const [recentlyUpdatedCount, setRecentlyUpdatedCount] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const now = Date.now();
      const count = policies.filter((p) => {
        const d = p.updatedAt?.toDate ? p.updatedAt.toDate() : new Date(String(p.updatedAt));
        const diffDays = (now - d.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }).length;
      setRecentlyUpdatedCount(count);
    }, 0);
    return () => clearTimeout(timer);
  }, [policies]);

  const isGuardrailsActive = activeCount > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl pb-10 relative">
      {/* Toast Notification */}
      {notification ? (
        <div
          className={cn(
            "fixed top-20 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-top-3 backdrop-blur-md",
            notification.type === "error"
              ? "border-destructive/40 bg-destructive/15 text-destructive"
              : "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          )}
        >
          {notification.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{notification.message}</span>
          <button type="button" onClick={() => setNotification(null)} className="ml-2 rounded p-0.5 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {/* Page Heading */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          PROMPTSHIELD <ChevronRight className="h-3 w-3" /> Policies
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Security Policies</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Create and manage policy rules that detect, warn, sanitize, or block risky prompts before they reach an AI model.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge 
              tone={isGuardrailsActive ? "allow" : "warn"} 
              label={isGuardrailsActive ? "Guardrails Active" : "Guardrails Disabled"} 
            />
            <div className="flex items-center justify-center bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm font-medium">
              {policies.length} Policies
            </div>
            <button 
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Create Policy
            </button>
          </div>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Total policies</span>
          </div>
          <span className="text-3xl font-bold text-foreground">{loading ? "..." : policies.length}</span>
        </Panel>
        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-green-500">
            <div className="p-1.5 rounded-md bg-green-500/10 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Active</span>
          </div>
          <span className="text-3xl font-bold text-foreground">{loading ? "..." : activeCount}</span>
        </Panel>
        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-destructive">
            <div className="p-1.5 rounded-md bg-destructive/10 text-destructive">
              <PauseCircle className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Disabled</span>
          </div>
          <span className="text-3xl font-bold text-foreground">{loading ? "..." : disabledCount}</span>
        </Panel>
        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-amber-500">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Recently updated (7d)</span>
          </div>
          <span className="text-3xl font-bold text-foreground">{loading ? "..." : recentlyUpdatedCount}</span>
        </Panel>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          {(["All Policies", "Active", "Disabled", "System", "Custom"] as const).map(tab => {
            const count = tab === "All Policies" ? policies.length 
                        : tab === "Active" ? activeCount
                        : tab === "Disabled" ? disabledCount
                        : tab === "System" ? systemCount
                        : customCount;
            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative pb-2 text-sm font-medium transition-colors hover:text-foreground whitespace-nowrap",
                  activeTab === tab ? "text-primary" : "text-muted-foreground"
                )}
              >
                {tab} <span className="ml-1 text-xs opacity-70">({count})</span>
                {activeTab === tab && (
                  <div className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search policies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 bg-card border border-border text-sm rounded-md pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-ring shadow-sm transition-colors"
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 bg-card border border-border text-sm rounded-md px-3 focus:outline-none focus:ring-1 focus:ring-ring shadow-sm transition-colors">
            <option value="All Categories">All Categories</option>
            <option value="Prompt Security">Prompt Security</option>
            <option value="Data Protection">Data Protection</option>
            <option value="Content Safety">Content Safety</option>
            <option value="Access Control">Access Control</option>
            <option value="Code Security">Code Security</option>
          </select>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="h-9 bg-card border border-border text-sm rounded-md px-3 focus:outline-none focus:ring-1 focus:ring-ring shadow-sm transition-colors">
            <option value="All Actions">All Actions</option>
            <option value="Block">Block</option>
            <option value="Sanitize">Sanitize</option>
            <option value="Warn">Warn</option>
            <option value="Allow">Allow</option>
          </select>
        </div>
      </div>

      {/* Policies Table */}
      <Panel className="overflow-hidden border-primary/10 shadow-sm bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-3 w-12"><input type="checkbox" className="rounded border-border" /></th>
                <th className="px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Name</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Description</th>
                <th className="px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Category</th>
                <th className="px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Action</th>
                <th className="px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                <th className="px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Updated</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Search className="h-4 w-4 animate-pulse" /> Loading policies...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-destructive">{error}</td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <ShieldAlert className="h-10 w-10 text-muted-foreground/30" />
                      <p>No policies found matching the criteria.</p>
                      <button onClick={openCreateModal} className="text-primary hover:underline text-sm font-medium">Create a Policy</button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((p) => {
                  return (
                    <tr 
                      key={p.id} 
                      className="border-b border-border hover:bg-muted/30 transition group"
                    >
                      <td className="px-5 py-4"><input type="checkbox" className="rounded border-border" /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary/60" />
                          <span className="font-semibold text-foreground">{p.name}</span>
                          {p.isSystem && (
                            <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ml-2">System</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-sm max-w-[250px] truncate" title={p.description}>
                        {p.description}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={getActionTone(p.action)} label={p.action} className="px-2 py-0.5 text-[11px] font-medium" />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge 
                          tone={p.status === "Active" ? "allow" : "info"} 
                          label={p.status} 
                          className="px-2 py-0.5 text-[11px] font-medium" 
                        />
                      </td>
                      <td className="px-5 py-4 text-muted-foreground whitespace-nowrap text-xs" title={p.updatedAt?.toDate?.()?.toLocaleString()}>
                        {formatRelativeTime(p.updatedAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!p.isSystem && (
                            <>
                              <button onClick={() => openEditModal(p)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition" title="Edit">
                                <FileEdit className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleToggleStatus(p)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition" title={p.status === "Active" ? "Disable" : "Enable"}>
                                {p.status === "Active" ? <PowerOff className="h-4 w-4 text-amber-500" /> : <Power className="h-4 w-4 text-green-500" />}
                              </button>
                              <button onClick={() => handleDelete(p)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition" title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition" title="More options">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-background border border-border shadow-xl rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingPolicy ? "Edit Policy" : "Create Policy"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <form id="policy-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Policy Name</label>
                  <input required value={formName} onChange={e => setFormName(e.target.value)} type="text" className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea required value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value as PolicyCategory)} className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="Prompt Security">Prompt Security</option>
                      <option value="Data Protection">Data Protection</option>
                      <option value="Content Safety">Content Safety</option>
                      <option value="Access Control">Access Control</option>
                      <option value="Code Security">Code Security</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Action</label>
                    <select value={formAction} onChange={e => setFormAction(e.target.value as PolicyAction)} className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="BLOCK">BLOCK</option>
                      <option value="SANITIZE">SANITIZE</option>
                      <option value="WARN">WARN</option>
                      <option value="ALLOW">ALLOW</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value as PolicyStatus)} className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Detection Conditions</label>
                  <textarea placeholder="e.g. pattern matches /ignore instructions/" value={formConditions} onChange={e => setFormConditions(e.target.value)} className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20 font-mono text-xs" />
                </div>
              </form>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-3 bg-muted/20">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-card hover:bg-muted transition">Cancel</button>
              <button type="submit" form="policy-form" className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition">Save Policy</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-foreground">Delete Policy</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Are you sure you want to permanently delete <strong className="text-foreground">&quot;{deleteTarget.name}&quot;</strong>? This action cannot be undone and will immediately remove this guardrail from real-time evaluation.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteAction}
                className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Policy"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
