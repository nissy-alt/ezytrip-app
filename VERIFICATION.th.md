# ezytrip Product Prototype V1 — ผลส่งมอบ

## Objective

ต่อยอด prototype ให้กลุ่มเพื่อนแชร์ Trip Planner ผ่าน Google Login, Supabase Auth/Postgres และ invite code โดยรักษาแผนที่สาธิตและ local demo แยกจากข้อมูลบัญชี ทำงานในเครื่องและใช้ฟรีก่อน

## Analysis

ตรวจคำสั่งและ source ปัจจุบัน พบ React 19/Vite 6/pnpm, localStorage demo และไม่มี Supabase project, OAuth credentials หรือ backend เดิม ไม่พบ Supabase CLI, Docker และ psql ในเครื่อง จึงทำเฉพาะ source/migration/test artifacts; ไม่เชื่อม remote project และไม่แก้ sources/ หรือ hosting/worker

UX Pilot ยังไม่ยืนยันเครดิตและมีข้อจำกัดสิทธิ์แผนฟรี จึงไม่ได้กดเริ่ม generation หรือใช้ UX Pilot เพิ่มในรอบนี้ การทำงานใช้แพ็กเกจโอเพนซอร์ส ภาพที่ระบุ free Unsplash License และฟอนต์ระบบ ไม่มีการซื้อเครดิต สมัครบริการ หรือ deploy ค่าใช้งาน Codex ยังคงเป็นไปตามบัญชีเดิม ไม่อ้างว่าการใช้โมเดลไม่มีโควตา

## Implementation

- React/Vite/pnpm ใน prototype-v1 โดยรักษา worker และ packaging scripts ของ starter
- หน้าหลักมือถือพร้อมทริปฮ่องกงและเครื่องมือ ค้นหาพร้อมวัน/ผู้เข้าพัก/ห้อง/งบสามหน่วย กรองย่าน/ราคาและเรียงรายการ ดูรายละเอียดและลิงก์เว็บจองต้นทาง บันทึกที่พักในทริป
- แปลง HKD/THB ด้วยเรทสาธิต หารค่าอาหารเฉพาะคนที่เลือกและรวม fee/discount บันทึก ledger สรุปยอดคืน และคืนบางส่วนได้สองสกุลเงินโดยไม่โอนเงินจริง
- เปลี่ยนวัน/เพิ่มจุดหมาย เก็บสถานะใน browser-local storage ตั้งรูปแบบสิทธิ์ตัวอย่าง และเปิด dialog ลิงก์เชิญสาธิต
- แยก domain/data/style ออกจาก UI และเก็บ product brief กับข้อจำกัดสำหรับรอบปรับ UX/UI
- แก้ปัญหางบเปลี่ยนความหมายเมื่อ swap โดยบันทึกสกุลเงินต้นฉบับของงบ
- เพิ่ม pinned `@supabase/supabase-js` 2.118.0 และ lockfile; ใช้ publishable key ฝั่ง Vite เท่านั้น, PKCE Google scopes `openid email profile`, hash-route callback, session restore และ logout
- เพิ่มหน้าบัญชี/ทริป/คำเชิญ/แผนทริปแบบแชร์ สร้างทริปพร้อมวันใน RPC transaction, owner/editor/viewer, invite token แบบสุ่มและเก็บ hash, expiry/quota/revoke/per-account rate-limit และ optimistic version update ฝั่ง RPC
- เพิ่ม migration RLS สำหรับ trips, members, days, activities, invites และ redemption limits พร้อม composite foreign key ป้องกันอ้าง day ข้ามทริป; เพิ่ม pgTAP authorization tests แต่ยังรันไม่ได้เพราะไม่มี local database tooling
- เพิ่ม reset demo แบบมี confirmation จำกัดคีย์ `ezytrip:*` และกลับค่าเริ่มต้น โดยไม่ลบ Supabase session หรือข้อมูล origin อื่น; demo ไม่ sync อัตโนมัติ
- เพิ่ม [SUPABASE_SETUP.th.md](./SUPABASE_SETUP.th.md) ขั้นตอนตั้งค่า project/provider โดยไม่ต้องส่ง secrets ในแชต

## Database Impact

ไม่มีการเชื่อมต่อหรือเปลี่ยน schema ของฐานข้อมูลภายนอก/production; มี migration และ synthetic SQL tests ใน repository เท่านั้น ไม่มีการ seed/apply ข้อมูลจริง ส่วน shared trip จะใช้ฐานข้อมูลได้เมื่อผู้ใช้ตั้ง project และผ่าน local migration tests ก่อน

## Verification

- Node.js 24.22.1 / pnpm 11.25.0; `pnpm install --lockfile-only --frozen-lockfile --ignore-scripts`: exit 0, lockfile ตรงกับ manifest
- `pnpm exec prettier --check` สำหรับ App, CSS, shared-trip modules และ unit test: exit 0
- `pnpm test`: exit 0; 14 tests ผ่าน, 0 failed
- `pnpm run build`: exit 0; Vite สร้าง bundle และ Sites staging สำเร็จ ไม่มีคำเตือนขนาด chunk; main 261.56 kB และ shared-trips 252.24 kB
- Browser local preview `http://127.0.0.1:5173`: 360/390px หน้า trip planner และ 1280px homepage ไม่มี horizontal overflow; ทดสอบเลือกวัน/หมุดและเปิด-ปิดฟอร์มกิจกรรมด้วย Escape; 390px account แสดงสถานะยังไม่ตั้งค่า Supabase; keyboard Tab เห็น focus outline
- ที่ 390px homepage ไม่โหลด shared-trips chunk จนกว่าจะเปิด route ทริป; shortcut ที่พักยังเป็น optional
- ทดลองเลือกวันและหมุด, เพิ่ม/แก้กิจกรรมใน local demo, reload แล้วยังเก็บค่าได้; คืน localStorage คีย์ `ezytrip:days`/`ezytrip:day` กลับค่าเดิมหลังทดสอบ
- ตรวจ production bundle ไม่พบ service-role credential, Google client secret หรือค่า Supabase secret key; พบเพียง SDK built-in prefix `sb_secret_` สำหรับตรวจชนิด key; `.env` และ `.env.production` ไม่มีอยู่
- SQL/pgtap migration tests: BLOCKED — `supabase`, `docker`, `psql` ไม่มีในเครื่อง จึงไม่ได้ apply migration หรือยืนยัน SQL runtime
- Unit test ตรวจ OAuth redirect มี hash route ที่อนุญาตสำหรับ hash-router callback; Google OAuth จริง, สองบัญชี, shared trip CRUD/Realtime และ concurrent database test: BLOCKED — ไม่มี project/credentials และยังไม่มี local Supabase stack; ไม่อ้างว่า helper test หรือ demo ยืนยัน live behavior

## Security & Risks

บัญชี Supabase และ allowance ของผู้ใช้ยังไม่ได้ตรวจหรือสร้าง project; ให้เลือก Free และยืนยันโควตาใน Dashboard เองก่อน setup. ไม่ใส่ service-role/secret/Google client secret ใน Vite หรือ source. Codex 5-hour remaining มองไม่เห็นจากเครื่องมือ จึงยืนยันเปอร์เซ็นต์คงเหลือไม่ได้. RLS, RPC และ tests ยังเป็น migration source ที่ไม่ผ่านการรัน local; ห้ามใช้กับข้อมูลจริงก่อนตรวจ target และทดสอบ local

เส้นทางเป็น interaction demo และลิงก์ออกไปตรวจจริง ไม่ได้คำนวณรถ/ค่าโดยสาร/การเรียงจุดหมาย อากาศยังไม่เชื่อม HKO/Open-Meteo และไม่แสดงพยากรณ์ที่แต่งขึ้น โรงแรมไม่มี live aggregation: Booking.com เปิดลิงก์ค้นหาที่ใส่วัน/จำนวนคน ส่วน Agoda เปิดหน้าแรก ไม่ได้ตรวจผลการค้นหาบนเว็บเหล่านั้นหรือจองจริง

prototype meal รองรับหารเท่ากันและผู้จ่ายก่อน1คนต่อรายการ ยังไม่มี per-item/multiple-payer workflow ฉบับเต็ม. Shared trip ยังไม่มี live OAuth/E2E, concurrent multi-session evidence, database backup/restore evidence, dependency security audit หรือ production readiness review

Preview bind เฉพาะ127.0.0.1 ไม่ใช่ public link ไม่ได้ push GitHub/deploy ข้อมูลที่มา/สิทธิ์ภาพอยู่ใน public/assets/sources.json ไม่เรียก remote fonts หรือ application API ระหว่างใช้ local app ปกติ

## Final Status

**PARTIALLY VERIFIED** — frontend build, unit tests, formatting และ local browser checks ผ่าน; lockfile สอดคล้อง. Database migration/RLS, Google OAuth และ multi-account collaboration ยังไม่ผ่านการทดสอบ local/live จึงไม่อ้างว่าแชร์ทริปใช้งานจริงหรือ production-ready

## Next Recommended Action

ติดตั้ง Docker และ Supabase CLI ในเครื่อง แล้วเริ่ม local Supabase ที่แยกจาก production เพื่อรัน migration และ `supabase test db`; จากนั้นตั้ง Google provider ด้วย credentials ใน Supabase Dashboard/local auth config และทดสอบสองบัญชี ก่อนใช้ project ใดจริง

## รอบวางแผนฐานข้อมูล/ความปลอดภัย/release — 24 ตุลาคม 2026

- เพิ่ม `DATABASE_SECURITY.th.md` สรุปตาราง, RLS/RPC controls ที่มีใน migration และงานทดสอบ/ช่องว่างก่อนข้อมูลจริง; เพิ่ม `RELEASE_READINESS.th.md` เตรียม release โดยยังไม่เลือก hosting แทนผู้ใช้
- แก้ README ให้บอกสถานะจริงว่า Google Login/shared trip มี implementation scaffold แล้ว แต่ไม่มี Supabase project/provider credentials ที่ผูกกับแอป
- ลบ import `CheckCircle2` ที่ไม่ถูกใช้ออกจาก `src/sharedTrips.jsx`; เก็บ worker, Sites packaging และ tests ที่จำเป็นไว้
- `pnpm exec prettier --check src/sharedTrips.jsx README.md DATABASE_SECURITY.th.md RELEASE_READINESS.th.md`: PASS, exit 0
- `pnpm test`: PASS, 14 tests, 0 failed
- `pnpm run build`: PASS, Vite build และ Sites packaging สำเร็จ; พบไฟล์ `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`
- ไม่ได้แก้/รัน migration กับฐานข้อมูลใด; ไม่ได้ตั้ง OAuth provider, hosting, secrets หรือ deploy
- Figma import/UI update: BLOCKED รอ node-specific link ของ frame ที่ผู้ใช้เลือก; connector ต้องการ file key และ node ID จริง และไม่มีลิงก์ดังกล่าวใน workspace/source
- Supabase migration/RLS negative tests, Google OAuth จริง, multi-account flow, dependency audit, backup/restore และ release smoke test: ยังไม่ได้รัน/ยืนยัน; ต้องทำใน local stack หรือ target ที่ผู้ใช้ยืนยันก่อน

สถานะงานรอบนี้ **PARTIALLY VERIFIED**: code formatting, existing tests และ build ผ่าน แต่ไม่มีหลักฐาน runtime ของฐานข้อมูล, OAuth, hosting หรือการปรับหน้าจอจาก Figma

## ปรับหน้าทริปตาม Figma มือถือ — 24 ตุลาคม 2026

- ใช้ Figma mobile frame `5:2` เป็น reference แล้วจัดหน้าทริปเป็น day selector → interactive map → itinerary card; ใช้ canvas neutral, teal, rust, lavender แบบ scoped เฉพาะ Trip Planner
- รักษา MapLibre/OpenFreeMap attribution, ตัวเลือกเดิน/รถ/บัส/MTR, สถานะเส้นทางประมาณ/จริง, เพิ่มจุดหมาย, แก้กิจกรรม และเปิดแผ่นจัดเส้นทาง
- เพิ่ม helper note ในการ์ด itinerary และบันทึกทิศทางนี้ใน `DESIGN.md` กับ `AGENTS.md`
- `pnpm test`: PASS, 14 tests; `pnpm run build`: PASS, Vite และ Sites staging สร้างไฟล์ครบ
- Browser preview `http://127.0.0.1:4173/#/trip`: เห็นโครงวัน → แผนที่ → itinerary และข้อมูล attribution ที่ 805px; browser viewport override สำหรับตรวจ 390px ไม่เปลี่ยนขนาด viewport ในสภาพแวดล้อมนี้ จึงยังไม่บันทึกว่าได้ตรวจภาพ 390px จริง
- ยังไม่มี Supabase/Google credentials และไม่ได้ตั้งค่า provider, apply migration, publish หรือ deploy; ไม่มีบริการเสียเงินที่ถูกเรียกใช้

สถานะรอบนี้ **PARTIALLY VERIFIED**: source, test, build และ preview desktop-width ผ่าน; การตรวจภาพ responsive 390px และระบบ OAuth/DB จริงยังรอ environment/บัญชีที่ตั้งค่าแล้ว

## ตั้งค่า Supabase project และ apply migration — 24 ตุลาคม 2026

- ตรวจ Supabase account พบองค์กร Pumpkin แห่งเดียวและไม่มี project เดิม; ขอราคาแล้วได้ $0/เดือน และสร้าง project `ezytrip` (`drewoynooxrmzbkjeoqq`) ใน `ap-southeast-1`
- Apply `supabase/migrations/20261024041405_shared_trip_planner.sql` ผ่าน Supabase connector; ปรับชื่อไฟล์ migration ให้ตรงกับ version ที่บันทึกใน hosted migration history เพื่อไม่ให้ CLI มองเป็น migration ที่ยังไม่รัน
- ตรวจ hosted metadata: migration history มี version นี้, 6 public tables ถูกสร้างและเปิด RLS, ทุกตารางยังว่าง, `anon` ไม่มี SELECT grants และเรียก SECURITY DEFINER functions ไม่ได้; `authenticated` เรียก RPC ที่ออกแบบไว้ได้
- บันทึกและใช้เฉพาะ project URL + publishable key ใน `.env` ที่ `.gitignore` กันไว้; ตรวจหน้า `#/trips` ใน local preview เห็นปุ่มเข้าสู่ระบบ Google แปลว่า client config ถูกโหลดแล้ว โดยยังไม่ได้เริ่ม OAuth
- ตรวจ security/performance advisors: พบ 8 authenticated SECURITY DEFINER functions, 1 table ที่ RLS ตั้งใจไม่มี policy, 3 foreign keys ที่ขาด covering indexes และ unused indexes จาก project ใหม่; ไม่มี security/performance lints อื่น
- ตรวจ SQL metadata ว่า `anon` ไม่มี SELECT และ tables ทั้งหมดเปิด RLS; migration runtime สำเร็จบน hosted database
- Google provider, URL allow-list, OAuth client ID/secret และ live sign-in ยังรอเจ้าของบัญชีทำใน Dashboard; ไม่ได้สร้าง Google Cloud client หรือส่ง secret
- ไม่มี Supabase CLI/Docker ในเครื่อง จึงยังไม่รัน pgTAP authorization tests; hosted project ยังไม่มีข้อมูลจริง
- `pnpm test`: PASS, 14 tests; `pnpm exec prettier --check` สำหรับ source: PASS; `pnpm run build`: PASS

สถานะ **PARTIALLY VERIFIED**: hosted schema ใช้งานแล้วบน project ราคาเสนอ $0/เดือนและ frontend เชื่อม project แล้ว; Google OAuth และ negative authorization tests ยังไม่ผ่านการทดสอบ จึงยังไม่พร้อมใช้ข้อมูลจริงหรือ deploy
