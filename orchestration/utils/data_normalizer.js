/**
 * Data Normalizer Utility
 * Purpose: Fast, non-LLM transformation of dates, currencies, and units.
 */

const moment = require('moment'); // Assuming moment is available in n8n/node environment.

function normalizeRecord(record) {
    const normalized = { ...record };

    // 1. Date Normalization (ISO-8601)
    if (normalized.date) {
        normalized.date = moment(normalized.date).format('YYYY-MM-DD');
    }

    // 2. Currency Stripping
    if (normalized.price && typeof normalized.price === 'string') {
        const currencyMatch = normalized.price.match(/([^\d.,\s]+)/);
        normalized.currency_type = currencyMatch ? currencyMatch[0] : 'USD';
        normalized.price = parseFloat(normalized.price.replace(/[^\d.-]/g, ''));
    }

    // 3. Unit Conversion (Lbs to Kgs)
    if (normalized.weight && typeof normalized.weight === 'string' && normalized.weight.includes('lbs')) {
        const lbsValue = parseFloat(normalized.weight.replace(/[^\d.-]/g, ''));
        normalized.weight_kg = (lbsValue * 0.453592).toFixed(2);
    }

    return normalized;
}

// n8n Entry Point
return items.map(item => {
    return {
        json: normalizeRecord(item.json)
    };
});
