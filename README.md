# 🌐 Object Vision (Vector Vision)

**Object Vision** คือระบบแสดงผลข้อมูลเวกเตอร์แบบ 3 มิติ (3D Vector Visualization Platform) ที่นำข้อมูลเวกเตอร์หลายมิติ เช่น ภาพถ่าย (Image), ขนาดทางกายภาพ (Dimension), พอยต์คลาวด์ (Point Cloud), ความหมายเชิงลึก (Semantic) และ Topload จาก Firestore มาทำการลดมิติด้วยอัลกอริทึม **PCA (Principal Component Analysis)** พร้อมจำลองเป็นโมเดลพอยต์คลาวด์ 3D Interactive แบบเรียลไทม์

---

## ✨ Features

- **Multi-Vector Dimensionality Reduction:** ลดมิติของเวกเตอร์ประเภทต่างๆ (Image, Physical, PointCloud, Semantic, Topload) เหลือ 3 มิติ (X, Y, Z) ด้วยเทคนิค PCA
- **Interactive 3D Visualization:** แสดงผลจุดและกลุ่มข้อมูลผ่านกราฟิก 3 มิติความละเอียดสูงโดยใช้ `Plotly.js`
- **Dynamic Weight Balancing:** แถบเลื่อนปรับน้ำหนักสัดส่วนเวกเตอร์แต่ละชนิด เพื่อจัดกลุ่มและหา Combined Vector แบบเรียลไทม์
- **Similarity Network:** วิเคราะห์และลากเส้นเครือข่ายความคล้ายคลึงระหว่างอ็อบเจกต์ (Similarity Percentage)
- **Object Inspection & 3D Preview:** คลิกที่อ็อบเจกต์เพื่อหมุนดู Point Cloud 3D เฉพาะตัว และดึงข้อมูลมิติ/คำอธิบายจาก Firebase Realtime Database (RTDB)
- **Modern UI & Theme:** ออกแบบด้วย Tailwind CSS v4 รองรับทั้ง Light และ Dark Mode พร้อมปุ่มควบคุมมุมมอง Fly Over

---

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Framer Motion
- **Visualization:** Plotly.js (`plotly.js-dist-min`)
- **Math & ML:** `ml-pca`, `umap-js`
- **Backend / Dev Server:** Express, Vite, `tsx`
- **Database & Auth:** Firebase Firestore, Firebase Realtime Database (RTDB), Firebase Authentication

---

## 🚀 Getting Started

### 1. การติดตั้ง (Prerequisites)

- ติดตั้ง [Node.js](https://nodejs.org/) (เวอร์ชัน 18 ขึ้นไป หรือแนะนำ v20+)

### 2. โคลนโปรเจกต์และติดตั้ง Dependencies

```bash
git clone https://github.com/Panutle/similarity_space
cd <ชื่อโฟลเดอร์>
npm install