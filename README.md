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

## 🚀 วิธีติดตั้งและเปิดใช้งาน (Getting Started)

### 1. ความต้องการของระบบ (Prerequisites)
- ติดตั้ง [Node.js](https://nodejs.org/) (เวอร์ชัน 18 ขึ้นไป แนะนำ v20+)

### 2. โคลนและติดตั้ง Dependencies
```bash
git clone [https://github.com/Panutle/similarity-space.git](https://github.com/Panutle/similarity-space.git)
cd similarity-space
npm install
