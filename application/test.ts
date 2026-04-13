import { InputContractModule } from './src/module_1/index';

const module1 = new InputContractModule();

const mockUserRequirements = {
    target: {
        url_or_domain: "https://amazon.com/laptops",
        scope: "search_results"
    },
    constraints: {
        max_time_ms: 120000,
        requires_js_rendering: true
    },
    expected_schema: {
        "title": "string",
        "price": "number",
        "rating": "number"
    },
    // Adding some random unstructured/malicious junk that should be stripped
    malicious_injection: "DROP TABLE users",
    internal_flag_bypass: true
};

console.log("--- Starting Module 1 Validation ---");
try {
    const outputJSON = module1.processRequirement(mockUserRequirements);
    console.log("SUCCESS! Payload ready to be published to Module 2 (Event Router): \n");
    console.log(JSON.stringify(outputJSON, null, 2));
} catch (err: any) {
    console.error(err.message);
}
