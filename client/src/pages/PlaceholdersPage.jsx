import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { createAuthenticatedApi } from '../services/api';
import toast from 'react-hot-toast';
import {
    Braces,
    Plus,
    Trash2,
    Search,
    Info,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PlaceholdersPage = () => {
    const { token } = useAuth();
    const [placeholders, setPlaceholders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newVar, setNewVar] = useState('');
    const [search, setSearch] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const api = createAuthenticatedApi(token);

    const fetchPlaceholders = async () => {
        try {
            const response = await api.get('/placeholders');
            setPlaceholders(response.data);
        } catch (error) {
            toast.error('Failed to fetch placeholders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaceholders();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newVar.trim()) return;

        setIsCreating(true);
        try {
            const response = await api.post('/placeholders', { name: newVar });
            setPlaceholders([...placeholders, response.data]);
            setNewVar('');
            toast.success(`Placeholder {{${response.data.name}}} added!`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add placeholder');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Are you sure you want to delete {{${name}}}?`)) return;

        try {
            await api.delete(`/placeholders/${id}`);
            setPlaceholders(placeholders.filter(p => p._id !== id));
            toast.success('Placeholder removed');
        } catch (error) {
            toast.error('Failed to delete placeholder');
        }
    };

    const filteredPlaceholders = placeholders.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                        <Braces className="text-cyan-400" size={24} />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Custom Placeholders</h1>
                </div>
                <p className="text-neutral-400">
                    Manage your global variables. These can be used in your message templates as <code className="text-cyan-400">{"{{VariableName}}"}</code>.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Add Section */}
                <div className="md:col-span-1">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sticky top-8">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Plus size={18} className="text-cyan-400" />
                            Add New Tag
                        </h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="text-xs text-neutral-500 uppercase font-bold mb-1 block">Variable Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. OrderNum"
                                    value={newVar}
                                    onChange={(e) => setNewVar(e.target.value)}
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                                />
                                <p className="text-[10px] text-neutral-600 mt-2">
                                    Numbers and English letters only. No spaces.
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={isCreating || !newVar.trim()}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {isCreating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                                Create Placeholder
                            </button>
                        </form>

                        <div className="mt-8 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                            <div className="flex gap-2 text-yellow-500 mb-1">
                                <Info size={14} />
                                <span className="text-[10px] font-bold uppercase">Pro Tip</span>
                            </div>
                            <p className="text-[11px] text-neutral-400 leading-relaxed">
                                Use meaningful names. For example, use <span className="text-cyan-400">DueDate</span> instead of <span className="text-neutral-500">Var1</span>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* List Section */}
                <div className="md:col-span-2 space-y-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search your tags..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:ring-2 focus:ring-cyan-500/20 outline-none"
                        />
                    </div>

                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-neutral-800 bg-neutral-900/80 flex justify-between items-center">
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                                Your Custom Tags ({filteredPlaceholders.length})
                            </span>
                        </div>

                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-4 text-neutral-500">
                                <Loader2 className="animate-spin" size={32} />
                                <p>Loading placeholders...</p>
                            </div>
                        ) : filteredPlaceholders.length > 0 ? (
                            <div className="divide-y divide-neutral-800">
                                <AnimatePresence mode='popLayout'>
                                    {filteredPlaceholders.map((p) => (
                                        <motion.div
                                            key={p._id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="p-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-cyan-400 font-mono text-sm border border-neutral-700">
                                                    {"{..}"}
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold flex items-center gap-2">
                                                        {"{{"}{p.name}{"}}"}
                                                    </p>
                                                    <p className="text-[10px] text-neutral-500 mt-0.5">
                                                        Created on {new Date(p.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(p._id, p.name)}
                                                className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                <AlertCircle size={48} className="text-neutral-700 mb-4" />
                                <p className="text-neutral-400 font-medium">No tags found</p>
                                <p className="text-xs text-neutral-600 mt-1">
                                    {search ? "Try a different search term" : "Start by adding your first variable on the left."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaceholdersPage;
