// Mock Supabase Realtime App connection
const mockEvents = [
    { name: 'job_scheduled', confidence: 1.0, agent: 'schedule_manager', time: '10:00 AM' },
    { name: 'url_discovered', confidence: 0.92, agent: 'url_discovery', time: '10:02 AM' },
    { name: 'extraction_completed', confidence: 0.88, agent: 'data_extractor', time: '10:05 AM' }
];

document.addEventListener("DOMContentLoaded", () => {
    const eventFeed = document.getElementById('event-feed');

    // Simulate streaming events from World Model DB (Supabase)
    let idx = 0;
    
    function appendEvent() {
        if (idx >= mockEvents.length) {
            // Loop for demo
            idx = 0;
        }

        const ev = mockEvents[idx];
        const li = document.createElement('li');
        li.className = 'event-item';
        
        const isHighConfidence = ev.confidence >= 0.80;
        const badgeClass = isHighConfidence ? 'badge-high' : 'badge-low';

        li.innerHTML = `
            <div>
                <span class="event-name">${ev.name}</span>
                <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.25rem;">Emit by: ${ev.agent} @ ${new Date().toLocaleTimeString()}</div>
            </div>
            <div class="badge ${badgeClass}">Conf: ${ev.confidence}</div>
        `;
        
        // Add to top of list
        eventFeed.insertBefore(li, eventFeed.firstChild);
        
        // Keep only latest 10
        if (eventFeed.children.length > 10) {
            eventFeed.removeChild(eventFeed.lastChild);
        }

        idx++;
        setTimeout(appendEvent, Math.random() * 3000 + 2000); // random interval
    }

    // start simulation
    appendEvent();
});
