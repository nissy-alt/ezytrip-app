# เตรียม release ezytrip

วันที่ทบทวน: 24 ตุลาคม 2026  
สถานะ: Supabase project `ezytrip` ถูกสร้างที่ราคาเสนอ $0/เดือนและ apply schema migration แล้ว; Google OAuth credentials กับ hosting target ยังไม่พร้อม เอกสารนี้ไม่ใช่การอนุมัติ deploy

## สิ่งที่พร้อมในเครื่อง

- Vite สร้าง frontend ที่ `dist/client/`; `scripts/prepare-sites-build.mjs` ยังจัดไฟล์ handoff สำหรับ Sites ที่ `dist/server/index.js` และ `dist/.openai/hosting.json`
- มี `pnpm-lock.yaml`, `.env.example`, Supabase auth/client integration, `.env` local ที่ถูก ignore, schema migration และคู่มือตั้ง Google Login
- `.gitignore` กัน `.env`, `.env.*`, `node_modules/` และ `dist/`; `.env.example` ถูกยกเว้นให้เก็บใน source ได้
- ตอนนี้ยังไม่มี workflow CI, Docker/infra config หรือ deployment target ใน repository; Sites artifacts ไม่ได้ยืนยันว่าจะ deploy ไปที่ใดหรือใช้งานได้จริง

## ขั้นก่อนปล่อยตามลำดับ

1. **เลือก target และยืนยันค่าใช้จ่าย** — ยืนยันผู้ให้บริการ, free quota/เงื่อนไข, region, domain, HTTPS, การเก็บ secrets และวงเงินเตือนก่อนตั้ง infrastructure; ยังไม่เลือก hosting แทนผู้ใช้
2. **ตรวจ Figma/mobile** — ปรับหน้า Trip Planner ตาม Figma frame `5:2` แล้ว; ยังต้องตรวจหน้าจอจริงที่ 390px หลัง responsive viewport/tooling พร้อม
3. **พิสูจน์ database/auth** — schema ถูก apply กับ project แยกและตรวจ RLS/grants แล้ว; ตั้ง Google callback กับ redirect allow-list, ทดสอบ pgTAP และสองบัญชีเมื่อ credentials/CLI พร้อม
4. **เก็บเฉพาะการ clean-up ที่มีหลักฐาน** — ตัดโค้ดที่ยืนยันได้ว่าไม่มีการใช้งาน; ไม่ลบ `worker/`, `.openai/hosting.json`, `scripts/prepare-sites-build.mjs` หรือ `tests/sites-worker.test.mjs` ซึ่งเป็นส่วน Sites handoff ที่ต้องเก็บไว้
5. **ตรวจ release artifact** — จากโฟลเดอร์นี้ รัน `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm test`, `pnpm run build`; ตรวจ `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, responsive layout และ callback URLs ของ environment ที่เลือก
6. **ทบทวน security/recovery** — ยืนยันว่า browser bundle มีแค่ publishable key; RLS/negative authorization tests ผ่าน local; มี backup/restore rehearsal, error monitoring, วิธีปิด release และผู้รับผิดชอบ
7. **ปล่อยเมื่อแยกขั้นอนุมัติแล้ว** — ตรวจ diff/artifact/target สุดท้าย, สำรองข้อมูลตามระดับบริการ, ใช้ migration ที่ผ่านการทดสอบ, smoke test auth/ทริปบนมือถือ และติดตาม error ก่อนขยายการใช้งาน

## รายการที่ยังขวางการปล่อย

- ต้องตรวจ responsive ที่ 390px บนอุปกรณ์หรือ viewport ที่เปลี่ยนขนาดได้
- ไม่มี target hosting หรือ domain ที่ผู้ใช้เลือก; ห้ามอนุมานว่า Sites bundle นี้คือ hosting ที่ได้รับอนุมัติ
- Supabase project และ migration พร้อม; ยังไม่มี Supabase CLI/Docker สำหรับ pgTAP/negative authorization tests และ advisor พบ helper/RPC security warnings กับ foreign-key index gaps ที่ต้องทบทวน
- ยังไม่มี Google OAuth client/provider credentials; login code จึงยังไม่สามารถยืนยันการเข้าสู่ระบบจริงได้
- ยังไม่มี backup/restore evidence, hosted CI result, live multi-account check หรือ production smoke test
- ข้อมูลทริป/โรงแรม/เส้นทางหลายส่วนยังเป็นตัวอย่าง; ต้องตรวจแหล่งข้อมูลและข้อกำหนดการใช้งานของผู้ให้บริการก่อนเปิดให้ใช้จริง

## Rollback ที่ต้องกำหนดกับ target จริง

กลับไปยัง build/revision ก่อนหน้าเมื่อ auth, route หรือ error rate แย่ลง; หยุดการส่ง traffic และปิด feature flag หากมี โดยไม่ย้อน migration แบบ destructive อัตโนมัติ ถ้า schema เปลี่ยนให้ใช้ migration แบบ backward-compatible และมีแผนแก้ไปข้างหน้าที่ผ่าน local test; กู้ฐานข้อมูลจาก backup เฉพาะหลังยืนยันจุดเวลาและผลกระทบกับข้อมูลใหม่

ยังไม่มี target/monitoring/backup provider ที่ยืนยัน จึงยังระบุคำสั่ง rollback หรือ health check เฉพาะบริการไม่ได้
