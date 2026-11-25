**##Dokumentasi progres design UI Neura project 1.0**

Tools uatama yang kita gunakan yaitu "Figma" dan referensi dari Pinterest
Link figma : https://www.figma.com/design/hgMKKWFZtA23DVnlNlMZLd/O2-PassTrough?node-id=0-1&p=f&m=draw

--------------------------------------------------------------------------------------------------------------------------------------------------------------

**Naura Project Style**

This is a design system extracted from a webpage I find inspiring. I want to build my own site/app UI inspired by this design pattern. Do not copy or replicate brand assets, logos, or identity — use these tokens as a foundation to create something original for me. Match the design language, not the brand:

Vibe: balanced · rounded
Rhythm: 4px grid · very rounded · generous line-height (1.7) · layered elevation

Key colors: Accent: #D97757 · Background: #FAF9F5 · Text: #1F1E1D

Full palette: #D97757 primary, #AE5F46 accent, #FAF9F5 surface, #FAF9F5 elevated, #1F1E1D text, #63615A muted

Typography:
• H1 — Newsreader 62px 400, 1.12 line-height, -1.24px tracking
• H2 — Newsreader 58px 500, 1.14 line-height, -1.74px tracking
• H3 — Newsreader 19.5px 500, 1.35 line-height, -0.2925px tracking
• Body — Inter 16px 400, 1.5 line-height
• Code — JetBrains 13.5px 400
• Type scale — 62px / 42px / 16px

Tokens:
• Radius — pill buttons, 40px cards
• Radius vocabulary — button:50px, card:12px, chip:pill
• Radius tokens — radius-sm: 8px, radius-md: 16px, radius-lg: 24px, radius-xl: 32px, radius-pill: 9999px
• Spacing scale — 4,8,12,16,20,24,28,32,36,48
• Border color — #9C998F

Named color tokens (from CSS custom properties):
• --color-bg: #FAF9F5
• --color-surface: #FFFFFF
• --color-surface-translucent: rgba(250, 249, 245, 0.88)
• --color-sidebar: #F0EEE6
• --color-sidebar-hover: #E6E3D8
• --color-user-bubble: #F0ECE1
• --color-hover: rgba(0, 0, 0, 0.04)
• --color-card: #FFFFFF
• --color-card-hover: #FAF8F5
• --color-text: #1F1E1D
• --color-text-muted: #63615A
• --color-text-subtle: #9B9890
• --color-border: #EAE6DC
• --color-border-subtle: rgba(217, 212, 200, 0.55)
• --color-border-strong: #DCD6C8
• --color-border-focus: #B8B09F
• --accent-primary: #D97757
• --accent-primary-hover: #C66545
• --accent-primary-light: #FBF2EE
• --accent-green: #2E7D32
• --accent-green-bg: #E8F5E9
• --accent-red: #C62828
• --accent-red-bg: #FFEBEE
• --accent-amber: #B45309

Elevation (shadow scale, low → high):
• subtle — rgba(0, 0, 0, 0.06) 0px 4px 20px 0px
• medium — rgba(0, 0, 0, 0.03) 0px 20px 60px 0px
• strong — rgba(0, 0, 0, 0.04) 0px 20px 50px 0px
• shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04)
• shadow-md: 0 4px 16px rgba(0, 0, 0, 0.05)
• shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.07)
• shadow-floating: 0 20px 48px -8px rgba(0, 0, 0, 0.09)

Motion tokens:
• transition-fast: 0.18s cubic-bezier(0.16, 1, 0.3, 1)
• transition-smooth: 0.35s cubic-bezier(0.16, 1, 0.3, 1)

Components:
• Button — #D97757 bg, #FFFFFF text, 9999px radius, 11px 24px padding, 500 weight
• Card — #EBEAE5 bg, 0.8px solid rgba(0, 0, 0, 0.08), 40px radius, 44px 48px padding, shadow rgba(0, 0, 0, 0.04) 0px 20px 50px 0px
• Input — default input
• Link — #63615A

Gradients (use as brand moments — hero text, CTAs, accents):
• #FFFFFF → #D97757

Responsive breakpoints: 360px, 380px, 500px, 640px, 768px, 900px, 960px, 1024px

Layout grid: max-width 1320px, 8px gutter
Spacing scale: 4px / 8px / 12px / 16px / 20px / 24px / 28px / 32px / 36px / 48px
Focus ring: shadow: rgba(217, 119, 87, 0.16) 0px 6px 26px

Interaction states:
• hover — translateY(-1px), shadow rgba(217, 119, 87, 0.38) 0px 4px 14px
• active — translateY(0px)
• focus — shadow rgba(217, 119, 87, 0.16) 0px 6px 26px

Z-index layers: element: 600 → modal: 1200 → nav: 2000

Responsive component changes:
• at 960px — .nav-center-menu → display: none
• at 960px — .nav-status-pill → display: none
• at 960px — .nav-mobile-toggle → display: flex
• at 900px — .sil-input-wrap → width: calc(100% - 32px)
• at 768px — .nav-links → display: none

Page structure: hero → section → contact → section
(Reproduce this section order when building a full-page layout.)

Attach the screenshot from this page as a visual reference — match its hierarchy, density, and overall feel, not just the raw values. Where this brief leaves something underspecified (hover states, focus rings, dark-mode variants), infer sensible defaults consistent with the vibe and palette above.

This is for my personal project — I'm drawing inspiration from this design pattern to build my own UI. Create something original that follows these design principles without copying the source brand.


--------------------------------------------------------------------------------------------------------------------------------------------------------------

**Markdown Desain landing Page**
**Title:** Neura • AI Deteksi & Diagnosis Dini Alzheimer

---

# Page Structure Map
```text
Neura • AI Deteksi & Diagnosis Dini Alzheimer
├── Mendeteksi AlzheimerLebih Awal,Lebih Tepat.
├── Neura Cognitive AI
│   ├── Validasi Akurasi 94.4% Model XGBoost pada Deteksi Dini Alzheimer
│   ├── Peran 32 Biomarker Kritis dalam Deteksi Risiko Demensia
│   ├── Mendeteksi Mild Cognitive Impairment Sebelum Gejala Klinis Akut
│   ├── AI Sebagai Rekan Analisis Bagi Dokter Spesialis Saraf
│   └── Uji Validasi Multimodal pada 430 Rekam Medis Pasien
├── Riset & Publikasi Klinis Neura
└── Mulai Deteksi Dinidengan Neura AI
```

---

## Mendeteksi AlzheimerLebih Awal,Lebih Tepat.

Platform kecerdasan buatan klinis untuk evaluasi dini risiko Alzheimer berbasis 32 biomarker multimodal, dengan akurasi 94.4% yang telah divalidasi pada 430 rekam medis.

Mulai Diagnosis Klinis Buka Workspace Pasien →

94.4% AKURASI • ROC-AUC 0.933 • 32 BIOMARKER KLINIS • <1.2s INFERENSI

 TENTANG PLATFORM

## Neura Cognitive AI

Neura adalah sistem kecerdasan buatan klinis mutakhir yang dirancang untuk mendeteksi indikasi awal **Alzheimer, Mild Cognitive Impairment (MCI)**, dan gangguan neurodegeneratif lain sejak stadium paling awal.

Didukung oleh arsitektur machine learning **XGBoost** berkecepatan tinggi yang telah dilatih menggunakan parameter biomarker klinis komprehensif, Neura mampu memetakan gejala memori, fungsi eksekutif, dan faktor risiko neurologis secara presisi dengan akurasi mencapai **95.8%**.

Tidak seperti pemeriksaan konvensional yang mahal dan lambat, Neura memberikan analisis terstruktur dalam kurang dari 1.2 detik, langsung dari browser Anda.

XGBoost Engine Biomarker Analysis MMSE Integration Cognitive Mapping Clinical Grade

✦ Model Klinis

### Validasi Akurasi 94.4% Model XGBoost pada Deteksi Dini Alzheimer

Okt 2026 Model AI

Baca riset

32 Profil Biomarker Klinis

Evaluasi korelasi skor MMSE, ADL, dan riwayat memori pasien

Eksplorasi

### Peran 32 Biomarker Kritis dalam Deteksi Risiko Demensia

Sep 2026 Biomarker

Baca riset

< >

✦ Deteksi MCI

### Mendeteksi Mild Cognitive Impairment Sebelum Gejala Klinis Akut

Sep 2026 Diagnostik

Baca riset

### AI Sebagai Rekan Analisis Bagi Dokter Spesialis Saraf

Agu 2026 Kedokteran Riset

Baca riset

✦ Kohort Data

### Uji Validasi Multimodal pada 430 Rekam Medis Pasien

Agu 2026 Validasi Data

Baca riset

NEURA CLINICAL DISPATCH • 2026

## Riset & Publikasi Klinis Neura

Dapatkan pembaruan berkala evaluasi 32 biomarker, rilis arsitektur Alzheimer, serta telaah kasus kognitif langsung ke inbox Anda.

## Mulai Deteksi Dinidengan Neura AI

XGBoost • 32 Biomarkers

Ready

XGBoost • 32 Biomarkers

Ready

--------------------------------------------------------------------------------------------------------------------------------------------------------------

**Frontend Progress Report**

**Task 1 : Pembuatan landing page O2PassTrough + Login registration --- 09/10/2026 - 18/10/2026**

**Task 2 Dashboard AI Chat UI O2PassTrough --- 19/10/2026 - 21/10/2026**

**Task 3 Perombakan konsep project O2passtrough menjadi Neura --- 21/10/2026**

**Task 4 Perombakan desain UI Neura Landing page + Dashboard AI Chat UI --- 22/10/2026 - 25/10/2026**

**Task 5 Menentukan desain logo final Project Neura --- 30/10/2026**

**Task 6 Mengubah desain website menjadikan revisi format desain figma --- 31/10/2026**

**Task 7 Menambhakan Motion Graphic pada Landing Page untuk pengenalan aplikasi Neura --- 05/11/2026**


