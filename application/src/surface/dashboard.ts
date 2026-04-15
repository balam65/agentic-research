import { WorldModelStore } from '../memory/world_model_store.js';

export interface DashboardSnapshot {
  tasks: Array<{
    id: string;
    status: string;
    outputGoal: string[];
    latestIntelligenceDecision: string | null;
    latestRoutingEvent: string | null;
    pendingStages: string[];
    completedStages: string[];
  }>;
  kpis: {
    totalTasks: number;
    waitingForHuman: number;
    completed: number;
    failed: number;
  };
}

export async function buildDashboardSnapshot(store: WorldModelStore): Promise<DashboardSnapshot> {
  const tasks = store.listTasks();
  const taskViews = await Promise.all(
    tasks.map(async (task) => {
      const world = await store.getWorldView(task.id);
      const workflowState = await store.getWorkflowState(task.id);
      const latestDecision = [...world.events]
        .reverse()
        .find((event) => event.type === 'intelligence_decision_recorded');
      const latestRouting = [...world.events]
        .reverse()
        .find((event) => event.type === 'routing_decision_emitted');

      return {
        id: task.id,
        status: task.status,
        outputGoal: task.outputGoal,
        latestIntelligenceDecision:
          latestDecision?.type === 'intelligence_decision_recorded'
            ? latestDecision.payload.selectedCapabilityId
            : null,
        latestRoutingEvent:
          latestRouting?.type === 'routing_decision_emitted'
            ? latestRouting.payload.next_event
            : null,
        pendingStages: workflowState.pendingStages,
        completedStages: workflowState.completedStages,
      };
    }),
  );

  return {
    tasks: taskViews,
    kpis: {
      totalTasks: tasks.length,
      waitingForHuman: tasks.filter((task) => task.status === 'waiting_for_human').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
      failed: tasks.filter((task) => task.status === 'failed').length,
    },
  };
}
