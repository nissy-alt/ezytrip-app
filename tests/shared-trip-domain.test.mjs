import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_STORAGE_KEYS,
  buildOAuthRedirectUrl,
  clearDemoData,
  getSafeNextRoute,
  inviteStatusMessage,
} from "../src/sharedTripDomain.js";

test("demo reset requires confirmation and removes only ezytrip demo keys", () => {
  const values = new Map([
    ...DEMO_STORAGE_KEYS.map((key) => [key, "demo"]),
    ["sb-project-auth-token", "session"],
    ["another-app:data", "other"],
  ]);
  const storage = {
    removeItem(key) {
      values.delete(key);
    },
  };

  assert.equal(
    clearDemoData(storage, () => false),
    false,
  );
  assert.equal(values.size, DEMO_STORAGE_KEYS.length + 2);

  assert.equal(
    clearDemoData(storage, () => true),
    true,
  );
  assert.equal(values.get("sb-project-auth-token"), "session");
  assert.equal(values.get("another-app:data"), "other");
  assert.equal(values.size, 2);
});

test("reset without a confirmation callback leaves storage unchanged", () => {
  let removed = false;
  assert.equal(clearDemoData({ removeItem: () => (removed = true) }), false);
  assert.equal(removed, false);
});

test("OAuth redirect preserves only an internal allow-listed hash route", () => {
  const location = {
    origin: "https://ezytrip.example",
    pathname: "/prototype/",
  };
  const redirect = new URL(
    buildOAuthRedirectUrl(location, "/join?code=0123456789"),
  );

  assert.equal(redirect.origin, location.origin);
  assert.equal(redirect.pathname, location.pathname);
  assert.equal(redirect.searchParams.get("auth_callback"), "1");
  assert.equal(redirect.searchParams.get("next"), "/join?code=0123456789");
  assert.equal(redirect.hash, "#/join?code=0123456789");
  assert.equal(getSafeNextRoute("//attacker.example"), "/trips");
  assert.equal(getSafeNextRoute("/not-allowed"), "/trips");
});

test("invite result statuses have explicit user-facing messages", () => {
  for (const status of [
    "joined",
    "already_member",
    "invalid",
    "revoked",
    "expired",
    "exhausted",
    "rate_limited",
  ]) {
    assert.ok(inviteStatusMessage(status).length > 0);
  }
  assert.equal(inviteStatusMessage("unknown"), "ไม่สามารถใช้รหัสเชิญได้");
});
