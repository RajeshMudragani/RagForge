import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import {
    MessageSquare, FileText, FolderOpen, LogOut, Bot,
    Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
    Search, Check, X as XIcon, MoreHorizontal,
    User, Mail, Shield, Building2, Copy, CheckCheck,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "../../store/auth.store";
import { authApi } from "../../api/auth.api";
import type { UseConversationsReturn } from "../../hooks/useConversations";
import { formatDistanceToNow } from "date-fns";

const NAV = [
    { to: "/documents",   icon: FileText,   label: "Documents"   },
    { to: "/collections", icon: FolderOpen, label: "Collections" },
];

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    conversations: UseConversationsReturn;
    mobileOpen: boolean;
    onMobileClose: () => void;
}

/* ── User details popover ────────────────────────────────────────────────── */
interface UserCardProps {
    onClose: () => void;
    onLogout: () => void;
}

function UserCard({ onClose, onLogout }: UserCardProps) {
    const { user } = useAuth();
    const [copied, setCopied] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        // Small delay so the click that opened this doesn't also close it
        const t = setTimeout(() => document.addEventListener("mousedown", h), 100);
        return () => { clearTimeout(t); document.removeEventListener("mousedown", h); };
    }, [onClose]);

    const copyToClipboard = async (text: string, key: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 1500);
    };

    const displayName = user?.name?.trim()
        || user?.email?.split("@")[0]
        || "Account";
    const initials = displayName.slice(0, 2).toUpperCase();

    const rows = [
        { icon: Mail,      label: "Email",     value: user?.email,    key: "email"    },
        { icon: Shield,    label: "Role",       value: user?.role?.toLowerCase(), key: "role" },
        { icon: Building2, label: "Tenant ID",  value: user?.tenantId, key: "tenant"  },
    ];

    return (
        <div
            ref={ref}
            className="absolute bottom-full left-2 right-2 mb-2 bg-[#252220] border border-[#3a3632] rounded-2xl shadow-panel overflow-hidden animate-slide-up z-50"
        >
            {/* Avatar + name header */}
            <div className="flex items-center gap-3 px-4 py-4 bg-[#2a2724] border-b border-[#3a3632]">
                <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-base font-bold text-white shrink-0">
                    {initials}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                    <p className="text-xs text-[#9e9187] truncate">{user?.email}</p>
                </div>
            </div>

            {/* Detail rows */}
            <div className="px-3 py-2 space-y-0.5">
                {rows.map(({ icon: Icon, label, value, key }) => (
                    value ? (
                        <div
                            key={key}
                            className="flex items-center gap-3 px-2 py-2 rounded-xl group"
                        >
                            <Icon className="h-3.5 w-3.5 text-[#706860] shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-[#706860] leading-none mb-0.5">{label}</p>
                                <p className="text-sm text-[#c5b9ad] truncate capitalize">{value}</p>
                            </div>
                            {key !== "role" && (
                                <button
                                    onClick={() => copyToClipboard(value, key)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-[#706860] hover:text-[#c5b9ad] hover:bg-[#332f2b] transition-all"
                                    title={`Copy ${label}`}
                                >
                                    {copied === key
                                        ? <CheckCheck className="h-3.5 w-3.5 text-brand-400" />
                                        : <Copy className="h-3.5 w-3.5" />}
                                </button>
                            )}
                        </div>
                    ) : null
                ))}
            </div>

            {/* Logout */}
            <div className="px-3 pb-3 pt-1 border-t border-[#3a3632] mt-1">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-medium"
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign out
                </button>
            </div>
        </div>
    );
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
export function Sidebar({ collapsed, onToggle, conversations: { conversations, loading, fetch, remove, rename }, mobileOpen, onMobileClose }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const params   = useParams<{ conversationId?: string }>();
    const [search, setSearch] = useState("");
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearch = (value: string) => {
        setSearch(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => fetch(value || undefined), 300);
    };
    const [editId,      setEditId]      = useState<string | null>(null);
    const [editValue,   setEditValue]   = useState("");
    const [menuId,      setMenuId]      = useState<string | null>(null);
    const [showProfile, setShowProfile] = useState(false);
    const editRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetch(); }, [fetch]);
    useEffect(() => { if (editRef.current) editRef.current.focus(); }, [editId]);
    useEffect(() => {
        const h = () => setMenuId(null);
        document.addEventListener("click", h);
        return () => document.removeEventListener("click", h);
    }, []);

    const handleLogout = async () => {
        const rt = localStorage.getItem("refreshToken") ?? "";
        try { await authApi.logout(rt); } catch { /* ignore */ }
        logout();
        navigate("/login");
    };

    const startEdit = (id: string, title: string, e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        setEditId(id); setEditValue(title); setMenuId(null);
    };

    const commitEdit = async (id: string) => {
        if (editValue.trim()) await rename(id, editValue.trim());
        setEditId(null);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        setMenuId(null);
        await remove(id);
        if (params.conversationId === id) navigate("/chat");
    };

const displayName = user?.name?.trim()
        || user?.email?.split("@")[0]
        || "Account";
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
        <>
        {mobileOpen && (
            <button
                type="button"
                className="fixed inset-0 z-50 bg-black/40 md:hidden"
                onClick={onMobileClose}
                aria-label="Close navigation menu"
            />
        )}
        <aside className={clsx(
            "flex flex-col h-screen shrink-0 transition-all duration-200 select-none",
            "bg-[#1e1c1a] text-[#c5b9ad]",
            collapsed ? "md:w-[60px]" : "md:w-[260px]",
            mobileOpen
                ? "fixed inset-y-0 left-0 z-[60] w-[min(85vw,300px)] shadow-2xl md:relative md:inset-auto md:z-auto md:shadow-none"
                : "hidden md:flex",
        )}>

            {/* ── Logo row ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#3a3632] min-h-[60px]">
                <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="h-[18px] w-[18px] text-white" />
                </div>
                {!collapsed && (
                    <span className="text-base font-semibold text-white tracking-tight truncate">
                        RAG Studio
                    </span>
                )}
                <button
                    onClick={onToggle}
                    className={clsx(
                        "hidden md:block p-1.5 rounded-lg text-[#706860] hover:text-[#c5b9ad] hover:bg-[#2a2724] transition-colors shrink-0",
                        collapsed ? "mx-auto" : "ml-auto",
                    )}
                    title={collapsed ? "Expand" : "Collapse"}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
                <button
                    type="button"
                    onClick={onMobileClose}
                    className="ml-auto rounded-lg p-2 text-[#9e9187] hover:bg-[#2a2724] hover:text-white md:hidden"
                    aria-label="Close navigation menu"
                >
                    <XIcon className="h-4 w-4" />
                </button>
            </div>

            {/* ── New chat ─────────────────────────────────────────────── */}
            <div className={clsx("px-3 py-3", collapsed ? "flex justify-center" : "")}>
                <button
                    onClick={() => { navigate("/chat"); onMobileClose(); }}
                    title="New conversation"
                    className={clsx(
                        "flex items-center gap-2.5 rounded-xl transition-colors text-sm font-medium",
                        "text-[#c5b9ad] hover:bg-[#2a2724] hover:text-white",
                        collapsed ? "p-2.5" : "w-full px-3 py-2.5",
                    )}
                >
                    <Plus className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span>New chat</span>}
                </button>
            </div>

            {/* ── Search ───────────────────────────────────────────────── */}
            {!collapsed && (
                <div className="px-3 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#706860] pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search conversations…"
                            value={search}
                            onChange={e => handleSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-[#2a2724] border border-[#3a3632] text-[#c5b9ad] placeholder-[#706860] focus:outline-none focus:border-brand-500/60 transition-colors"
                        />
                    </div>
                </div>
            )}

            {/* ── Conversation list ─────────────────────────────────────── */}
            {!collapsed && (
                <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
                    {loading && (
                        <p className="text-xs text-[#706860] text-center py-3">Loading…</p>
                    )}
                    {!loading && conversations.length === 0 && (
                        <div className="text-center py-10">
                            <MessageSquare className="h-9 w-9 text-[#3a3632] mx-auto mb-2" />
                            <p className="text-sm text-[#706860]">
                                {search ? "No matches" : "No conversations yet"}
                            </p>
                        </div>
                    )}
                    <div className="space-y-0.5">
                        {conversations.map(conv => {
                            const isActive  = params.conversationId === conv.id;
                            const title     = conv.title ?? "New conversation";
                            const isEditing = editId === conv.id;

                            return (
                                <div key={conv.id} className="relative group">
                                    {isEditing ? (
                                        <div className="flex items-center gap-1 px-2 py-1.5">
                                            <input
                                                ref={editRef}
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter")  commitEdit(conv.id);
                                                    if (e.key === "Escape") setEditId(null);
                                                }}
                                                className="flex-1 bg-[#332f2b] text-white text-sm px-2.5 py-1.5 rounded-lg border border-[#706860] focus:outline-none focus:border-brand-400"
                                            />
                                            <button onClick={() => commitEdit(conv.id)} className="p-1 text-brand-400 hover:text-brand-300">
                                                <Check className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => setEditId(null)} className="p-1 text-[#706860] hover:text-[#c5b9ad]">
                                                <XIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <NavLink
                                            to={`/chat/${conv.id}`}
                                            onClick={onMobileClose}
                                            className={clsx(
                                                "flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors",
                                                isActive
                                                    ? "bg-[#332f2b] text-white"
                                                    : "text-[#9e9187] hover:bg-[#2a2724] hover:text-[#e0d9d0]",
                                            )}
                                        >
                                            <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-[#706860]" />
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate font-medium leading-snug">{title}</p>
                                                <p className="text-xs text-[#706860] truncate mt-0.5">
                                                    {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </NavLink>
                                    )}

                                    {!isEditing && (
                                        <button
                                            onClick={e => { e.stopPropagation(); setMenuId(v => v === conv.id ? null : conv.id); }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#706860] hover:text-[#c5b9ad] hover:bg-[#332f2b] opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                    )}

                                    {menuId === conv.id && (
                                        <div
                                            className="absolute right-1 top-full mt-1 bg-[#2a2724] border border-[#3a3632] rounded-xl shadow-panel py-1 w-36 z-20 animate-fade-in"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={e => startEdit(conv.id, conv.title ?? "", e)}
                                                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-[#c5b9ad] hover:bg-[#332f2b] hover:text-white transition-colors"
                                            >
                                                <Pencil className="h-4 w-4" /> Rename
                                            </button>
                                            <button
                                                onClick={e => handleDelete(conv.id, e)}
                                                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-red-400 hover:bg-[#332f2b] hover:text-red-300 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {collapsed && <div className="flex-1" />}

            {/* ── Bottom nav ────────────────────────────────────────────── */}
            <div className={clsx(
                "border-t border-[#3a3632] px-2 py-2 space-y-0.5",
                collapsed && "flex flex-col items-center",
            )}>
                {NAV.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to} to={to} title={label}
                        onClick={onMobileClose}
                        className={({ isActive }) => clsx(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                            isActive
                                ? "bg-brand-500/20 text-brand-300"
                                : "text-[#9e9187] hover:bg-[#2a2724] hover:text-[#e0d9d0]",
                            collapsed && "justify-center px-2.5",
                        )}
                    >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && label}
                    </NavLink>
                ))}
            </div>

            {/* ── User row ──────────────────────────────────────────────── */}
            <div className="relative border-t border-[#3a3632] px-3 py-3">
                {/* User profile popover */}
                {showProfile && !collapsed && (
                    <UserCard onClose={() => setShowProfile(false)} onLogout={handleLogout} />
                )}

                <button
                    onClick={() => setShowProfile(v => !v)}
                    title="Account"
                    className={clsx(
                        "flex items-center gap-2.5 w-full rounded-xl transition-colors",
                        "hover:bg-[#2a2724] px-2 py-2",
                        showProfile && "bg-[#2a2724]",
                        collapsed && "justify-center",
                    )}
                >
                    {/* Avatar */}
                    <div className={clsx(
                        "rounded-full bg-brand-500/80 flex items-center justify-center font-semibold text-white shrink-0",
                        "ring-2 ring-transparent transition-all",
                        showProfile && "ring-brand-400/60",
                        collapsed ? "w-8 h-8 text-sm" : "w-8 h-8 text-sm",
                    )}>
                        {initials}
                    </div>

                    {!collapsed && (
                        <>
                            <div className="min-w-0 flex-1 text-left">
                                <p className="text-sm font-medium text-[#e0d9d0] truncate leading-tight">
                                    {displayName}
                                </p>
                                <p className="text-xs text-[#706860] truncate capitalize">{user?.role?.toLowerCase()}</p>
                            </div>
                            <User className="h-4 w-4 text-[#706860] shrink-0" />
                        </>
                    )}
                </button>
            </div>
        </aside>
        </>
    );
}
