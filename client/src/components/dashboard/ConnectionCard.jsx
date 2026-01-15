import React, { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import { Wifi, WifiOff, QrCode, LoaderCircle, RefreshCw } from "lucide-react";
import { createAuthenticatedApi } from "../../services/api";

const ConnectionCard = () => {
    const { token, logout } = useAuth();
    const [status, setStatus] = useState("loading");
    const statusRef = useRef(status);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState("");
    const [qrAttempt, setQrAttempt] = useState(0);
    const [countdown, setCountdown] = useState(10);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const pollingInterval = useRef(null);
    const connectToastId = useRef(null);
    const fetchController = useRef(null);

    // Keep the ref in sync with state so fetchStatus can read latest value without being re-created
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    const stopPolling = useCallback(() => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    }, []);

    const fetchStatus = useCallback(
        async (showLoading = false) => {
            if (showLoading && statusRef.current !== "initializing")
                setStatus("loading");

            if (fetchController.current) {
                fetchController.current.abort();
            }
            fetchController.current = new AbortController();

            try {
                const api = createAuthenticatedApi(token);
                const response = await api.get("/session/status", {
                    signal: fetchController.current.signal,
                });
                const newStatus = response.data.status || "disconnected";
                const newQr = response.data.qrCodeUrl || "";
                const attempt = response.data.qrAttempt || 0;

                if (newQr) setQrCodeUrl(newQr);
                setQrAttempt(attempt);

                setStatus((prevStatus) => {
                    if (prevStatus !== newStatus) {
                        if (
                            prevStatus === "qr_pending" &&
                            newStatus === "connected"
                        ) {
                            // 🐛 FIX: Force dismiss loading toast before success
                            if (connectToastId.current) {
                                toast.dismiss(connectToastId.current);
                                toast.success(
                                    "WhatsApp successfully connected!",
                                    {
                                        id: connectToastId.current,
                                    }
                                );
                                connectToastId.current = null;
                            }
                        }
                        if (
                            newStatus === "connected" ||
                            newStatus === "disconnected"
                        ) {
                            stopPolling();
                            setIsModalOpen(false);
                        }
                        if (newStatus === "qr_expired") {
                            toast.error('QR code expired after 3 attempts. Click Connect to try again.', { duration: 6000 });
                            stopPolling();
                            setIsModalOpen(false);
                            return "disconnected"; // Set to disconnected so user can retry
                        }
                        return newStatus;
                    }
                    return prevStatus;
                });
            } catch (error) {
                if (
                    error.name === "CanceledError" ||
                    error.name === "AbortError"
                ) {
                    console.log(
                        "Fetch status request was intentionally canceled."
                    );
                    return;
                }
                console.error("Failed to fetch status:", error);
                setStatus("disconnected");
                stopPolling();
                if (error.response?.status === 401) {
                    toast.error("Session expired. Please log in again.");
                    logout();
                }
            }
        },
        [token, logout, stopPolling]
    );

    useEffect(() => {
        if (token) {
            pollingInterval.current = setInterval(() => {
                fetchStatus();
            }, 3000);
        }
        return () => {
            stopPolling();
            if (fetchController.current) fetchController.current.abort();
        };
    }, [fetchStatus, token, stopPolling]);

    // 🚀 Auto-open QR modal if scan is pending
    useEffect(() => {
        if (status === "qr_pending" && qrCodeUrl && !isModalOpen) {
            setIsModalOpen(true);
        }
    }, [status, qrCodeUrl, isModalOpen]);

    // ⏱️ Countdown timer for QR regeneration
    useEffect(() => {
        if (status === 'qr_pending' && qrAttempt > 0) {
            setCountdown(10); // Reset to 10 seconds

            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        return 10; // Reset when it reaches 0
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [status, qrAttempt]);

    // const handleConnect = async () => {
    //     setIsActionLoading(true);
    //     connectToastId.current = toast.loading("Initializing session...");
    //     try {
    //         const api = createAuthenticatedApi(token);
    //         const response = await api.post("/session/connect");
    //         setQrCodeUrl(response.data.qrCodeUrl);
    //         setIsModalOpen(true);
    //         setStatus("qr_pending");
    //         toast.loading("QR Code ready. Please scan.", {
    //             id: connectToastId.current,
    //         });
    //         stopPolling();
    //         pollingInterval.current = setInterval(() => {
    //             fetchStatus();
    //         }, 3000);
    //     } catch (error) {
    //         const errorMessage =
    //             error.response?.data?.message || "Failed to generate QR code.";
    //         toast.error(errorMessage, { id: connectToastId.current });
    //         connectToastId.current = null;
    //     } finally {
    //         setIsActionLoading(false);
    //     }
    // };

    const handleConnect = async () => {
        setIsActionLoading(true);
        toast.loading("Initializing session...", { id: "init-toast" });

        try {
            const api = createAuthenticatedApi(token);
            const response = await api.post("/session/connect");
            setQrCodeUrl(response.data.qrCodeUrl);
            setIsModalOpen(true);
            setStatus("qr_pending");

            // ✅ NEW TOAST: separate ID, auto-dismisses after 4s
            toast.success("QR Code ready. Please scan.", {
                duration: 6000,
            });

            // Dismiss the init toast
            toast.dismiss("init-toast");

            stopPolling();
            pollingInterval.current = setInterval(() => {
                fetchStatus();
            }, 3000);
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "Failed to generate QR code.";
            toast.error(errorMessage);
        } finally {
            setIsActionLoading(false);
        }
    };


    const handleDisconnect = async (showToast = true) => {
        if (fetchController.current) {
            fetchController.current.abort();
        }

        stopPolling();
        setIsActionLoading(true);
        const toastId = showToast
            ? toast.loading("Disconnecting session...")
            : null;

        setStatus("disconnected");
        setIsModalOpen(false);
        setQrCodeUrl("");

        try {
            const api = createAuthenticatedApi(token);
            await api.delete("/session/disconnect");
            if (toastId)
                toast.success("Session disconnected successfully.", {
                    id: toastId,
                });
        } catch {
            if (toastId)
                toast.error("Failed to disconnect. Re-checking status.", {
                    id: toastId,
                });
            setTimeout(() => fetchStatus(true), 500);
        } finally {
            setIsActionLoading(false);
        }
    };

    const StatusIndicator = () => {
        switch (status) {
            case "connected":
                return (
                    <div className="flex items-center gap-2 text-green-400">
                        <Wifi size={20} /> Connected
                    </div>
                );
            case "disconnected":
                return (
                    <div className="flex items-center gap-2 text-red-500">
                        <WifiOff size={20} /> Disconnected
                    </div>
                );
            case "qr_pending":
                return (
                    <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
                        <QrCode size={20} /> Awaiting Scan...
                    </div>
                );
            case "initializing":
                return (
                    <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
                        <LoaderCircle size={20} className="animate-spin" />{" "}
                        Restoring session...
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-2 text-neutral-500">
                        <LoaderCircle size={20} className="animate-spin" />{" "}
                        Checking...
                    </div>
                );
        }
    };

    return (
        <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <img src="/whatsapp-icon.png" alt="WA" className="w-8 h-8 object-contain" />
                    Connection{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
                        Status
                    </span>
                </h2>
                <button
                    onClick={() => fetchStatus(true)}
                    disabled={status === "loading" || status === "initializing"}
                    className="text-neutral-400 hover:text-white disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
                    title="Refresh Status"
                >
                    <RefreshCw
                        size={18}
                        className={
                            status === "loading" || status === "initializing"
                                ? "animate-spin"
                                : ""
                        }
                    />
                </button>
            </div>
            <div className="text-lg font-semibold mb-6">
                <StatusIndicator />
            </div>
            <div className="flex gap-4">
                {(status === "disconnected" || status === "initializing") && (
                    <button
                        onClick={handleConnect}
                        disabled={isActionLoading || status === "initializing"}
                        className="flex-1 text-center font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                    >
                        Connect Now
                    </button>
                )}
                {status === "qr_pending" && (
                    <div className="flex flex-col gap-2 flex-1">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full text-center font-bold text-white bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg transition-colors"
                        >
                            View QR Code
                        </button>
                        <button
                            onClick={() => setIsConfirmModalOpen(true)}
                            disabled={isActionLoading}
                            className="w-full text-center font-bold text-white bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg transition-colors text-sm"
                        >
                            Cancel Scan
                        </button>
                    </div>
                )}
                {status === "connected" && (
                    <button
                        onClick={() => setIsConfirmModalOpen(true)}
                        disabled={isActionLoading}
                        className="flex-1 text-center font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
                    >
                        Disconnect
                    </button>
                )}
            </div>
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    handleDisconnect(false);
                }}
            >
                {qrCodeUrl ? (
                    <div>
                        <div className="bg-white p-4 rounded-lg">
                            <img src={qrCodeUrl} alt="WhatsApp QR Code" />
                        </div>
                        {qrAttempt > 0 && (
                            <div className="mt-4 text-center">
                                <p className="text-sm text-cyan-400 font-semibold">
                                    Attempt {qrAttempt} of 3
                                </p>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {qrAttempt < 3
                                        ? "New QR will generate in 10 seconds if not scanned"
                                        : "Last attempt - scan now or it will expire"}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex justify-center items-center h-48">
                        <LoaderCircle size={40} className="animate-spin" />
                    </div>
                )}
                <p className="text-center text-sm text-neutral-400 mt-4">
                    Scan this with WhatsApp on your phone from Settings &gt;
                    Linked Devices.
                </p>
            </Modal>

            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
            >
                <div className="text-center p-4">
                    <WifiOff size={48} className="mx-auto text-red-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Are you sure?</h3>
                    <p className="text-neutral-400 mb-6 px-4">
                        Disconnecting will stop all active campaigns and you will need to scan the QR code again to reconnect.
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsConfirmModalOpen(false)}
                            className="flex-1 py-2 font-bold text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-all"
                        >
                            No, Keep it
                        </button>
                        <button
                            onClick={async () => {
                                setIsConfirmModalOpen(false);
                                await handleDisconnect(true);
                            }}
                            className="flex-1 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all"
                        >
                            Yes, Disconnect
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ConnectionCard;
