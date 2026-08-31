"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  SettingsProvider,
  useSettings
} from "../../lib/settings";
import { ToastProvider } from "../../lib/toast";
import {
  IconActivity,
  IconBot,
  IconChart,
  IconCog,
  IconDatabase,
  IconFlask,
  IconGlobe,
  IconHome,
  IconLock,
  IconLogout,
  IconMenu,
  IconMessage,
  IconMoon,
  IconPalette,
  IconPlug,
  IconSun,
  IconTarget,
  IconUser,
  IconX
} from "../../lib/icons";
import { getApiBase, adminLogin, adminLogout, adminSession } from "../../lib/chat-client";
import {
  clearAdminToken
} from "../../lib/admin-hook";
import { useTheme } from "../../lib/theme";

const base = getApiBase();

const NAV = [
  { href: "/admin", label: "Dashboard", icon: IconHome },
  { href: "/admin/knowledge", label: "Knowledge Base", icon: IconDatabase },
  { href: "/admin/conversations", label: "Conversations", icon: IconMessage },
  { href: "/admin/leads", label: "Leads", icon: IconTarget },
  { href: "/admin/analytics", label: "Analytics", icon: IconChart },
  { href: "/admin/settings", label: "Chatbot Settings", icon: IconCog },
  { href: "/admin/appearance", label: "Appearance", icon: IconPalette },
  { href: "/admin/integrations", label: "Integrations", icon: IconPlug },
  { href: "/admin/playground", label: "Playground", icon: IconFlask }
];

function pageTitle(pathname) {
  if (pathname === "/") return "Home";
  const clean = pathname.replace(/^\//, "").split("/")[0] || "admin";
  const hit = NAV.find((n) => n.href === `/${clean}`);
  if (hit) return hit.label;
  const map = { admin: "Admin Profile" };
  return map[clean] || "NirnexAI Admin";
}

function Sidebar({ pathname, open, onClose }) {
  const { settings } = useSettings();
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r bg-[var(--panel)] transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ borderColor: "var(--line)" }}
      >
        <div className="flex h-16 items-center gap-2.5 border-b px-4" style={{ borderColor: "var(--line)" }}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--ink)]">
            <IconBot className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-[var(--ink)]">{settings.brandName || "NirnexAI"}</p>
            <p className="text-[11px] font-medium text-[var(--accent-soft)]">Admin Console</p>
          </div>
          <button className="icon-btn ml-auto lg:hidden" onClick={onClose} aria-label="Close menu">
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "true" : undefined}
                className="side-link"
                onClick={onClose}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t px-4 py-3" style={{ borderColor: "var(--line)" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-3)]">
              <IconActivity className="h-3.5 w-3.5" /> Backend
            </span>
            <a
              href={`${base}/health`}
              target="_blank"
              rel="noreferrer"
              className="badge badge-green"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> live
            </a>
          </div>
          <p className="truncate text-[11px] text-[var(--ink-3)]">{base.replace(/^https?:\/\//, "")}</p>
        </div>
      </aside>
    </>
  );
}

function LoginPanel({ onAuthed }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const connect = async (ev) => {
    ev?.preventDefault();
    if (!username.trim() || !password) return setErr("Enter your username and password.");
    setLoading(true);
    setErr(null);
    try {
      await adminLogin(base, { username: username.trim(), password });
      onAuthed();
    } catch (e) {
      setErr(e.message || "Sign-in failed — check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-[var(--bg)]">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--ink)] shadow-[var(--shadow-lg)]">
            <IconBot className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">NirnexAI Admin</h1>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Sign in to {base.replace(/^https?:\/\//, "")}
          </p>
        </div>

        <form onSubmit={connect} className="card space-y-4 p-6">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]">
              <IconUser className="h-3.5 w-3.5" /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="field"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]">
              <IconLock className="h-3.5 w-3.5" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="field"
              autoComplete="current-password"
            />
          </div>
          {err && <p className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">{err}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-[var(--ink-3)]">
          <a href="/" className="hover:text-[var(--ink)]">← Back to chat</a>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { toggle, theme } = useTheme();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await adminSession(base);
        if (mounted) setAuthed(!!s.authenticated);
      } catch {
        if (mounted) setAuthed(false);
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const logout = async () => {
    clearAdminToken();
    await adminLogout(base);
    setAuthed(false);
  };

  const title = useMemo(() => pageTitle(pathname || ""), [pathname]);

  const handleAuthed = () => setAuthed(true);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!authed) {
    return <LoginPanel onAuthed={handleAuthed} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <Sidebar pathname={pathname || ""} open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-60">
        <header
          className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-[var(--bg)]/80 px-4 backdrop-blur md:px-6"
          style={{ borderColor: "var(--line)" }}
        >
          <button className="icon-btn lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <IconMenu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold tracking-tight">{title}</h1>
          <span className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium text-[var(--ink-2)] sm:flex" style={{ borderColor: "var(--line)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            {base.replace(/^https?:\/\//, "")}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <a href="/" className="btn-ghost !px-3 !py-1.5 text-sm" target="_blank" rel="noreferrer">
              <IconGlobe className="h-4 w-4" /> <span className="hidden md:inline">View website</span>
            </a>
            <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
            </button>
            <button className="icon-btn" onClick={logout} title="Sign out (forget token)">
              <IconLogout className="h-5 w-5" />
            </button>
            <div className="ml-1 hidden h-9 w-9 items-center justify-center rounded-xl bg-[var(--panel-3)] text-[var(--ink-2)] sm:flex">
              <IconUser className="h-5 w-5" />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <SettingsProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </SettingsProvider>
  );
}