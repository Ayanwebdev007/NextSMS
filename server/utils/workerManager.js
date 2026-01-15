/**
 * Worker Manager - Centralized control for BullMQ worker lifecycle
 * 
 * This module manages the worker's sleep/wake cycle to eliminate idle Redis requests.
 * The worker sleeps after 15 minutes of inactivity and wakes on demand.
 */

let workerInstance = null;
let workerState = 'sleeping'; // 'sleeping' | 'active'
let lastActivity = Date.now();
const SLEEP_TIMEOUT = 15 * 60 * 1000; // 15 minutes

/**
 * Initialize the worker manager with a worker instance
 */
export function initializeWorkerManager(worker) {
    workerInstance = worker;
    workerState = 'active'; // Start active
    startSleepMonitor();
    console.log('[WORKER-MANAGER] Initialized. Worker starts in active mode.');
}

/**
 * Wake the worker if it's sleeping
 */
export function wakeWorker() {
    if (!workerInstance) {
        console.warn('[WORKER-MANAGER] Cannot wake worker - not initialized');
        return;
    }

    if (workerState === 'sleeping') {
        console.log('[WORKER-MANAGER] 💤 → 🔥 Waking worker from sleep...');
        workerInstance.resume();
        workerState = 'active';
    }

    // Update last activity timestamp
    lastActivity = Date.now();
}

/**
 * Force worker to sleep (for testing or manual control)
 */
export function sleepWorker() {
    if (!workerInstance || workerState === 'sleeping') return;

    console.log('[WORKER-MANAGER] 🔥 → 💤 Putting worker to sleep...');
    workerInstance.pause();
    workerState = 'sleeping';
}

/**
 * Get current worker state
 */
export function getWorkerState() {
    return {
        state: workerState,
        lastActivity: new Date(lastActivity).toISOString(),
        idleTime: Date.now() - lastActivity
    };
}

/**
 * Monitor for inactivity and put worker to sleep
 */
function startSleepMonitor() {
    setInterval(() => {
        const idleTime = Date.now() - lastActivity;

        if (workerState === 'active' && idleTime > SLEEP_TIMEOUT) {
            console.log(`[WORKER-MANAGER] No activity for ${Math.round(idleTime / 60000)} minutes. Entering sleep mode...`);
            sleepWorker();
        }
    }, 60000); // Check every minute
}
