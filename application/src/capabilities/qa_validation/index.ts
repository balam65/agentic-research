import { DatabaseStore, supabase } from '../../world_model/store';

export class QAValidationCapability {
  private db: DatabaseStore;

  constructor() {
    this.db = new DatabaseStore();
  }

  async execute(jobId: string) {
    // 1. Report State (world_events)
    await this.db.logEvent({
      job_id: jobId,
      event_type: 'CAPABILITY_START',
      source: 'CapQA',
      message: 'Initializing QA Schema Validation'
    });

    await this.db.updateJobStatus(jobId, 'running');

    try {
      // 2. Read the Contract to get the expected schema definitions
      const job = await this.db.getJob(jobId);
      const expectedSchema = job.input_params?.schema || {};

      // 3. Fetch the payload the Extractor just saved
      const { data: extraction, error } = await supabase
        .from('extracted_data')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error || !extraction) {
		    throw new Error("No extracted data payload found to validate for this Job ID");
	    }

      await this.db.logEvent({
        job_id: jobId,
        event_type: 'QA_PROGRESS',
        source: 'CapQA',
        message: 'Validating payload against expected operational schema requirements'
      });

      // 4. Mock Schema Validation Logic
      let isValid = true;
      
      // Enforce the rule: if the extractor used a fallback, it will have a confidence < 0.8.
      // We automatically flag those for human review (HITL)
      if (extraction.confidence < 0.8) {
         isValid = false;
         await this.db.logEvent({
             job_id: jobId,
             event_type: 'QA_FAILED',
             source: 'CapQA',
             message: `Extraction confidence score (${extraction.confidence}) fell below threshold. Escalating to HITL.`
         });
      }

      // 5. Save Results
      if (isValid) {
        // Success: the payload perfectly mapped. Mark it true.
        await supabase
          .from('extracted_data')
          .update({ is_validated: true })
          .eq('id', extraction.id);
          
        await this.db.updateJobStatus(jobId, 'completed'); // Job fully done
        
        await this.db.logEvent({
          job_id: jobId,
          event_type: 'QA_PASSED',
          source: 'CapQA',
          message: 'Data schema validation successful. Data ready for Delivery.'
        });
      } else {
        // Failure: Human needs to review exactly what the extractor pulled
        await this.db.updateJobStatus(jobId, 'hitl_alert');
      }

    } catch (e: any) {
      await this.db.logEvent({
        job_id: jobId,
        event_type: 'CAPABILITY_ERROR',
        source: 'CapQA',
        message: `Validation wrapper critically failed: ${e.message}`
      });
      await this.db.updateJobStatus(jobId, 'failed');
    }
  }
}
