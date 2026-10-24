export const DEMO_STORAGE_KEYS = Object.freeze([
  "ezytrip:currency",
  "ezytrip:query",
  "ezytrip:saved",
  "ezytrip:expenses",
  "ezytrip:days",
  "ezytrip:day",
  "ezytrip:permission",
]);

export function clearDemoData(storage, confirmReset) {
  if (typeof confirmReset !== "function" || !confirmReset()) return false;
  DEMO_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
  return true;
}

export function getHashRoute(hash) {
  const route = (hash || "").replace(/^#/, "");
  return route.startsWith("/") ? route : "/";
}

export function getSafeNextRoute(route) {
  if (
    typeof route !== "string" ||
    !route.startsWith("/") ||
    route.startsWith("//") ||
    route.includes("\\")
  ) {
    return "/trips";
  }

  if (
    route === "/trips" ||
    route === "/account" ||
    route === "/join" ||
    /^\/trip\/[0-9a-f-]{36}$/i.test(route)
  ) {
    return route;
  }

  if (route.startsWith("/join?")) return route;
  return "/trips";
}

export function buildOAuthRedirectUrl(location, route) {
  const redirect = new URL(location.pathname || "/", location.origin);
  redirect.searchParams.set("auth_callback", "1");
  const next = getSafeNextRoute(route);
  redirect.searchParams.set("next", next);
  redirect.hash = `#${next}`;
  return redirect.toString();
}

export function inviteStatusMessage(status) {
  const messages = {
    joined: "เข้าร่วมทริปแล้ว",
    already_member: "คุณเป็นสมาชิกทริปนี้อยู่แล้ว",
    invalid: "รหัสเชิญไม่ถูกต้อง",
    revoked: "รหัสเชิญนี้ถูกยกเลิกแล้ว",
    expired: "รหัสเชิญหมดอายุแล้ว",
    exhausted: "รหัสเชิญถูกใช้ครบจำนวนแล้ว",
    rate_limited: "ลองรอสักครู่ก่อนใช้รหัสเชิญอีกครั้ง",
  };
  return messages[status] || "ไม่สามารถใช้รหัสเชิญได้";
}
