import { test } from "node:test";
import assert from "node:assert/strict";
import { availableActions, nextStatus } from "../src/lib/order-flow";

test("vendor happy path", () => {
  assert.equal(nextStatus("requested", "accept", "vendor"), "accepted");
  assert.equal(nextStatus("accepted", "start", "vendor"), "in_progress");
  assert.equal(nextStatus("in_progress", "deliver", "vendor"), "delivered");
});

test("role and state guards", () => {
  assert.throws(() => nextStatus("requested", "accept", "director"));
  assert.throws(() => nextStatus("delivered", "cancel", "director"));
  assert.throws(() => nextStatus("requested", "deliver", "vendor"));
  assert.equal(nextStatus("accepted", "cancel", "director"), "cancelled");
});

test("available actions", () => {
  assert.deepEqual(availableActions("requested", "vendor"), ["accept", "decline"]);
  assert.deepEqual(availableActions("requested", "director"), ["cancel"]);
  assert.deepEqual(availableActions("delivered", "vendor"), []);
});
