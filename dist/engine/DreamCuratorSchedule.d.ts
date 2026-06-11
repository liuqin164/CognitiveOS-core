export type DreamCuratorScheduleMode = 'manual' | 'interval' | 'daily' | 'continuous';
export interface DreamCuratorScheduleConfig {
    mode: DreamCuratorScheduleMode;
    intervalMs?: number;
    dailyTimes?: string[];
    timezone?: string;
    continuousIdleMs?: number;
    lastRunAt?: number;
}
export interface DreamCuratorWorkflowDescription {
    mode: DreamCuratorScheduleMode;
    trigger: string;
    hostResponsibility: string;
    coreResponsibility: string;
}
export declare function describeDreamCuratorWorkflow(config: DreamCuratorScheduleConfig): DreamCuratorWorkflowDescription;
export declare function nextDreamCuratorRunAt(config: DreamCuratorScheduleConfig, now?: number): number | undefined;
//# sourceMappingURL=DreamCuratorSchedule.d.ts.map