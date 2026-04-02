/**
 * Export Packager Utility
 * Purpose: ZIPs and prepares validated data for delivery.
 */

function packageData(items, options = {}) {
    // Basic demonstration of packaging logic. 
    // real n8n environments would use the 'zipper' or 'crypto' libraries.
    const manifest = {
        job_id: items[0].json.job_id,
        record_count: items.length,
        timestamp: new Date().toISOString(),
        format: options.format || 'CSV'
    };

    return items.map(item => {
        return {
            json: {
                ...item.json,
                _manifest: manifest,
                _packaged_at: new Date().toISOString()
            }
        };
    });
}

// n8n Entry Point
return packageData(items, { format: 'CSV' });
