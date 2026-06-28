# 🎨 Frontend Design — Beige Minimalist Theme
  
## 🎨 Design Tokens — Beige Minimalist

| Token | Hex | Sử dụng |
|---|---|---|
| `--bg-base` | `#F5F0E8` | Nền trang chính |
| `--bg-surface` | `#FDFAF5` | Card, sidebar, panel |
| `--bg-hover` | `#EDE7DA` | Hover state |
| `--accent` | `#8B7355` | CTA, active nav, icon |
| `--accent-light` | `#C4AA8A` | Secondary accent, chart line |
| `--text-primary` | `#2C2416` | Tiêu đề, nội dung chính |
| `--text-secondary` | `#A89880` | Label, placeholder |
| `--border` | `#E8E0D0` | Divider, card border |
| `--success` | `#6B8F71` | Status done (muted green) |
| `--warning` | `#C49A3C` | Status analyzing (warm gold) |
| `--error` | `#A05252` | Status failed (muted red) |
| `--shadow` | `rgba(139,115,85,0.08)` | Card shadow |

---

## 🗂️ Màn hình & Chi tiết

### 0. 🏠 Landing Page (Trang chủ trước khi đăng nhập)
- **Mục tiêu:** Giới thiệu giải pháp phân tích dữ liệu Lumiere, thu hút người dùng đăng ký trải nghiệm.
- **Bố cục (Layout):**
  - **Navigation Bar (Header):**
    - Bên trái: Logo "Lumiere" (font Serif thanh lịch).
    - Giữa: Menu tối giản (Features, Security, Pricing).
    - Bên phải: Nút "Log in" (dạng outline) và nút "Get Started" (nền nâu đất `#8B7355`, chữ trắng).
  - **Hero Section:**
    - Tiêu đề lớn (Serif): *"Turn raw data into elegant insights."*
    - Tiêu đề phụ (Sans-serif): *"An editorial suite for CSV processing, automated statistical analysis, and minimalist dashboards."*
    - Cặp nút hành động (CTA): Nút "Start Analyzing Free" (nền nâu đất nổi bật) bên cạnh nút "Watch Demo" (outline).
  - **Hình ảnh minh họa (Hero Image):**
    - Mockup giao diện Dashboard Lumiere được thu nhỏ, có viền mỏng và đổ bóng nhẹ (`rgba(139,115,85,0.08)`).
  - **Features Grid (Dưới cùng):**
    - Chia làm 3 cột ngăn cách bằng các đường thẳng đứng `1px` màu `#E8E0D0`.
    - Cột 1: *Automated Pandas Processing* (Tự động tính toán số liệu thống kê bằng Pandas).
    - Cột 2: *Secure S3 Storage* (Lưu trữ và bảo mật dữ liệu an toàn trên AWS S3).
    - Cột 3: *Instant PDF Reports* (Xuất báo cáo PDF trực quan chỉ với một click).

### 1. 🔐 Login / Register
- Nền `#F5F0E8`, form card `#FDFAF5` centered
- Logo serif font + tagline nhỏ
- Input có border `#E8E0D0`, focus border `#8B7355`
- Button nền `#8B7355`, chữ trắng, bo tròn `8px`
- Hiệu ứng: subtle fade-in khi load

### 2. 🏠 Dashboard
- **Sidebar** (240px): nền `#FDFAF5`, border-right `#E8E0D0`
  - Logo trên cùng, nav items với icon + label
  - Active item: accent bar trái + text `#8B7355`
- **Topbar**: breadcrumb + search + notification + avatar
- **Stat Cards** (4 cards): icon + số lớn + label nhỏ
- **Chart area**: Chart.js với palette beige/taupe

### 3. 📤 Upload Page
- Drag & Drop Zone: nền `#FDFAF5`, dashed border `#C4AA8A`
- Khi drag-over: nền `#EDE7DA`, border solid `#8B7355`
- Progress bar màu `#8B7355`, steps indicator

### 4. 📋 File History
- Table đơn giản, header `#EDE7DA`
- Row hover `#F5F0E8`
- Status chip: pill-shaped, màu muted tương ứng

### 5. 📊 Analysis Detail
- 2 column layout: stats bên trái, charts bên phải
- Charts dùng palette: `['#8B7355','#C4AA8A','#6B8F71','#C49A3C','#A89880']`
- Heatmap: gradient từ `#FDFAF5` (thấp) → `#8B7355` (cao)
- Export button: outline style, icon PDF/CSV

---

## 🔠 Typography

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading | `Playfair Display` | 24–32px | 600 |
| Body | `Inter` | 14–16px | 400 |
| Label | `Inter` | 12px | 500 |
| Mono/Data | `JetBrains Mono` | 13px | 400 |

---

## ✨ Animation & Interaction

| Thành phần | Hiệu ứng |
|---|---|
| Page transition | Fade + slide-up 200ms |
| Card hover | `translateY(-2px)` + shadow tăng nhẹ |
| Button click | Scale `0.97`, 100ms |
| Chart render | Easing animation 600ms |
| Drag & Drop | Border animate + background shift |
| Toast | Slide-in từ bottom-right |
| Skeleton | Shimmer wave `#EDE7DA → #FDFAF5` |

---
