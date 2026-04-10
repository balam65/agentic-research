"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryWorldModelPort = void 0;
class InMemoryWorldModelPort {
    events = [];
    state = new Map();
    jobs = new Map();
    extractedData = [];
    capabilities = new Map();
    async initJob(record) {
        this.jobs.set(record.id, {
            ...record,
            status: record.status ?? "pending"
        });
    }
    async updateJobStatus(jobId, status) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        this.jobs.set(jobId, {
            ...job,
            status
        });
    }
    async updateJobFinalOutput(jobId, finalOutputUrl) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        this.jobs.set(jobId, {
            ...job,
            final_output_url: finalOutputUrl
        });
    }
    async saveExtractedData(record) {
        this.extractedData.push({
            id: `${record.job_id}-${this.extractedData.length + 1}`,
            ...record,
            is_validated: record.is_validated ?? false
        });
    }
    async markLatestExtractedDataValidated(jobId) {
        for (let index = this.extractedData.length - 1; index >= 0; index -= 1) {
            const row = this.extractedData[index];
            if (row.job_id === jobId) {
                row.is_validated = true;
                break;
            }
        }
    }
    async registerCapabilities(capabilities) {
        for (const capability of capabilities) {
            this.capabilities.set(capability.name, capability);
        }
    }
    async writeEvent(event) {
        this.events.push({
            ...event,
            payload: { ...event.payload }
        });
    }
    async readState(key) {
        return this.state.get(key);
    }
    async writeState(key, value) {
        this.state.set(key, value);
    }
    getEvents() {
        return this.events.map((event) => ({
            ...event,
            payload: { ...event.payload }
        }));
    }
    clear() {
        this.events.length = 0;
        this.state.clear();
        this.jobs.clear();
        this.extractedData.length = 0;
        this.capabilities.clear();
    }
    getJobs() {
        return Array.from(this.jobs.values()).map((job) => ({
            ...job
        }));
    }
    getExtractedData() {
        return this.extractedData.map((row) => ({
            ...row
        }));
    }
    getCapabilities() {
        return Array.from(this.capabilities.values());
    }
}
exports.InMemoryWorldModelPort = InMemoryWorldModelPort;
