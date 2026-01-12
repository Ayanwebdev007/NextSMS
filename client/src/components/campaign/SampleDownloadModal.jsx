import React, { useState, useEffect } from 'react';
import {
    X,
    Download,
    Plus,
    Check,
    Trash2,
    FileText,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const SampleDownloadModal = ({ isOpen, onClose, globalPlaceholders }) => {
    const [selectedGlobal, setSelectedGlobal] = useState([]);
    const [extraVars, setExtraVars] = useState([]);
    const [newVarInput, setNewVarInput] = useState("");

    useEffect(() => {
        if (isOpen) {
            setSelectedGlobal([]);
            setExtraVars([]);
            setNewVarInput("");
        }
    }, [isOpen]);

    const toggleGlobal = (name) => {
        if (selectedGlobal.includes(name)) {
            setSelectedGlobal(selectedGlobal.filter(n => n !== name));
        } else {
            setSelectedGlobal([...selectedGlobal, name]);
        }
    };

    const addExtra = () => {
        const val = newVarInput.trim().replace(/[^a-zA-Z0-9]/g, '');
        if (!val) return;
        if (extraVars.includes(val) || globalPlaceholders.find(p => p.name === val)) {
            toast.error("Placeholder already exists");
            return;
        }
        setExtraVars([...extraVars, val]);
        setNewVarInput("");
    };

    const removeExtra = (val) => {
        setExtraVars(extraVars.filter(v => v !== val));
    };

    const handleDownload = () => {
        const headers = ["PhoneNumber", ...selectedGlobal, ...extraVars];
        const csvContent = headers.join(",") + "\n" + "910000000000," + headers.slice(1).map(() => "SampleData").join(",");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "NextSMS_Custom_Template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("CSV Template downloaded!");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/10 rounded-xl">
                                <FileText className="text-cyan-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white leading-none">Customize Template</h2>
                                <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Choose CSV Columns</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Global Placeholders */}
                        <section>
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Saved Placeholders</h3>
                            {globalPlaceholders.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {globalPlaceholders.map(p => (
                                        <button
                                            key={p._id}
                                            onClick={() => toggleGlobal(p.name)}
                                            className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${selectedGlobal.includes(p.name)
                                                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                                                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                                                }`}
                                        >
                                            <span className="text-sm font-medium truncate">{p.name}</span>
                                            {selectedGlobal.includes(p.name) && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 bg-neutral-900/50 rounded-xl border border-neutral-800 text-center">
                                    <p className="text-xs text-neutral-600">No saved placeholders found.</p>
                                </div>
                            )}
                        </section>

                        {/* One-off Placeholders */}
                        <section>
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Quick Add (One-off)</h3>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="e.g. CouponCode"
                                    value={newVarInput}
                                    onChange={(e) => setNewVarInput(e.target.value)}
                                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    onKeyPress={(e) => e.key === 'Enter' && addExtra()}
                                />
                                <button
                                    onClick={addExtra}
                                    className="p-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors border border-neutral-700"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {extraVars.map(v => (
                                    <span key={v} className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-full text-xs text-neutral-300">
                                        {v}
                                        <button onClick={() => removeExtra(v)} className="hover:text-red-400">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </section>

                        <div className="flex items-start gap-3 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
                            <AlertCircle className="text-cyan-500 shrink-0" size={16} />
                            <p className="text-[11px] text-neutral-400 leading-relaxed">
                                Your CSV will always include a <span className="text-white font-bold">PhoneNumber</span> column automatically.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-neutral-900/80 border-t border-neutral-800">
                        <button
                            onClick={handleDownload}
                            className="w-full bg-gradient-to-br from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={20} />
                            Download CSV with {selectedGlobal.length + extraVars.length + 1} Columns
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SampleDownloadModal;
