import { WorldModelEvent } from '../world_model/store';
export declare class OrchestratorRouter {
    private capAssess;
    private capSched;
    private capDisc;
    private capScript;
    private capProxy;
    private capExtr;
    private capQA;
    private capDeliv;
    handleEvent(event: WorldModelEvent): Promise<void>;
    private requiresHumanIntervention;
}
//# sourceMappingURL=router.d.ts.map