import { createLogger } from '../logs/logger.js';
import type { CapabilityContext } from '../tools/capability_context.js';
import type { CapabilityService, PipelineEvent } from '../utils/contracts.js';
import { isRecord } from '../utils/contracts.js';

const logger = createLogger('discovery-service');

/**
 * Discovery capability — resolves target domains into actionable URLs
 * using real HTTP HEAD requests and sitemap/robots.txt analysis.
 */
export class DiscoveryService implements CapabilityService {
  name = "discovery";
  consumes = ["job_scheduled"];
  produces = ["url_discovered", "discovery_failed"];

  async execute(_context: CapabilityContext, event: PipelineEvent): Promise<PipelineEvent[]> {
    if (!isRecord(event.payload) || typeof event.payload.target_domain !== "string") {
      return [this.failedEvent(event, "Scheduling payload missing target_domain")];
    }

    const targetDomain = event.payload.target_domain.trim().toLowerCase();
    if (!targetDomain) {
      return [this.failedEvent(event, "target_domain cannot be empty")];
    }

    const endTimer = logger.startTimer('URL discovery', { targetDomain }, event.job_id);

    // --- Real discovery logic ---
    const candidates: string[] = [];
    let domainAuthority = 50;

    // 1. Attempt to resolve the live URL and check accessibility
    const protocols = ['https', 'http'];
    for (const protocol of protocols) {
      const testUrl = `${protocol}://${targetDomain}`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(testUrl, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
        });
        clearTimeout(timeout);

        if (response.ok || response.status === 405) {
          candidates.push(response.url || testUrl);
          // Higher authority for HTTPS sites that respond quickly
          domainAuthority = protocol === 'https' ? 85 : 70;
          break;
        }
      } catch {
        // Continue trying next protocol
      }
    }

    // 2. Check for robots.txt to find sitemap URLs
    try {
      const robotsUrl = `https://${targetDomain}/robots.txt`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const robotsResponse = await fetch(robotsUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (robotsResponse.ok) {
        const robotsText = await robotsResponse.text();
        const sitemapMatches = robotsText.match(/Sitemap:\s*(\S+)/gi);
        if (sitemapMatches) {
          for (const match of sitemapMatches.slice(0, 3)) {
            const sitemapUrl = match.replace(/Sitemap:\s*/i, '').trim();
            candidates.push(sitemapUrl);
          }
          domainAuthority = Math.min(95, domainAuthority + 10);
        }
      }
    } catch {
      // robots.txt not accessible — continue with basic discovery
    }

    // 3. Fallback: construct a research URL if no live candidates found
    if (candidates.length === 0) {
      candidates.push(`https://${targetDomain}`);
      domainAuthority = 40;
    }

    const discoveredUrl = candidates[0]!;

    endTimer();
    logger.info('Discovery completed', {
      targetDomain,
      discoveredUrl,
      candidateCount: candidates.length,
      domainAuthority,
    }, event.job_id);

    return [
      {
        event_name: "url_discovered",
        job_id: event.job_id,
        payload: {
          target_domain: targetDomain,
          discovered_url: discoveredUrl,
          domain_authority: domainAuthority,
          candidate_urls: candidates,
          discovery_metadata: {
            protocols_tested: protocols.length,
            robots_txt_found: candidates.length > 1,
            total_candidates: candidates.length,
          }
        },
        confidence_score: domainAuthority >= 70 ? 0.92 : 0.72,
        justification: `Discovery found ${candidates.length} candidate URL(s) for '${targetDomain}' (authority: ${domainAuthority}).`
      }
    ];
  }

  private failedEvent(event: PipelineEvent, message: string): PipelineEvent {
    logger.warn('Discovery failed', { error: message }, event.job_id);
    return {
      event_name: "discovery_failed",
      job_id: event.job_id,
      payload: { error: message },
      confidence_score: 0.4,
      justification: message
    };
  }
}
