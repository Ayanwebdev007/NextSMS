import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { createAuthenticatedApi } from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
    Braces,
    Plus,
    Trash2,
    Search,
    Info,
    Loader2,
    AlertCircle,
    ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PlaceholdersPage = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
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
        <>
            <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors"
            >
                <ChevronLeft size={20} />
                Back to Dashboard
            </button>

            <div className="max-w-6xl mx-auto">
                <div className="mb-12 text-center">
                    <div className="inline-flex p-3 bg-cyan-500/10 rounded-2xl mb-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
                        <Braces className="text-cyan-400" size={32} />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3">
                        Custom{" "}
                        <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
                            Placeholders
                        </span>
                    </h1>
                    <p className="text-neutral-400 max-w-lg mx-auto leading-relaxed">
                        Centrally manage your personalization tags. Use them in messages as <code className="text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">{"{{Tag}}"}</code>.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Add Section */}
                    <div className="lg:col-span-4">
                        <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 lg:sticky lg:top-24 shadow-xl">
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Plus size={20} className="text-cyan-400" />
                                Add New Tag
                            </h2>
                            <form onSubmit={handleAdd} className="space-y-5">
                                <div>
                                    <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2 block">
                                        Variable Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. BillDueDate"
                                        value={newVar}
                                        onChange={(e) => setNewVar(e.target.value)}
                                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 outline-none transition-all placeholder:text-neutral-700"
                                    />
                                    <p className="text-[10px] text-neutral-600 mt-2 italic">
                                        * Use Alphanumeric characters only.
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isCreating || !newVar.trim()}
                                    className="w-full bg-gradient-to-br from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/10"
                                >
                                    {isCreating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                    Create Tag
                                </button>
                            </form>

                            <div className="mt-8 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                                <div className="flex gap-2 text-yellow-500 mb-2">
                                    <Info size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Pro Tip</span>
                                </div>
                                <p className="text-[11px] text-neutral-400 leading-relaxed">
                                    Define your variables here first, then choose them when downloading your Campaign CSV template.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-cyan-400 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Filter your saved tags..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-neutral-700 outline-none shadow-xl transition-all"
                            />
                        </div>

                        <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-5 border-b border-neutral-800 bg-neutral-900/40 flex justify-between items-center">
                                <span className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.2em]">
                                    Active Database Tags ({filteredPlaceholders.length})
                                </span>
                            </div>

                            {loading ? (
                                <div className="p-20 flex flex-col items-center justify-center gap-4 text-neutral-500">
                                    <Loader2 className="animate-spin" size={40} />
                                    <p className="font-medium animate-pulse">Synchronizing tags...</p>
                                </div>
                            ) : filteredPlaceholders.length > 0 ? (
                                <div className="divide-y divide-neutral-800/50">
                                    <AnimatePresence mode='popLayout'>
                                        {filteredPlaceholders.map((p) => (
                                            <motion.div
                                                key={p._id}
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                className="p-5 flex items-center justify-between hover:bg-neutral-800/20 transition-all group/item"
                                            >
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center text-cyan-400 font-mono text-sm border border-neutral-700 shadow-inner group-hover/item:border-cyan-500/30 transition-colors">
                                                        {"{..}"}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-lg flex items-center gap-2 group-hover/item:text-cyan-400 transition-colors">
                                                            {"{{"}{p.name}{"}}"}
                                                        </p>
                                                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                                                            Synced {new Date(p.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(p._id, p.name)}
                                                    className="p-3 text-neutral-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all opacity-0 group-hover/item:opacity-100 transform translate-x-2 group-hover/item:translate-x-0"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="p-20 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mb-6">
                                        <AlertCircle size={40} className="text-neutral-700" />
                                    </div>
                                    <p className="text-neutral-400 font-bold text-xl uppercase tracking-widest">No tags indexed</p>
                                    <p className="text-sm text-neutral-600 mt-2 max-w-xs leading-relaxed">
                                        {search ? "No matches found in your database." : "Your account doesn't have any custom placeholders yet. Create one to get started."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PlaceholdersPage;
