import { useEffect, useState, useCallback } from "react";
import {
    FolderOpen, Plus, Pencil, Trash2, Loader2,
    FileText, X as XIcon, FolderPlus, Files,
} from "lucide-react";
import { clsx } from "clsx";
import { collectionsApi } from "../api/collections.api";
import { documentsApi } from "../api/documents.api";
import type { Collection, Document } from "../types";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { formatDistanceToNow } from "date-fns";

interface CollectionWithCount extends Collection {
    docCount?: number;
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

export function CollectionsPage() {
    const [collections,  setCollections]  = useState<CollectionWithCount[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [createModal,  setCreateModal]  = useState(false);
    const [editModal,    setEditModal]    = useState<Collection | null>(null);
    const [deleteModal,  setDeleteModal]  = useState<Collection | null>(null);
    const [formName,     setFormName]     = useState("");
    const [formDesc,     setFormDesc]     = useState("");
    const [formError,    setFormError]    = useState("");
    const [submitting,   setSubmitting]   = useState(false);
    const [deleteError,  setDeleteError]  = useState("");

    // Manage docs modal
    const [manageCol,    setManageCol]    = useState<Collection | null>(null);
    const [allDocs,      setAllDocs]      = useState<Document[]>([]);
    const [docsLoading,  setDocsLoading]  = useState(false);
    const [pendingIds,   setPendingIds]   = useState<Set<string>>(new Set());
    const [saving,       setSaving]       = useState(false);
    const [docSearch,    setDocSearch]    = useState("");

    const fetchCollections = useCallback(async () => {
        try {
            const res = await collectionsApi.list();
            const items: CollectionWithCount[] = res.data.data.items;
            setCollections(items);
            // Fetch doc counts in background
            items.forEach(async (col) => {
                try {
                    const s = await collectionsApi.getStats(col.id);

                    console.log("stats", s.data);

                    setCollections(prev =>
                        prev.map(c =>
                            c.id === col.id
                                ? {
                                    ...c,
                                    docCount:
                                        (s.data.data as any)?.items?.documents ?? 0,
                                }
                                : c
                        )
                    );
                } catch (error) {
                    console.error(error);
                }
            });
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchCollections(); }, [fetchCollections]);

    const openManage = async (col: Collection) => {
        setManageCol(col);
        setDocSearch("");
        setDocsLoading(true);
        try {
            const res = await documentsApi.list();
            const docs = res.data.data as unknown as Document[];
            setAllDocs(docs);
            setPendingIds(new Set(docs.filter(d => d.collectionId === col.id).map(d => d.id)));
        } catch { /* ignore */ }
        finally { setDocsLoading(false); }
    };

    const handleSaveManage = async () => {
        if (!manageCol) return;
        setSaving(true);
        try {
            const currentIds = new Set(allDocs.filter(d => d.collectionId === manageCol.id).map(d => d.id));
            const toAdd    = [...pendingIds].filter(id => !currentIds.has(id));
            const toRemove = [...currentIds].filter(id => !pendingIds.has(id));

            if (toAdd.length)    await documentsApi.assignCollection(toAdd, manageCol.id);
            if (toRemove.length) await documentsApi.assignCollection(toRemove, null);

            console.log("Adding documents", toAdd);
            console.log("Removing documents", toRemove);

            setAllDocs(prev => prev.map(d => {
                if (toAdd.includes(d.id))    return { ...d, collectionId: manageCol.id, collectionName: manageCol.name };
                if (toRemove.includes(d.id)) return { ...d, collectionId: null, collectionName: null };
                return d;
            }));

            // Update local doc count
            setCollections(prev => prev.map(c =>
                c.id === manageCol.id ? { ...c, docCount: pendingIds.size } : c
            ));

            setManageCol(null);
        } finally { setSaving(false); }
    };

    const openEdit = (col: Collection) => {
        setFormName(col.name); setFormDesc(col.description ?? ""); setFormError(""); setEditModal(col);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) { setFormError("Collection name is required"); return; }
        setSubmitting(true); setFormError("");
        try {
            await collectionsApi.create(formName.trim(), formDesc.trim() || undefined);
            await fetchCollections();
            setCreateModal(false); setFormName(""); setFormDesc("");
        } catch (err: unknown) {
            setFormError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to create collection");
        } finally { setSubmitting(false); }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim() || !editModal) return;
        setSubmitting(true); setFormError("");
        try {
            await collectionsApi.update(editModal.id, { name: formName.trim(), description: formDesc.trim() || null });
            await fetchCollections();
            setEditModal(null);
        } catch (err: unknown) {
            setFormError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to update");
        } finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        setSubmitting(true); setDeleteError("");
        try {
            await collectionsApi.delete(deleteModal.id);
            setCollections(prev => prev.filter(c => c.id !== deleteModal.id));
            setDeleteModal(null);
        } catch (err: unknown) {
            setDeleteError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to delete collection.");
        } finally { setSubmitting(false); }
    };

    const filteredDocs = allDocs.filter(d =>
        !docSearch || d.filename.toLowerCase().includes(docSearch.toLowerCase())
    );

    // Split docs into: in this collection, in other collections, unassigned
    const docsInThis    = filteredDocs.filter(d => d.collectionId === manageCol?.id);
    const docsInOther   = filteredDocs.filter(d => d.collectionId && d.collectionId !== manageCol?.id);
    const docsUnassigned = filteredDocs.filter(d => !d.collectionId);

    return (
        <div className="flex flex-col h-full bg-surface-50">
            {/* Header */}
            <div className="bg-white border-b border-surface-100 px-3 sm:px-6 py-4 shrink-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-lg font-semibold text-[#1e1c1a]">Collections</h1>
                        <p className="text-sm text-surface-400">Group documents to scope your AI searches</p>
                    </div>
                    <Button size="sm" onClick={() => { setFormName(""); setFormDesc(""); setFormError(""); setCreateModal(true); }}>
                        <Plus className="h-4 w-4" />New collection
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto px-3 sm:px-5 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
                    </div>
                ) : collections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                            <FolderOpen className="h-8 w-8 text-brand-400" />
                        </div>
                        <p className="font-semibold text-[#1e1c1a]">No collections yet</p>
                        <p className="text-sm text-surface-400 mt-1.5 leading-relaxed">
                            Collections let you group related documents so your AI only searches within a specific set.
                        </p>
                        <Button size="sm" className="mt-5" onClick={() => { setFormName(""); setFormDesc(""); setFormError(""); setCreateModal(true); }}>
                            <FolderPlus className="h-4 w-4" />Create your first collection
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Information Banner */}
                        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-2 mb-4">
                            <p className="text-sm text-brand-700">
                                Collections help AI search only within selected documents,
                                improving answer accuracy and reducing irrelevant results.
                            </p>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white border border-surface-200 rounded-xl p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-surface-400">
                                            Collections
                                        </p>
                                        <p className="text-3xl font-semibold text-[#1e1c1a] mt-1">
                                            {collections.length}
                                        </p>
                                    </div>

                                    <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                                        <FolderOpen className="h-6 w-6 text-brand-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-surface-200 rounded-xl p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-surface-400">
                                            Documents Assigned
                                        </p>
                                        <p className="text-3xl font-semibold text-[#1e1c1a] mt-1">
                                            {collections.reduce(
                                                (total, col) => total + (col.docCount || 0),
                                                0
                                            )}
                                        </p>
                                    </div>

                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <FileText className="h-6 w-6 text-blue-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-surface-200 rounded-xl p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-surface-400">
                                            AI Search Scopes
                                        </p>
                                        <p className="text-3xl font-semibold text-[#1e1c1a] mt-1">
                                            {collections.length}
                                        </p>
                                    </div>

                                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                                        <Files className="h-6 w-6 text-purple-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Collection Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {collections.map(col => (
                                <div
                                    key={col.id}
                                    className="bg-white border border-surface-200 rounded-2xl hover:border-brand-200 hover:shadow-md transition-all flex flex-col"
                                >
                                    <div className="p-4 flex-1">
                                        <div className="flex items-start justify-between">
                                            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                                                <FolderOpen className="h-6 w-6 text-brand-500" />
                                            </div>

                                            <span
                                                className={clsx(
                                                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                                                    col.docCount && col.docCount > 0
                                                        ? "bg-brand-50 text-brand-600"
                                                        : "bg-surface-100 text-surface-400"
                                                )}
                                            >
                                                <FileText className="h-3 w-3" />
                                                {col.docCount || 0} Docs
                                            </span>
                                        </div>

                                        <h3 className="mt-4 text-lg font-semibold text-[#1e1c1a] truncate">
                                            {col.name}
                                        </h3>

                                        <p className="text-xs text-surface-300 mt-1">
                                            Created{" "}
                                            {formatDistanceToNow(
                                                new Date(col.createdAt),
                                                { addSuffix: true }
                                            )}
                                        </p>

                                        <div className="mt-4 min-h-[48px]">
                                            {col.description ? (
                                                <p className="text-sm text-surface-500 line-clamp-2">
                                                    {col.description}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-surface-300 italic">
                                                    No description provided
                                                </p>
                                            )}
                                        </div>

                                        {/* Collection Summary */}
                                        <div className="mt-4 p-3 bg-surface-50 rounded-xl border border-surface-100">
                                            <p className="text-xs text-surface-500">
                                                This collection contains
                                            </p>
                                            <p className="font-semibold text-[#1e1c1a] mt-1">
                                                {col.docCount || 0} document
                                                {(col.docCount || 0) !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="px-3 sm:px-4 py-3 border-t border-surface-100 flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => openManage(col)}
                                            className="flex min-w-0 items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 transition"
                                        >
                                            <Files className="h-4 w-4" />
                                            Manage Documents
                                        </button>

                                        <div className="ml-auto flex items-center gap-1">
                                            <button
                                                onClick={() => openEdit(col)}
                                                className="p-2 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-[#1e1c1a]"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setDeleteError("");
                                                    setDeleteModal(col);
                                                }}
                                                className="p-2 rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Manage Documents modal */}
            <Modal open={!!manageCol} onClose={() => setManageCol(null)} title={`Manage Documents — ${manageCol?.name}`} size="md">
                <div className="space-y-4">
                    <p className="text-sm text-surface-500">
                        Check documents to include them in this collection. Uncheck to remove.
                    </p>

                    <input
                        type="text"
                        placeholder="Search documents…"
                        value={docSearch}
                        onChange={e => setDocSearch(e.target.value)}
                        className="w-full px-3.5 py-2 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400"
                    />

                    <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                        {docsLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
                            </div>
                        ) : filteredDocs.length === 0 ? (
                            <p className="text-sm text-surface-400 text-center py-10">No documents found</p>
                        ) : (
                            <>
                                {/* Docs already in this collection */}
                                {docsInThis.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-surface-400 uppercase tracking-wide px-1 mb-1.5">In this collection</p>
                                        {docsInThis.map(doc => <DocRow key={doc.id} doc={doc} checked={pendingIds.has(doc.id)} manageColId={manageCol?.id} onToggle={() => setPendingIds(prev => { const n = new Set(prev); n.has(doc.id) ? n.delete(doc.id) : n.add(doc.id); return n; })} />)}
                                    </div>
                                )}
                                {/* Unassigned docs */}
                                {docsUnassigned.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-surface-400 uppercase tracking-wide px-1 mb-1.5">Unassigned</p>
                                        {docsUnassigned.map(doc => <DocRow key={doc.id} doc={doc} checked={pendingIds.has(doc.id)} manageColId={manageCol?.id} onToggle={() => setPendingIds(prev => { const n = new Set(prev); n.has(doc.id) ? n.delete(doc.id) : n.add(doc.id); return n; })} />)}
                                    </div>
                                )}
                                {/* Docs in other collections */}
                                {docsInOther.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-surface-400 uppercase tracking-wide px-1 mb-1.5">In other collections</p>
                                        {docsInOther.map(doc => <DocRow key={doc.id} doc={doc} checked={pendingIds.has(doc.id)} manageColId={manageCol?.id} onToggle={() => setPendingIds(prev => { const n = new Set(prev); n.has(doc.id) ? n.delete(doc.id) : n.add(doc.id); return n; })} />)}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 pt-2 border-t border-surface-100 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-surface-400">{pendingIds.size} document{pendingIds.size !== 1 ? "s" : ""} selected</span>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setManageCol(null)}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveManage} loading={saving}>Save changes</Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Create modal */}
            <Modal open={createModal} onClose={() => setCreateModal(false)} title="New Collection" size="sm">
                <form onSubmit={handleCreate} className="space-y-4">
                    <Input id="col-name" label="Name" placeholder="e.g. HR Policies" value={formName} onChange={e => setFormName(e.target.value)} required autoFocus />
                    <div className="flex flex-col gap-1">
                        <label htmlFor="col-desc" className="text-sm font-medium text-[#3d3530]">Description <span className="text-surface-400 font-normal">(optional)</span></label>
                        <textarea id="col-desc" placeholder="What kind of documents belong here?" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} className="w-full rounded-xl border border-surface-200 px-3 py-2.5 text-sm text-[#1e1c1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none" />
                    </div>
                    {formError && <p className="text-sm text-red-500">{formError}</p>}
                    <div className="flex justify-end gap-2 pt-1">
                        <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModal(false)}><XIcon className="h-4 w-4" />Cancel</Button>
                        <Button size="sm" type="submit" loading={submitting}><FolderPlus className="h-4 w-4" />Create</Button>
                    </div>
                </form>
            </Modal>

            {/* Edit modal */}
            <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Collection" size="sm">
                <form onSubmit={handleEdit} className="space-y-4">
                    <Input id="edit-name" label="Name" value={formName} onChange={e => setFormName(e.target.value)} required autoFocus />
                    <div className="flex flex-col gap-1">
                        <label htmlFor="edit-desc" className="text-sm font-medium text-[#3d3530]">Description</label>
                        <textarea id="edit-desc" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} className="w-full rounded-xl border border-surface-200 px-3 py-2.5 text-sm text-[#1e1c1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none" />
                    </div>
                    {formError && <p className="text-sm text-red-500">{formError}</p>}
                    <div className="flex justify-end gap-2 pt-1">
                        <Button variant="secondary" size="sm" type="button" onClick={() => setEditModal(null)}>Cancel</Button>
                        <Button size="sm" type="submit" loading={submitting}>Save changes</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete modal */}
            <Modal open={!!deleteModal} onClose={() => { setDeleteModal(null); setDeleteError(""); }} title="Delete Collection" size="sm">
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                        <Trash2 className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Delete "{deleteModal?.name}"?</p>
                            <p className="text-xs text-red-600 mt-0.5">Documents inside won't be deleted — only the collection grouping is removed.</p>
                        </div>
                    </div>
                    {deleteError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{deleteError}</p>}
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => { setDeleteModal(null); setDeleteError(""); }}>Cancel</Button>
                        <Button variant="danger" size="sm" onClick={handleDelete} loading={submitting}>Delete</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// Extracted row component to keep JSX clean
function DocRow({ doc, checked, manageColId, onToggle }: {
    doc: Document;
    checked: boolean;
    manageColId?: string;
    onToggle: () => void;
}) {
    return (
        <label className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors border",
            checked ? "bg-brand-50 border-brand-200" : "hover:bg-surface-50 border-transparent"
        )}>
            <input
                type="checkbox"
                checked={checked}
                onChange={onToggle}
                className="rounded border-surface-300 text-brand-500 focus:ring-brand-400 shrink-0"
            />
            <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0", mimeColor(doc.mimeType))}>
                {mimeIcon(doc.mimeType)}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#1e1c1a] truncate">{doc.filename}</p>
                {doc.collectionName && doc.collectionId !== manageColId && (
                    <p className="text-xs text-surface-400 truncate">In: {doc.collectionName}</p>
                )}
            </div>
        </label>
    );
}
