import { useState } from "react";
import { FolderPlus, X as XIcon } from "lucide-react";
import { collectionsApi } from "../../api/collections.api";
import type { Collection } from "../../types";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface CreateCollectionModalProps {
    open: boolean;
    onClose: () => void;
    /** Called with the newly created collection after a successful save. */
    onCreated: (collection: Collection) => void;
}

export function CreateCollectionModal({ open, onClose, onCreated }: CreateCollectionModalProps) {
    const [name,        setName]        = useState("");
    const [description, setDescription] = useState("");
    const [error,       setError]       = useState("");
    const [saving,      setSaving]      = useState(false);

    const reset = () => { setName(""); setDescription(""); setError(""); };

    const handleClose = () => { reset(); onClose(); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError("Name is required"); return; }
        setSaving(true);
        setError("");
        try {
            const res = await collectionsApi.create(name.trim(), description.trim() || undefined);
            // Fetch the full object so callers get all fields (id, createdAt, etc.)
            const listRes = await collectionsApi.list();
            const created = listRes.data.data.items.find(c => c.id === res.data.data.id);
            if (created) onCreated(created);
            reset();
            onClose();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: { message?: string } } } })
                ?.response?.data?.error?.message ?? "Failed to create collection";
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={handleClose} title="New Collection" size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    id="col-name"
                    label="Name"
                    placeholder="e.g. HR Policies"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoFocus
                />

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="col-desc" className="text-sm font-medium text-[#3d3530]">
                        Description{" "}
                        <span className="text-surface-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                        id="col-desc"
                        placeholder="What kind of documents belong here?"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-surface-200 px-3.5 py-2.5 text-sm text-[#2c2825] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 resize-none transition"
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="secondary" size="sm" type="button" onClick={handleClose}>
                        <XIcon className="h-4 w-4" />
                        Cancel
                    </Button>
                    <Button size="sm" type="submit" loading={saving}>
                        <FolderPlus className="h-4 w-4" />
                        Create
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
