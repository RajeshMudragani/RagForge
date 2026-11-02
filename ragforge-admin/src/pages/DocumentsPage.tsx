import { useEffect, useState, useRef, useCallback } from "react";
import {
    Upload, FileText, FilePlus2, RefreshCw, Search,
    CheckCircle, Clock, AlertCircle, Loader2, X,
    FolderOpen, FolderPlus, ChevronDown, Plus,
} from "lucide-react";
import { clsx } from "clsx";
import { documentsApi } from "../api/documents.api";
import { collectionsApi } from "../api/collections.api";
import type { Document, Collection, DocumentStatus } from "../types";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { formatDistanceToNow } from "date-fns";

const ACCEPTED = ".pdf,.txt,.md,.docx";
const MAX_MB   = 100;

function statusBadge(status: DocumentStatus) {
    switch (status) {
        case "READY":      return <Badge variant="success"><CheckCircle className="h-3 w-3" />Ready</Badge>;
        case "PROCESSING": return <Badge variant="info"><Loader2 className="h-3 w-3 animate-spin" />Processing</Badge>;
        case "PENDING":    return <Badge variant="warning"><Clock className="h-3 w-3" />Pending</Badge>;
        case "EMBEDDING":  return <Badge variant="info"><Loader2 className="h-3 w-3 animate-spin" />Embedding</Badge>;
        case "FAILED":     return <Badge variant="error"><AlertCircle className="h-3 w-3" />Failed</Badge>;
        default:           return <Badge>{status}</Badge>;
    }
}

function mimeIcon(mimeType: string) {
    if (mimeType.includes("pdf"))   return "PDF";
    if (mimeType.includes("word") || mimeType.includes("docx")) return "DOC";
    if (mimeType.includes("markdown") || mimeType.includes("md")) return "MD";
    return "TXT";
}

function mimeColor(mimeType: string) {
    if (mimeType.includes("pdf"))   return "bg-red-100 text-red-700";
    if (mimeType.includes("word") || mimeType.includes("docx")) return "bg-blue-100 text-blue-700";
    if (mimeType.includes("markdown")) return "bg-purple-100 text-purple-700";
    return "bg-surface-100 text-surface-600";
}

interface UploadingFile {
    file: File;
    progress: number;
    status: "uploading" | "done" | "error";
    error?: string;
}

interface CollectionPickerProps {
    collections: Collection[];
    value: string;
    onChange: (name: string) => void;
    onCreated: (col: Collection) => void;
}

function CollectionPicker({ collections, value, onChange, onCreated }: CollectionPickerProps) {
    const [mode,      setMode]      = useState<"pick" | "create">("pick");
    const [newName,   setNewName]   = useState("");
    const [newDesc,   setNewDesc]   = useState("");
    const [creating,  setCreating]  = useState(false);
    const [createErr, setCreateErr] = useState("");
    const [dropOpen,  setDropOpen]  = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const handleCreate = async () => {
        if (!newName.trim()) { setCreateErr("Name is required"); return; }
        setCreating(true); setCreateErr("");
        try {
            const res = await collectionsApi.create(newName.trim(), newDesc.trim() || undefined);
            const listRes = await collectionsApi.list();
            const created = listRes.data.data.items.find(c => c.id === res.data.data.id);
            if (created) { onCreated(created); onChange(created.name); }
            else onChange(newName.trim());
            setMode("pick"); setNewName(""); setNewDesc("");
        } catch (err: unknown) {
            setCreateErr((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to create collection");
        } finally { setCreating(false); }
    };

    if (mode === "create") {
        return (
            <div className="space-y-3 p-4 bg-brand-50/60 border border-brand-200 rounded-2xl">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-brand-700 flex items-center gap-1.5">
                        <FolderPlus className="h-4 w-4" /> Create new collection
                    </p>
                    <button onClick={() => { setMode("pick"); setCreateErr(""); }} className="text-xs text-surface-400 hover:text-surface-600 transition-colors">Cancel</button>
                </div>
                <Input id="new-col-name" label="Collection name" placeholder="e.g. HR Policies" value={newName} onChange={e => setNewName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }} error={createErr} />
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#3d3530]">Description <span className="text-surface-400 font-normal">(optional)</span></label>
                    <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What kind of documents belong here?" rows={2} className="w-full rounded-xl border border-surface-200 px-3.5 py-2.5 text-sm text-[#2c2825] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 resize-none" />
                </div>
                <Button size="sm" onClick={handleCreate} loading={creating} className="w-full"><FolderPlus className="h-4 w-4" />Create &amp; select</Button>
            </div>
        );
    }

    const selected = collections.find(c => c.name === value);
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-[#3d3530] block">Collection <span className="text-surface-400 font-normal">(optional)</span></label>
            <div className="flex gap-2">
                <div className="relative flex-1" ref={dropRef}>
                    <button type="button" onClick={() => setDropOpen(v => !v)} className={clsx("w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-sm transition-colors text-left", "bg-white hover:border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40", selected ? "border-brand-300 text-[#2c2825]" : "border-surface-200 text-surface-400")}>
                        <span className="flex items-center gap-2 min-w-0">
                            {selected ? <><FolderOpen className="h-4 w-4 text-brand-500 shrink-0" /><span className="truncate font-medium text-[#2c2825]">{selected.name}</span></> : <><FolderOpen className="h-4 w-4 text-surface-300 shrink-0" /><span>No collection</span></>}
                        </span>
                        <ChevronDown className={clsx("h-4 w-4 text-surface-400 shrink-0 transition-transform", dropOpen && "rotate-180")} />
                    </button>
                    {dropOpen && (
                        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-surface-200 rounded-2xl shadow-panel py-1.5 z-30 animate-fade-in max-h-52 overflow-y-auto">
                            <button onClick={() => { onChange(""); setDropOpen(false); }} className={clsx("w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left", !value ? "bg-surface-50 text-[#1e1c1a] font-medium" : "text-surface-500 hover:bg-surface-50")}>
                                <FolderOpen className="h-4 w-4 text-surface-300 shrink-0" />No collection
                            </button>
                            {collections.length > 0 && <div className="mx-3 my-1 h-px bg-surface-100" />}
                            {collections.map(c => (
                                <button key={c.id} onClick={() => { onChange(c.name); setDropOpen(false); }} className={clsx("w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left", value === c.name ? "bg-brand-50 text-brand-700 font-medium" : "text-[#3d3530] hover:bg-surface-50")}>
                                    <FolderOpen className={clsx("h-4 w-4 shrink-0", value === c.name ? "text-brand-500" : "text-surface-400")} />
                                    <span className="truncate">{c.name}</span>
                                </button>
                            ))}
                            <div className="mx-3 my-1 h-px bg-surface-100" />
                            <button onClick={() => { setMode("create"); setDropOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-600 hover:bg-brand-50 transition-colors text-left font-medium">
                                <Plus className="h-4 w-4 shrink-0" />Create new collection…
                            </button>
                        </div>
                    )}
                </div>
                <button type="button" onClick={() => setMode("create")} className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Create new collection">
                    <FolderPlus className="h-4 w-4" /><span className="hidden sm:inline">New</span>
                </button>
            </div>
        </div>
    );
}

export function DocumentsPage() {
    const [documents,          setDocuments]          = useState<Document[]>([]);
    const [collections,        setCollections]        = useState<Collection[]>([]);
    const [loading,            setLoading]            = useState(true);
    const [search,             setSearch]             = useState("");
    const [filterStatus,       setFilterStatus]       = useState<DocumentStatus | "">("");
    const [uploadModal,        setUploadModal]        = useState(false);
    const [uploading,          setUploading]          = useState<UploadingFile[]>([]);
    const [dragOver,           setDragOver]           = useState(false);
    const [selectedCollection, setSelectedCollection] = useState("");
    const [reprocessing,       setReprocessing]       = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocuments = useCallback(async () => {
        try {
            const res = await documentsApi.list();
            setDocuments(res.data.data as unknown as Document[]);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    }, []);

    const fetchCollections = useCallback(async () => {
        try {
            const res = await collectionsApi.list();
            setCollections(res.data.data.items);
        } catch (error) { console.error(error); }
    }, []);

    useEffect(() => { fetchDocuments(); fetchCollections(); }, [fetchDocuments, fetchCollections]);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        const es = new EventSource(`${documentsApi.getEventsUrl()}?token=${token}`);
        es.onmessage = (e) => {
            try {
                const event = JSON.parse(e.data) as { documentId: string; status: "PROCESSING" | "EMBEDDING" | "COMPLETED" | "FAILED" };
                const feStatus = event.status === "COMPLETED" ? "READY" : event.status;
                setDocuments(prev => prev.map(d => d.id === event.documentId ? { ...d, status: feStatus } : d));
            } catch { /* ignore */ }
        };
        es.onerror = () => { /* SSE auto-reconnects */ };
        return () => es.close();
    }, []);

    const validateFile = (file: File): string | null => {
        if (file.size > MAX_MB * 1024 * 1024) return `File too large (max ${MAX_MB}MB)`;
        const allowed = ["application/pdf", "text/plain", "text/markdown", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
        if (!allowed.includes(file.type) && !file.name.endsWith(".md")) return "Unsupported file type";
        return null;
    };

    const uploadFiles = async (files: File[]) => {
        setUploading(files.map(f => ({ file: f, progress: 0, status: "uploading" as const })));
        for (let i = 0; i < files.length; i++) {
            const err = validateFile(files[i]);
            if (err) { setUploading(prev => prev.map((u, idx) => idx === i ? { ...u, status: "error", error: err } : u)); continue; }
            try {
                setUploading(prev => prev.map((u, idx) => idx === i ? { ...u, progress: 10 } : u));
                const res = await documentsApi.upload(files[i], { collectionName: selectedCollection || undefined }, (pct) => {
                    setUploading(prev => prev.map((u, idx) => idx === i ? { ...u, progress: pct } : u));
                });
                setDocuments(prev => [res.data.data, ...prev]);
                setUploading(prev => prev.map((u, idx) => idx === i ? { ...u, status: "done", progress: 100 } : u));
            } catch (e: unknown) {
                const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Upload failed";
                setUploading(prev => prev.map((u, idx) => idx === i ? { ...u, status: "error", error: msg } : u));
            }
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length) uploadFiles(files);
        e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) { setUploadModal(true); uploadFiles(files); }
    };

    const handleReprocess = async (id: string) => {
        setReprocessing(id);
        try { await documentsApi.process(id); await fetchDocuments(); }
        finally { setReprocessing(null); }
    };

    const filtered = documents.filter(d => {
        const matchesSearch  = !search       || d.filename.toLowerCase().includes(search.toLowerCase());
        const matchesStatus  = !filterStatus || d.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total:      documents.length,
        ready:      documents.filter(d => d.status === "READY").length,
        processing: documents.filter(d => ["PROCESSING","PENDING","EMBEDDING"].includes(d.status)).length,
        failed:     documents.filter(d => d.status === "FAILED").length,
    };

    return (
        <div className="flex flex-col h-full bg-surface-50 relative" onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
            {dragOver && (
                <div className="absolute inset-0 z-40 bg-brand-50 border-2 border-dashed border-brand-400 flex items-center justify-center pointer-events-none">
                    <div className="text-center"><Upload className="h-12 w-12 text-brand-500 mx-auto mb-2" /><p className="text-brand-700 font-semibold text-lg">Drop files to upload</p></div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-surface-100 px-6 py-4 shrink-0">
                <div className="flex items-center justify-between">
                    <div><h1 className="text-lg font-semibold text-[#1e1c1a]">Documents</h1><p className="text-sm text-surface-400">Manage your knowledge base</p></div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={fetchDocuments} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
                        <Button size="sm" onClick={() => { setUploading([]); setSelectedCollection(""); setUploadModal(true); }}><FilePlus2 className="h-4 w-4" /> Upload</Button>
                    </div>
                </div>
                <div className="flex gap-5 mt-4">
                    {[{ label: "Total", value: stats.total, color: "text-[#1e1c1a]" }, { label: "Ready", value: stats.ready, color: "text-green-600" }, { label: "Processing", value: stats.processing, color: "text-blue-600" }, { label: "Failed", value: stats.failed, color: "text-red-600" }].map(({ label, value, color }) => (
                        <div key={label} className="text-sm"><span className={clsx("font-semibold text-base", color)}>{value}</span><span className="text-surface-400 ml-1.5">{label}</span></div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border-b border-surface-100 px-6 py-3 flex items-center gap-3 shrink-0">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                    <input type="text" placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as DocumentStatus | "")} className="px-3 py-2 border border-surface-200 rounded-xl text-sm bg-white text-[#3d3530] focus:outline-none focus:ring-2 focus:ring-brand-400/40">
                    <option value="">All statuses</option>
                    <option value="READY">Ready</option>
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="EMBEDDING">Embedding</option>
                    <option value="FAILED">Failed</option>
                </select>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-400" /></div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <FileText className="h-12 w-12 text-surface-200 mb-3" />
                        <p className="text-surface-500 font-medium">{search || filterStatus ? "No matching documents" : "No documents yet"}</p>
                        <p className="text-sm text-surface-400 mt-1">{!search && !filterStatus && "Upload PDF, TXT, MD or DOCX files to get started"}</p>
                        {!search && !filterStatus && <Button size="sm" className="mt-4" onClick={() => { setUploading([]); setSelectedCollection(""); setUploadModal(true); }}><Upload className="h-4 w-4" /> Upload your first document</Button>}
                    </div>
                ) : (
                    <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden">
                        <table className="min-w-full divide-y divide-surface-100">
                            <thead className="bg-surface-50">
                                <tr>
                                    {["Document","Status","Collection","Uploaded","Actions"].map((h, i) => (
                                        <th key={h} className={clsx("px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider", i >= 2 && i <= 3 && "hidden md:table-cell", i === 3 && "hidden lg:table-cell", i === 4 && "text-right")}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-50">
                                {filtered.map(doc => (
                                    <tr key={doc.id} className="hover:bg-surface-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0", mimeColor(doc.mimeType))}>{mimeIcon(doc.mimeType)}</div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[#1e1c1a] truncate max-w-xs">{doc.filename}</p>
                                                    <p className="text-xs text-surface-400">{doc.mimeType}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{statusBadge(doc.status)}</td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            {doc.collectionName ? <div className="flex items-center gap-1.5 text-sm text-surface-600"><FolderOpen className="h-4 w-4 text-brand-400" />{doc.collectionName}</div> : <span className="text-sm text-surface-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-surface-400 hidden lg:table-cell">{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</td>
                                        <td className="px-4 py-3 text-right">
                                            {doc.status === "FAILED" && (
                                                <Button variant="ghost" size="xs" onClick={() => handleReprocess(doc.id)} loading={reprocessing === doc.id} title="Re-process"><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Upload modal */}
            <Modal open={uploadModal} onClose={() => setUploadModal(false)} title="Upload Documents" size="md">
                <div className="space-y-5">
                    <CollectionPicker collections={collections} value={selectedCollection} onChange={setSelectedCollection} onCreated={col => setCollections(prev => [col, ...prev])} />
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-surface-200 rounded-2xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-colors group">
                        <Upload className="h-9 w-9 text-surface-300 group-hover:text-brand-400 mx-auto mb-2.5 transition-colors" />
                        <p className="text-base font-medium text-surface-600 group-hover:text-brand-700">Click to browse or drag &amp; drop</p>
                        <p className="text-sm text-surface-400 mt-1">PDF, TXT, MD, DOCX — up to {MAX_MB}MB</p>
                        <input ref={fileInputRef} type="file" accept={ACCEPTED} multiple onChange={handleFileInput} className="hidden" />
                    </div>
                    {selectedCollection && (
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-700">
                            <FolderOpen className="h-4 w-4 shrink-0" />Files will be added to <strong className="font-semibold">{selectedCollection}</strong>
                            <button onClick={() => setSelectedCollection("")} className="ml-auto text-brand-400 hover:text-brand-600"><X className="h-4 w-4" /></button>
                        </div>
                    )}
                    {uploading.length > 0 && (
                        <div className="space-y-2">
                            {uploading.map((u, i) => (
                                <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 bg-surface-50 border border-surface-100 rounded-xl">
                                    <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0", mimeColor(u.file.type))}>{mimeIcon(u.file.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#3d3530] truncate">{u.file.name}</p>
                                        {u.status === "error" ? <p className="text-xs text-red-500 mt-0.5">{u.error}</p> : (
                                            <div className="mt-1.5 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                                                <div className={clsx("h-full rounded-full transition-all duration-500", u.status === "done" ? "bg-green-500" : "bg-brand-500")} style={{ width: `${u.progress}%` }} />
                                            </div>
                                        )}
                                    </div>
                                    {u.status === "done"      && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
                                    {u.status === "error"     && <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />}
                                    {u.status === "uploading" && <Loader2 className="h-5 w-5 text-brand-500 animate-spin shrink-0" />}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-end">
                        <Button variant="secondary" size="sm" onClick={() => { setUploadModal(false); setUploading([]); }}><X className="h-4 w-4" /> Close</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
