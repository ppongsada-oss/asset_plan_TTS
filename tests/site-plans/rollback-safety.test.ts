import assert from "node:assert/strict";
import test from "node:test";
import {
  replacePlansWithRollback,
  type NewPlanSnapshot,
} from "@/app/api/site/plans/route";

const originalPlans = [
  {
    project_id: "P1",
    equipment_id: 1,
    month: "2026-06",
    required_qty: 4,
    status: "DRAFT" as const,
    job_id: 12,
    created_by: 10,
    approved_by: null,
  },
  {
    project_id: "P1",
    equipment_id: 2,
    month: "2026-07",
    required_qty: 6,
    status: "APPROVED" as const,
    job_id: 12,
    created_by: 10,
    approved_by: 22,
  },
];

const replacementPlans: NewPlanSnapshot[] = [
  {
    job_id: 12,
    project_id: "P1",
    equipment_id: 5,
    month: "2026-08",
    required_qty: 9,
    status: "DRAFT",
    created_by: 77,
  },
  {
    job_id: 12,
    project_id: "P1",
    equipment_id: 6,
    month: "2026-09",
    required_qty: 3,
    status: "DRAFT",
    created_by: 77,
  },
];

test("replacePlansWithRollback keeps the new rows when all inserts succeed", async () => {
  const operations: string[] = [];

  await replacePlansWithRollback({
    existingPlans: originalPlans,
    nextPlans: replacementPlans,
    clearPlans: async () => {
      operations.push("clear");
    },
    insertPlan: async (plan) => {
      operations.push(`insert:${plan.equipment_id}`);
    },
    restorePlan: async (plan) => {
      operations.push(`restore:${plan.equipment_id}`);
    },
  });

  assert.deepEqual(operations, ["clear", "insert:5", "insert:6"]);
});

test("replacePlansWithRollback restores the original snapshot after a failed insert", async () => {
  const operations: string[] = [];

  await assert.rejects(
    replacePlansWithRollback({
      existingPlans: originalPlans,
      nextPlans: replacementPlans,
      clearPlans: async () => {
        operations.push("clear");
      },
      insertPlan: async (plan) => {
        operations.push(`insert:${plan.equipment_id}`);
        if (plan.equipment_id === 6) {
          throw new Error("insert failed");
        }
      },
      restorePlan: async (plan) => {
        operations.push(`restore:${plan.equipment_id}`);
      },
    }),
    /insert failed/
  );

  assert.deepEqual(operations, [
    "clear",
    "insert:5",
    "insert:6",
    "clear",
    "restore:1",
    "restore:2",
  ]);
});
