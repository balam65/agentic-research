import { WorldModelStore } from '../world_model/event_store.js';

export interface DashboardSnapshot {
  tasks: Array<{
    id: string;
    status: string;
    outputGoal: string[];
    latestIntelligenceDecision: string | null;
  }>;
  kpis: {
    totalTasks: number;
    waitingForHuman: number;
    completed: number;
    failed: number;
  };
}

export function buildDashboardSnapshot(store: WorldModelStore): DashboardSnapshot {
  const tasks = store.listTasks();
  return {
    tasks: tasks.map((task) => {
      const world = store.getWorldView(task.id);
      const latestDecision = [...world.events]
        .reverse()
        .find((event) => event.type === 'intelligence_decision_recorded');

      return {
        id: task.id,
        status: task.status,
        outputGoal: task.outputGoal,
        latestIntelligenceDecision:
          latestDecision?.type === 'intelligence_decision_recorded'
            ? latestDecision.payload.selectedCapabilityId
            : null,
      };
    }),
    kpis: {
      totalTasks: tasks.length,
      waitingForHuman: tasks.filter((task) => task.status === 'waiting_for_human').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
      failed: tasks.filter((task) => task.status === 'failed').length,
    },
  };
}
