# 🌐 Object Vision (Vector Vision)

<p align="center">
  <img src="docs/demo.gif" alt="Object Vision 3D Demo" width="100%" />
</p>

<p align="center">
  <b>ระบบแสดงผลข้อมูลเวกเตอร์แบบ 3 มิติ (3D Vector Visualization Platform) ที่เชื่อมต่อกับ Firebase และคำนวณลดมิติข้อมูลด้วย PCA แบบเรียลไทม์</b>
</p>

---

## 📖 เกี่ยวกับโปรเจกต์

**Object Vision** คือเครื่องมือ Visualizer สำหรับข้อมูลเวกเตอร์หลายมิติ เช่น:
- ภาพถ่าย (**Image**)
- ขนาดทางกายภาพ (**Physical Dimension**)
- พอยต์คลาวด์ (**Point Cloud**)
- ข้อมูลเชิงความหมาย (**Semantic**)
- ข้อมูลจำเพาะ (**Topload**)

ระบบจะดึงเวกเตอร์เหล่านี้จาก **Google Cloud Firestore** มาลดมิติให้เหลือ 3 มิติ (X, Y, Z) ด้วยอัลกอริทึม **PCA (Principal Component Analysis)** เพื่อแสดงผลเป็นพอยต์คลาวด์ 3D Interactive ผ่าน `Plotly.js` ให้ผู้ใช้สำรวจและวิเคราะห์ความสัมพันธ์ได้อย่างชัดเจน

---

## ✨ Features เด่น

- **Multi-Vector Dimensionality Reduction:** ลดมิติเวกเตอร์แต่ละประเภทรวมถึง Combined Vector สู่พิกัด 3D
- **Interactive 3D Workspace:** หมุน ซูม แพนมุมมอง 3 มิติ พร้อมฟังก์ชัน **Fly Over** หมุนมุมกล้องอัตโนมัติ
- **Dynamic Weight Adjuster:** แถบสไลเดอร์ปรับค่าน้ำหนักเวกเตอร์แต่ละชนิด เพื่อคำนวณการกระจายตัวของกลุ่มข้อมูลแบบเรียลไทม์
- **Similarity Network:** แสดงเส้นเชื่อมโยงวิเคราะห์ค่าความคล้ายคลึงระหว่างอ็อบเจกต์ (Similarity Percentage)
- **Object Inspection & 3D Preview:** คลิกเลือกจุดเพื่อพรีวิวโมเดล Point Cloud เฉพาะตัว และดึงข้อมูลมิติ/คำอธิบายจาก **Firebase Realtime Database (RTDB)**
- **Theme Support:** สลับใช้งานได้ทั้ง **Light Mode** และ **Dark Mode**

---

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion
- **Visualization:** Plotly.js (`plotly.js-dist-min`)
- **Algorithms:** `ml-pca`, `umap-js`
- **Dev Server / Middleware:** Express, Vite, `tsx`
- **Database & Services:** Firebase Firestore, Firebase Realtime Database, Firebase Authentication

---

## 🚀 ติดตั้งและรัน

ใช้ Node.js **22.12 ขึ้นไป** หรือ **20.19 ขึ้นไปในสาย 20.x** ตามข้อกำหนดของ `@vitejs/plugin-react` ใน lockfile และมี Git กับ npm พร้อมใช้งาน

```bash
git clone https://github.com/Panutle/similarity-space.git
cd similarity-space
npm ci
```

### ตั้งค่า Firebase

1. เปลี่ยนค่าใน `firebase-applet-config.json` เป็น Firebase web-app configuration ของโปรเจกต์คุณ
2. แก้ Realtime Database URL ใน [`src/firebase.ts`](src/firebase.ts) ให้ชี้ฐานข้อมูลของคุณด้วย เพราะค่านี้แยกจากไฟล์ config
3. เปิด Anonymous Authentication สำหรับการเข้าใช้งานเริ่มต้น และ Google Authentication หากต้องการใช้ปุ่มเข้าสู่ระบบด้วย Google พร้อมเพิ่มโดเมนที่ใช้รันใน Authorized domains
4. เตรียม collection `vectorObject` ใน Firestore และกำหนดสิทธิ์อ่านให้สอดคล้องกับการใช้งาน ตรวจ [`firestore.rules`](firestore.rules) ก่อนนำไปใช้: กฎตัวอย่างอนุญาตให้อ่านเวกเตอร์แบบสาธารณะ และมีบัญชี admin เฉพาะสภาพแวดล้อมเดิม
5. หากต้องการรายละเอียดอ็อบเจกต์ ให้เพิ่มข้อมูลใน Realtime Database ที่ `dataObject/<document-id>` และกำหนดกฎอ่านของ RTDB แยกต่างหาก

ฟิลด์เวกเตอร์ที่ UI รองรับ ได้แก่ `vectorImage`, `vectorPhysical`, `vectorPointCloud`, `vectorSemantic` และ `vectorTopload` ใช้ array ของตัวเลขหรือ Firestore VectorValue ส่วน `pointCloud` ใช้พิกัดเรียงเป็น `[x, y, z, ...]` สำหรับ preview โมเดล 3 มิติ ควรมีอย่างน้อยสามอ็อบเจกต์ต่อชนิดเวกเตอร์เพื่อทดลอง PCA; ข้อมูลน้อยกว่านั้นจะใช้ fallback projection

ไฟล์ `.env.example` มีค่าจาก AI Studio เดิม แต่การแสดงเวกเตอร์ในโค้ดปัจจุบันไม่ได้เรียก Gemini API และการคัดลอกไฟล์นี้ไม่ได้ตั้งค่า Firebase

### เปิดแอป

```bash
npm run dev
```

เปิด [localhost:3000](http://localhost:3000) และตรวจสถานะ server ได้ที่ [API health](http://localhost:3000/api/health) เมื่อเชื่อม Firestore สำเร็จและมีข้อมูล จะเห็นจุดเวกเตอร์ใน workspace

| คำสั่ง | หน้าที่ |
| --- | --- |
| `npm run dev` | เปิด Express และ Vite development server บน port 3000 |
| `npm run lint` | ตรวจ TypeScript ด้วย `tsc --noEmit` |
| `npm run build` | สร้าง frontend ใน `dist/` |
| `npm run preview` | เปิด preview ของ frontend ที่ build แล้ว ตาม URL ที่ terminal แสดง |

## ขอบเขตและข้อจำกัด

- ต้องมีข้อมูลและสิทธิ์เข้า Firebase ของคุณเอง repository ไม่มีชุดข้อมูลเวกเตอร์ตัวอย่างสำหรับใช้งานแบบ offline
- PCA ทำแยกตามชนิดเวกเตอร์และปรับสเกลพิกัดเพื่อแสดงผล ระยะบนกราฟข้ามชนิดเวกเตอร์จึงไม่ใช่ค่าความคล้ายคลึงที่ผ่านการสอบเทียบ
- UMAP อยู่ใน dependencies แต่เส้นทางลดมิติที่ใช้งานในโค้ดนี้เป็น PCA พร้อม fallback projection
- ภาพ demo แสดงหน้าตาการใช้งาน ไม่ใช่ผล benchmark ด้านความแม่นยำหรือความเร็ว
