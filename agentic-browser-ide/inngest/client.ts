// Inngest client for browser agent orchestration
import { Inngest, EventSchemas } from 'inngest';
import { CONSTANTS, EVENTS } from '@/lib/constants';

type Events = {
  [EVENTS.TASK_STARTED]: {
    data: {
      taskId: string;
      intent: string;
    };
  };
  [EVENTS.STEP_EXECUTE]: {
    data: {
      taskId: string;
      stepId: string;
    };
  };
  [EVENTS.STEP_COMPLETED]: {
    data: {
      taskId: string;
      stepId: string;
      result: string;
    };
  };
  [EVENTS.TASK_COMPLETED]: {
    data: {
      taskId: string;
    };
  };
};

export const inngest = new Inngest({
  id: CONSTANTS.INNGEST.APP_ID,
  schemas: new EventSchemas().fromRecord<Events>(),
  eventKey: process.env.INNGEST_EVENT_KEY || 'local-dev-key',
});
