export const Logger = {
    info: (message: string, data?: any) => {
        console.info(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
        saveLog('INFO', message, data);
    },
    error: (message: string, error?: any) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
        saveLog('ERROR', message, error);
    },
    warn: (message: string, data?: any) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
        saveLog('WARN', message, data);
    }
};

// Lưu bản ghi log vào localStorage để tiện tra cứu sau này.
function saveLog(level: string, message: string, data: any) {
    try {
        const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            level,
            message,
            data: data ? JSON.stringify(data) : null
        });
        // Giữ lại 100 log gần nhất
        if (logs.length > 100) {
            logs.shift();
        }
        localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (e) {
        // Ignored
    }
}
