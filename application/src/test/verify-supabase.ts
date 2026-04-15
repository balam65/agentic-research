import dotenv from 'dotenv';
import path from 'path';
import { SupabaseDurableStatePort } from '../ports/supabaseDurableStatePort';
import { WorldModelStore } from '../world_model/event_store';
import { TaskRecord } from '../world_model/schema';
import { randomUUID } from 'node:crypto';

// Setup environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function verify() {
  console.log('\n🚀 --- Supabase Persistence Verification (Phase 1) ---');
  
  let port: SupabaseDurableStatePort;
  try {
    port = SupabaseDurableStatePort.fromEnv();
  } catch (err: any) {
    console.error(`❌ Setup Error: ${err.message}`);
    process.exit(1);
  }

  const store = new WorldModelStore(port);
  
  console.log('\n🔍 Running health check...');
  if (!await port.checkHealth()) {
      console.error('\n❌ Supabase tables are missing.');
      console.error('ACTION REQUIRED: Please run the SQL migration found in:');
      console.error('[application/src/world_model/schema_migration.sql]');
      console.error('in your Supabase SQL Editor to initialize the modern schema.');
      process.exit(1);
  }
  console.log('✅ Tables identified.');

  const testTaskId = `test-task-${randomUUID().substring(0, 8)}`;
  
  try {
    console.log(`\n1. Testing Task Submission [ID: ${testTaskId}]...`);
    const task: Omit<TaskRecord, 'createdAt' | 'updatedAt'> = {
      id: testTaskId,
      input: {
        requestId: testTaskId,
        targetSpec: 'https://example.com',
        constraints: {},
        requestedSchema: {}
      },
      outputGoal: ['final_result'],
      status: 'submitted',
      governance: { humanReviewRequired: false }
    };
    
    await store.submitTask(task);
    console.log('✅ Task submitted successfully.');
    
    console.log('\n2. Testing Event Recording...');
    await store.recordWorkflowEvent(testTaskId, {
      event_id: randomUUID(),
      event_type: 'INPUT_CONTRACT_VALIDATED',
      timestamp: new Date().toISOString(),
      payload: {
        target: { url_or_domain: 'example.com', scope: 'search_results' },
        search_parameters: {},
        intent_context: 'Verification test',
        constraints: {},
        expected_schema: {}
      },
      confidence_score: 1.0,
      justification: 'Automated verification event'
    });
    console.log('✅ Event recorded successfully.');
    
    console.log('\n3. Testing Retrieval & Hydration...');
    const newStore = new WorldModelStore(port);
    const hydrated = await newStore.hydrateTask(testTaskId);
    
    if (hydrated) {
      console.log('✅ Task state hydrated from Supabase.');
      const view = await newStore.getWorldView(testTaskId);
      console.log(`   - Task Status: ${view.task.status}`);
      console.log(`   - Event Count: ${view.events.length}`);
      
      if (view.events.length > 0) {
        console.log('✅ Data integrity verified (Events present in world view).');
      } else {
        throw new Error('Data integrity check failed: No events found after hydration.');
      }
    } else {
      throw new Error('Hydration failed: Task not found in persistence layer.');
    }
    
    console.log('\n🎉 --- All Phase 1 Verifications Passed ---');
    console.log('The World Model is correctly persisting to Supabase.\n');
    
  } catch (err: any) {
    console.error('\n❌ Verification Failed!');
    if (err.message.includes('relation') && err.message.includes('does not exist')) {
        console.error('\nERROR: One or more Supabase tables are missing.');
        console.error('ACTION REQUIRED: Please run the SQL migration found in:');
        console.error('[application/src/world_model/schema_migration.sql]');
        console.error('in your Supabase SQL Editor to initialize the modern schema.');
    } else {
        console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}

verify();
