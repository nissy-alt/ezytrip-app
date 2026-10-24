export const RATE = 4.3;
export function nightsBetween(a, b) {
  const n =
    (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000;
  return Number.isInteger(n) && n > 0 ? n : 0;
}
export function budgetAmount(price, unit, nights, guests, rooms) {
  return unit === "person"
    ? (price * rooms) / guests
    : unit === "trip"
      ? price * rooms * nights
      : price;
}
export function cents(value) {
  const str = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(str))
    throw Error("กรอกเงินไม่ติดลบ ทศนิยมไม่เกิน 2 ตำแหน่ง");
  const [whole, decimal = ""] = str.split(".");
  const n = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n > 100000000)
    throw Error("จำนวนเงินเกินขอบเขตทดลอง");
  return n;
}
export function splitMeal(amount, fee, discount, participants, payer) {
  const percent = Number(fee);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100)
    throw Error("ค่าบริการต้องอยู่ระหว่าง 0–100%");
  if (!participants.length) throw Error("เลือกคนร่วมจ่ายอย่างน้อย 1 คน");
  const sub = cents(amount),
    total = sub + Math.round((sub * percent) / 100) - cents(discount);
  if (total < 0) throw Error("ส่วนลดมากกว่ายอดรวม");
  const base = Math.floor(total / participants.length),
    rem = total % participants.length;
  return {
    total,
    payer,
    shares: participants.map((name, i) => ({
      name,
      amount: base + (i < rem ? 1 : 0),
    })),
  };
}
export function balances(expenses) {
  const b = {};
  for (const e of expenses) {
    b[e.payer] = (b[e.payer] || 0) + e.total;
    for (const s of e.shares) b[s.name] = (b[s.name] || 0) - s.amount;
  }
  const d = Object.entries(b)
      .filter(([, n]) => n < 0)
      .map(([name, n]) => ({ name, amount: -n })),
    c = Object.entries(b)
      .filter(([, n]) => n > 0)
      .map(([name, n]) => ({ name, amount: n }));
  const out = [];
  let i = 0,
    j = 0;
  while (i < d.length && j < c.length) {
    const amount = Math.min(d[i].amount, c[j].amount);
    out.push({ from: d[i].name, to: c[j].name, amount });
    d[i].amount -= amount;
    c[j].amount -= amount;
    if (!d[i].amount) i++;
    if (!c[j].amount) j++;
  }
  return out;
}
