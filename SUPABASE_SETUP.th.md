# ตั้งค่า Google Login และ Supabase

ระบบแชร์ทริปใช้ Supabase Auth, Postgres RLS และ Realtime โดยแยกจากข้อมูลเดโมใน browser สร้าง project `ezytrip` ในองค์กร Pumpkin (`drewoynooxrmzbkjeoqq`, region `ap-southeast-1`) แล้ว โดย Supabase แจ้งค่า project $0/เดือนตอนสร้าง และ apply migration แล้ว แอปในเครื่องมี project URL/publishable key ใน `.env` ที่ถูก ignore; Google OAuth ยังรอ client credentials จากเจ้าของบัญชี

การตั้งค่า project และ migration ทำกับ Supabase hosted ผ่าน connector; ในเครื่องยังไม่มี Supabase CLI/Docker จึงยังรัน pgTAP authorization tests ไม่ได้ ค่า $0 เป็นราคาที่เสนอสำหรับการสร้าง project ณ ตอนนั้น ไม่ใช่การรับประกันค่าใช้จ่ายในอนาคต ควรตรวจ quota/billing ใน Dashboard ก่อนใช้งานจริง

## ขอบเขตความปลอดภัย

- Frontend SDK ถูก pin ใน manifest ที่ `@supabase/supabase-js` เวอร์ชัน `2.118.0`; package metadata ที่ตรวจระบุ Node.js `>=22` จึงต้องยืนยัน Node/package-manager version และสร้าง lockfile ผ่าน pnpm ก่อน build
- โปรเจกต์นี้ถูกสร้างหลัง connector เสนอราคา $0/เดือน; ตรวจ quota/billing ใน Dashboard ต่อเนื่องเพราะสิทธิ์และข้อกำหนดอาจเปลี่ยนได้
- ตั้ง Google provider ใน Supabase Dashboard เท่านั้น เก็บ Google client secret ในช่อง provider ของ Dashboard ห้ามใส่ใน source, `VITE_*`, repository หรือแชต
- Frontend ใช้เฉพาะ Supabase project URL และ publishable key (`sb_publishable_...`) ที่ Supabase ระบุไว้ ห้ามใช้ `service_role` หรือ secret key
- เปิดใช้เฉพาะ Google provider ใน Dashboard หากไม่ต้องการ provider อื่น และจำกัด OAuth redirect URLs เท่าที่จำเป็น
- อย่าใช้ project production เพื่อทดสอบ migration; ไม่มีคำสั่งในคู่มือนี้ที่อนุญาต `db push` ไปยัง remote
- แผน Free อาจพัก project ที่ไม่มีการใช้งานและมีขีดจำกัดทรัพยากร ควรตรวจสถานะใน Dashboard ก่อนใช้งานกลุ่มจริง

## ทดสอบฐานข้อมูล local

ต้องติดตั้ง Supabase CLI และ Docker ในเครื่องก่อน (ยังไม่ได้ติดตั้งจากงานนี้) จาก `prototype-v1/`:

1. ตรวจ `supabase status` ให้ยืนยันว่า target คือ local เท่านั้น
2. เริ่ม local stack ด้วย `supabase start`.
3. ใช้ `supabase db reset` เฉพาะฐานข้อมูล local ที่แยกไว้ การ reset นี้จะสร้าง schema ใหม่และลบข้อมูลใน local database
4. รัน authorization tests ด้วย `supabase test db`.
5. กำหนด `VITE_SUPABASE_URL` เป็น `http://127.0.0.1:54321` และ `VITE_SUPABASE_PUBLISHABLE_KEY` เป็น local publishable/anon key ที่ CLI แสดง; อย่าคัดลอก service-role key
6. รัน `pnpm dev` และเปิด URL ที่ Vite แสดง

Google login บน local ต้องมี Google OAuth client ของผู้พัฒนาและเปิด provider ใน `supabase/config.toml` พร้อมใส่ credentials ใน local Supabase Auth configuration เท่านั้น ห้ามใส่ Google secret ใน Vite environment. จนกว่าจะตั้งค่านี้ การทดสอบ auth ใน local จะถูกบล็อก แต่ฐานข้อมูล/RLS tests ใช้ synthetic users ได้

## ตั้งค่า Google OAuth สำหรับ project นี้

1. ใน Google Cloud Console สร้าง OAuth client แบบ Web application ในบัญชีที่คุณควบคุม
2. ใช้ callback URL นี้เป็น Authorized redirect URI: `https://drewoynooxrmzbkjeoqq.supabase.co/auth/v1/callback`
3. ตั้ง Authorized JavaScript origin สำหรับ dev: `http://127.0.0.1:4173` (เพิ่ม `http://localhost:4173` เฉพาะหากใช้ origin นี้ด้วย)
4. ใน Supabase Dashboard → Authentication → Sign In / Providers → Google เปิด provider แล้วบันทึก Google client ID และ client secret ในช่อง provider เท่านั้น; ห้ามส่ง secret ในแชตหรือใส่ใน Vite `.env`
5. ใน Supabase Auth URL Configuration ตั้ง Site URL เป็น `http://127.0.0.1:4173` และเพิ่ม redirect allow-list `http://127.0.0.1:4173/**`; เพิ่ม `http://localhost:4173/**` หากใช้ localhost
6. `.env` ในเครื่องถูกสร้างไว้แล้ว มีเฉพาะ project URL และ `sb_publishable_...`; ห้ามเปลี่ยนเป็น service-role/secret key และห้าม commit `.env`
7. ทดสอบ sign-in/callback หลัง Google provider และ URL allow-list ถูกบันทึกแล้ว

แอปขอ scope `openid email profile` และใส่ hash route ที่ผ่าน allow-list ไว้ใน redirect URL เพื่อให้แอป mount route สำหรับแลก PKCE code ได้ ค่า redirect ต้องตรงกับ allow-list ของ Supabase Auth; หลังแลก code แอปจะล้าง query callback แล้วกลับไปยัง route ที่ขอไว้

## Migration และสิทธิ์

`supabase/migrations/20261024041405_shared_trip_planner.sql` สร้างทริปพร้อม owner membership และวันเดินทางใน transaction, บังคับ role `owner`/`editor`/`viewer`, เปิด RLS, จัดการ invite token แบบ hash, expiry, quota, revocation และ rate limit รวมถึง optimistic activity versions migration นี้ถูก apply กับ project `ezytrip` แล้ว; ตารางทั้ง 6 มี RLS และยังไม่มีข้อมูลทริป

SQL tests ใช้ synthetic identities ใน transaction และ rollback เมื่อจบ แต่ยังไม่มีผลรันเพราะ local Supabase CLI/Docker ไม่มีในเครื่อง Realtime ถูกเพิ่มใน publication เมื่อ hosted Supabase มี `supabase_realtime` publication
