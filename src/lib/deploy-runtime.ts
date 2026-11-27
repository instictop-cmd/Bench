import type {
  DeployAction,
  DeployLesson,
  DeployVersion,
  LogLine,
} from "@/game/deploy";

export type DeployState = {
  current: string;
  healthy: boolean;
};

export type DeployResult = {
  ok: boolean;
  actionId: string;
  state: DeployState;
  logs: LogLine[];
  message: string;
  ms: number;
};

export interface DeployRuntime {
  run(lesson: DeployLesson, actionId: string): Promise<DeployResult>;
}

function liveVersion(versions: DeployVersion[]): string {
  return versions.find((version) => version.status === "live")?.id ?? "v0";
}

function nextState(
  lesson: DeployLesson,
  action: DeployAction,
  ok: boolean,
): DeployState {
  const current = liveVersion(lesson.versions);

  if (action.kind === "deploy") {
    return { current: action.versionId ?? current, healthy: ok };
  }

  if (action.kind === "rollback") {
    return { current: action.versionId ?? current, healthy: ok };
  }

  return { current, healthy: ok || action.kind === "hold" };
}

export class SimulatedDeployRuntime implements DeployRuntime {
  async run(lesson: DeployLesson, actionId: string): Promise<DeployResult> {
    const action = lesson.actions.find((item) => item.id === actionId);

    if (!action) {
      return {
        ok: false,
        actionId,
        state: { current: liveVersion(lesson.versions), healthy: true },
        logs: lesson.logs,
        message: "unknown action",
        ms: 4,
      };
    }

    const ok = action.id === lesson.expectedAction;
    const state = nextState(lesson, action, ok);
    const message =
      action.outcome ??
      (ok
        ? "The service is stable. The evidence supports this move."
        : "The service is not stable. Read the logs and choose again.");
    const level = action.tone ?? (ok ? "good" : "bad");

    const logs: LogLine[] = [
      ...lesson.logs,
      {
        id: `result-${action.id}`,
        level: level === "good" ? "info" : level === "warn" ? "warn" : "error",
        text: message,
      },
    ];

    return {
      ok,
      actionId,
      state,
      logs,
      message,
      ms: 10,
    };
  }
}

export class FakeDeployRuntime implements DeployRuntime {
  async run(lesson: DeployLesson, actionId: string): Promise<DeployResult> {
    return {
      ok: actionId === lesson.expectedAction,
      actionId,
      state: { current: liveVersion(lesson.versions), healthy: true },
      logs: lesson.logs,
      message: "simulated",
      ms: 1,
    };
  }
}

export const deployRuntime: DeployRuntime = new SimulatedDeployRuntime();
