/**
 * Proxy & Identity Rotator Utility
 * Purpose: Selects the next safe IP and User-Agent based on domain history.
 */

const proxyPool = [
    "http://res_proxy_1:port",
    "http://res_proxy_2:port",
    "http://dc_proxy_1:port"
];

const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
];

function getNextProxy(domain, history = []) {
    // Basic Round-Robin logic for demonstration
    const proxy = proxyPool[Math.floor(Math.random() * proxyPool.length)];
    const ua = userAgents[Math.floor(Math.random() * userAgents.length)];

    return {
        proxy,
        headers: {
            "User-Agent": ua,
            "Accept": "application/json, text/html, */*",
            "Accept-Language": "en-US,en;q=0.9",
        }
    };
}

// n8n Entry Point
return {
    ...getNextProxy(items[0].json.domain_name),
    job_id: items[0].json.job_id
};
