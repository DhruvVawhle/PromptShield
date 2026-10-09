"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "next-themes";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronRight, 
  UserCircle, 
  Mail, 
  Phone,
  Shield, 
  Key, 
  LogOut, 
  Trash2,
  CheckCircle2,
  Copy,
  Calendar,
  AlertTriangle,
  Monitor,
  Moon,
  Sun,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { USERS_COLLECTION } from "@/lib/user-profile";

export function ProfileClient() {
  const { user, profile, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState({
    displayName: "",
    phoneNumber: "",
  });

  const [copiedUid, setCopiedUid] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        phoneNumber: user.phoneNumber || "",
      });
    }
  }, [user]);

  if (loading || !user) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading profile...</div>;
  }

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile(user, {
        displayName: formData.displayName,
      });
      // Update firestore record
      const db = getFirebaseFirestore();
      await setDoc(doc(db, USERS_COLLECTION, user.uid), {
        name: formData.displayName,
      }, { merge: true });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone and will permanently erase all your data.")) {
      try {
        await user.delete();
      } catch (error: any) {
        if (error?.code === "auth/requires-recent-login") {
          alert("For security reasons, please log out and log back in before deleting your account.");
        } else {
          alert("Failed to delete account. Please try again.");
        }
      }
    }
  };

  const creationDate = user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Unknown";
  const lastSignIn = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : "Unknown";
  const authProviderName = user.providerData[0]?.providerId === "google.com" ? "Google" : user.providerData[0]?.providerId === "github.com" ? "GitHub" : "Email / Password";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] pb-24 relative">
      {/* Page Heading */}
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          PROMPTSHIELD <ChevronRight className="h-3 w-3" /> Profile
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Manage your personal information, account details, and security preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column */}
        <div className="flex-1 w-full lg:w-[65%] flex flex-col gap-6">
          
          {/* Profile Overview Card */}
          <Panel className="p-6 overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6 relative">
            <div className="h-24 w-24 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-semibold text-primary">{user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}</span>
              )}
            </div>
            <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
              <h2 className="text-2xl font-bold text-foreground">{user.displayName || "Anonymous User"}</h2>
              <p className="text-muted-foreground font-medium mt-0.5 flex items-center gap-1.5 justify-center sm:justify-start">
                <Mail className="h-4 w-4" /> {user.email || "No email provided"}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" /> {authProviderName}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Joined {creationDate}
                </span>
              </div>
            </div>
            <div className="absolute top-6 right-6">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? "Cancel Edit" : "Edit Profile"}
              </Button>
            </div>
          </Panel>

          {/* Personal Information */}
          <Panel className="p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-border bg-card/50">
              <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
              <p className="text-sm text-muted-foreground mt-1">Review and update your personal details.</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Display Name</label>
                  {isEditing ? (
                    <Input 
                      value={formData.displayName} 
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      placeholder="Your name"
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-md border border-border/50">
                      {user.displayName || "Not set"}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email Address</label>
                  <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md border border-border flex items-center justify-between cursor-not-allowed opacity-80">
                    <span>{user.email}</span>
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                  {isEditing && <p className="text-[10px] text-muted-foreground mt-1">Email changes require re-authentication and verification.</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Phone Number</label>
                  {isEditing ? (
                    <Input 
                      value={formData.phoneNumber} 
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      placeholder="+1 (555) 000-0000"
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-md border border-border/50">
                      {user.phoneNumber || "Not set"}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Account Created</label>
                  <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-md border border-border/50">
                    {creationDate}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-primary text-primary-foreground min-w-[120px]">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </Panel>

          {/* Preferences (Synced with settings aesthetic) */}
          <Panel className="p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-border bg-card/50">
              <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage global layout and notification preferences.</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Theme Preference</h3>
                  <p className="text-xs text-muted-foreground mt-1">Switch between light and dark themes.</p>
                </div>
                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border">
                  <button onClick={() => setTheme("light")} className={cn("p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 transition-colors", theme === "light" ? "bg-background shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground")}>
                    <Sun className="h-4 w-4" /> Light
                  </button>
                  <button onClick={() => setTheme("dark")} className={cn("p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 transition-colors", theme === "dark" ? "bg-background shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground")}>
                    <Moon className="h-4 w-4" /> Dark
                  </button>
                  <button onClick={() => setTheme("system")} className={cn("p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 transition-colors", theme === "system" ? "bg-background shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground")}>
                    <Monitor className="h-4 w-4" /> System
                  </button>
                </div>
              </div>
            </div>
          </Panel>

        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[35%] flex flex-col gap-6">
          
          {/* Account Information Card */}
          <Panel className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-card/50">
              <h2 className="text-sm font-semibold text-foreground">Account Information</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Technical details and system metadata.</p>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User UID</span>
                <div className="flex items-center justify-between bg-muted/40 border border-border rounded-md px-3 py-1.5">
                  <code className="text-xs font-mono text-foreground truncate mr-3">{user.uid}</code>
                  <button 
                    onClick={handleCopyUid}
                    className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    {copiedUid ? <CheckCircle2 className="h-3.5 w-3.5 text-status-allow" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              
              <div className="h-px bg-border/60 w-full" />
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Auth Provider</span>
                <span className="font-medium text-foreground">{authProviderName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Last Sign-In</span>
                <span className="font-medium text-foreground">{lastSignIn}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Email Status</span>
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1.5 text-status-allow font-medium text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-status-warn font-medium text-xs">
                    <AlertTriangle className="h-3.5 w-3.5" /> Unverified
                  </span>
                )}
              </div>
            </div>
          </Panel>

          {/* Security & Authentication */}
          <Panel className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-card/50">
              <h2 className="text-sm font-semibold text-foreground">Account Security</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage authentication and sessions.</p>
            </div>
            <div className="flex flex-col">
              {user.providerData[0]?.providerId === "password" && (
                <button className="flex items-center justify-between w-full px-5 py-3.5 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border/60 text-foreground group">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium group-hover:text-primary transition-colors">Change Password</span>
                    <span className="text-xs text-muted-foreground">Update your account password securely.</span>
                  </div>
                  <Key className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              )}
              <button 
                onClick={signOut}
                className="flex items-center justify-between w-full px-5 py-3.5 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border/60 text-foreground group"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium group-hover:text-primary transition-colors">Sign Out</span>
                  <span className="text-xs text-muted-foreground">End your current session.</span>
                </div>
                <LogOut className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="flex items-center justify-between w-full px-5 py-3.5 text-left text-sm hover:bg-destructive/5 transition-colors text-foreground group"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-destructive">Delete Account</span>
                  <span className="text-xs text-muted-foreground">Permanently remove your profile and data.</span>
                </div>
                <Trash2 className="h-4 w-4 shrink-0 text-destructive/70 group-hover:text-destructive transition-colors" />
              </button>
            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}
