# แผนฐานข้อมูลและความปลอดภัยของ ezytrip

วันที่ทบทวน: 24 ตุลาคม 2026

## สถานะตอนนี้

- หน้าทริปสาธิตยังเก็บข้อมูลใน `localStorage` ภายใต้คีย์ `ezytrip:*`; ข้อมูลนี้ไม่ถูกส่งเข้า Supabase โดยอัตโนมัติ
- โค้ดแชร์ทริปใช้ Supabase Auth/Postgres ผ่าน `@supabase/supabase-js`; project `ezytrip` (`drewoynooxrmzbkjeoqq`) อยู่ใน region `ap-southeast-1` และใบเสนอราคาตอนสร้างเป็น $0/เดือน
- `.env` ในเครื่องมีเฉพาะ project URL กับ publishable key และถูก ignore; ไม่มี service-role/secret key ในไฟล์นี้ ส่วน `.env.production` ยังไม่มี
- migration `supabase/migrations/20261024041405_shared_trip_planner.sql` ถูก apply กับ project ใหม่แล้ว; ตรวจพบ 6 ตาราง, ทุกตารางเปิด RLS, ยังไม่มีข้อมูล และไม่มี SELECT grant ให้ `anon`
- Google provider ยังไม่เปิด เพราะยังไม่มี Google OAuth client ID/secret และยังไม่ได้ตั้ง redirect allow-list ใน Dashboard; ไม่ได้ใส่ secret ใน `.env`

## แบบจำลองข้อมูลที่วางไว้

| ตาราง                      | เนื้อหา                                                      | ขอบเขตสิทธิ์ที่ migration ตั้งไว้                               |
| -------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `trips`                    | เจ้าของ ชื่อ และวันเริ่ม/สิ้นสุด                             | สมาชิกอ่านได้; เจ้าของแก้ชื่อได้                                |
| `trip_members`             | สมาชิกและ role `owner` / `editor` / `viewer`                 | สมาชิกของทริปอ่านได้; การเข้าร่วมจัดการผ่าน RPC                 |
| `trip_days`                | วันและหัวข้อของแต่ละทริป                                     | สมาชิกอ่าน; editor/owner แก้หัวข้อได้                           |
| `activities`               | เวลา สถานที่ รายละเอียด และ version สำหรับตรวจการแก้พร้อมกัน | สมาชิกอ่าน; editor/owner เพิ่ม/ลบและแก้ผ่าน RPC ที่ตรวจ version |
| `invite_codes`             | hash ของรหัสเชิญ, role, วันหมดอายุ, จำนวนใช้ และการยกเลิก    | เจ้าของอ่าน metadata; สร้าง/ยกเลิก/ใช้รหัสผ่าน RPC              |
| `invite_redemption_limits` | จำนวนครั้งที่ลองใช้รหัสเชิญต่อบัญชีในช่วงเวลา                | เขียนผ่าน RPC เท่านั้น                                          |

เงิน/ค่าใช้จ่าย รูปภาพไฟล์ booking และข้อมูลส่วนตัวที่ไม่จำเป็นยังไม่อยู่ใน schema นี้ เก็บ local demo แยกไว้ก่อนจนกว่าจะกำหนดความต้องการ การเก็บรักษา และการเข้าถึงได้ชัดเจน

## Controls ที่เห็นใน source

- ตารางเปิด RLS พร้อม policy แยกสมาชิกและผู้แก้ไข; มี composite foreign key กัน activity ชี้ไปยังวันของอีกทริป
- RPC ที่มีสิทธิ์สูงใช้ `SECURITY DEFINER` พร้อม `search_path = ''`, ตรวจ `auth.uid()`/role, และจำกัด `EXECUTE` ไว้ที่ `authenticated`
- invite เก็บ SHA-256 hash ของ token แบบสุ่ม 32 ไบต์; จำกัดอายุไม่เกิน 30 วัน, จำนวนใช้ 1–20, ยกเลิกได้ และจำกัดการลองใช้ตาม user
- อัปเดต activity ใช้ row lock และ version เพื่อแจ้งเมื่อสมาชิกอีกคนแก้ก่อน
- ฝั่ง browser ใช้ PKCE และอ่านได้เฉพาะ Supabase URL กับ publishable key; ไม่มี service-role/Google client secret ที่ควรอยู่ใน Vite
- Security advisor เตือน `SECURITY DEFINER` ที่เรียกได้โดย authenticated 8 ฟังก์ชัน (5 RPC เป็น endpoints ที่ตั้งใจใช้และตรวจสิทธิ์ใน body; helper 3 ตัวควรพิจารณาย้ายออกจาก exposed schema), และแจ้ง `invite_redemption_limits` ไม่มี policy (ตั้งใจปิด direct access)
- Performance advisor แจ้ง foreign key 3 จุดยังไม่มี index ครอบคลุม; index ที่รายงานว่า unused เป็นผลจาก project ใหม่ที่ยังไม่มี workload จึงยังไม่ถอด

## ช่องว่างและลำดับทำงานก่อนข้อมูลจริง

1. ให้เจ้าของบัญชีสร้าง Google OAuth Web client และใส่ client ID/secret ใน Supabase Auth Dashboard เท่านั้น; ตั้ง Site URL/redirect allow-list สำหรับ `127.0.0.1:4173` และทดสอบ callback ก่อน
2. ลด exposure ของ helper `SECURITY DEFINER` ทั้งสามตัว และประเมิน/เพิ่ม index ให้ foreign keys ตาม advisor ก่อนมีข้อมูลจริง; คง role checks ของ RPC
3. ติดตั้ง/ใช้ Supabase CLI + Docker ในเครื่องเมื่อผู้ใช้พร้อม แล้วรัน `supabase test db` กับ synthetic users; ตรวจ anonymous, viewer writes, cross-trip access, invite expiry/revoke/quota และ optimistic version conflicts
4. ทดสอบ OAuth/login/logout/session refresh และ shared-trip CRUD ด้วยบัญชีทดสอบอย่างน้อยสองบัญชี; ยืนยันว่า local demo ยังแยกจากข้อมูลบัญชี
5. สร้าง backup/restore rehearsal และบันทึกการกู้คืนก่อนเก็บ itinerary จริง; ใช้ log แบบไม่ใส่ access token, invite code หรือข้อมูลส่วนบุคคล
6. เพิ่มการจัดการสมาชิกและการลบทริปพร้อมยืนยัน เมื่อ product flow ต้องการ พร้อมนโยบายลบ/เก็บบัญชีและข้อมูล

## สถานะ audit

ตรวจ live metadata หลัง apply migration แล้ว: ตาราง 6 แห่งเปิด RLS, row count เป็น 0, role grants ไม่มี SELECT ให้ anon และ migration history มี `20261024041405`. Security/performance advisories ถูกอ่านแล้วตามที่บันทึกไว้ด้านบน อย่างไรก็ดี CLI/Docker ไม่มีในเครื่อง จึงยังรัน pgTAP/negative authorization tests, OAuth, multi-account concurrency หรือ backup/restore rehearsal ไม่ได้; ยังไม่ถือว่า production-ready
