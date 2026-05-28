import test from "node:test";
import assert from "node:assert/strict";

import { authorizeUser, requireRoles } from "../middleware/tokenVerification.middleware.js";

const buildResponse = () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return response;
};

test("requireRoles allows configured roles", () => {
  const middleware = requireRoles("teacher");
  const response = buildResponse();
  let calledNext = false;

  middleware({ user: { role: "teacher" } }, response, () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
  assert.equal(response.statusCode, 200);
});

test("requireRoles rejects unconfigured roles", () => {
  const middleware = requireRoles("teacher");
  const response = buildResponse();

  middleware({ user: { role: "student" } }, response, () => {});

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.success, false);
});

test("authorizeUser allows same user and admin roles", () => {
  const sameUserResponse = buildResponse();
  let sameUserNext = false;
  authorizeUser(
    { user: { id: "u1", role: "student" }, params: { userId: "u1" } },
    sameUserResponse,
    () => {
      sameUserNext = true;
    }
  );

  const adminResponse = buildResponse();
  let adminNext = false;
  authorizeUser(
    { user: { id: "admin", role: "administrative" }, params: { userId: "u1" } },
    adminResponse,
    () => {
      adminNext = true;
    }
  );

  assert.equal(sameUserNext, true);
  assert.equal(adminNext, true);
});
