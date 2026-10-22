# 冲之阁 (CZG) - 数学课标诊断与自适应学习系统架构与实施全方案 (Option B)

> **命名溯源**：**冲之阁（CZG）**，命名致敬中国古代伟大数学家、天文学家**祖冲之**（曾将圆周率精确到小数点后第七位，领先世界近千年）。本系统秉承求真务实、格物致知的数学精神，专注于新课标知识图谱结构化、教材智能导航与先修回溯自适应诊断。

本文档制定了 `czg` 项目的完整重构与实施方案。采用**方案 B（Native WebCrypto + JWT 极简高可靠鉴权架构）**，前端使用 `v2` 技术栈（React 19 + TypeScript + Vite + Lucide-react），后端在 `czg/api` 使用轻量高效的 Hono + SQLite / Cloudflare D1。

---

## 1. 核心设计原则与架构全景

### 1.1 核心设计理念
1. **彻底解耦庞大冗杂的旧体系**：
   - 摒弃 `czg/temp/cn-math-taxonomy` 中 3.9 万行杂乱单文件、旧式 DOM 拼接以及与人教版不一致的代码；
   - 继承其核心资产：**DAG 先修回溯自适应诊断算法** 与 **初中数学精选题库**。
2. **教材目录为第一入口（TOC-First）**：
   - 当前以 **北师大版七年级上册（2024版，M7A-BS，[`czg/data/m7a.json`](file:///home/timathon/codes/smartedu/english-practices/czg/data/m7a.json)）** 为核心组织目录；
   - 7 个章节、21 个小节，每节清晰展示：
     - **核心概念（Key Concepts）**
     - **国家课程标准条目（Curriculum Standards，挂接 [`czg/data/cs-m-2022.json`](file:///home/timathon/codes/smartedu/english-practices/czg/data/cs-m-2022.json)）**
     - **前置先修知识点（Prerequisites DAG）**
     - **自适应诊断题与测试（Adaptive Diagnosis）**
3. **架构面向多册平滑扩展（Multi-Textbook Extensible）**：
   - 数据模型按教材代码解耦，后续直接放置 `m7b.json`、`m8a.json` 等配置即可自动挂载。
4. **高质量数学公式与几何图形渲染（Math Formulas & Geometry Diagrams）**：
   - **公式渲染**：采用业界轻量工业级标准 **KaTeX**，通过统一组件 `<MathText />` 自动识别并优雅渲染行内（`$...$`）与块级（`$$...$$`）数学公式（如分式 $\frac{y}{x}=5$、指数 $a^2-b^2$、根号 $\sqrt{x}$、不等式等）；
   - **几何图形渲染**：题库中的几何题内置原生 `<svg>` 矢量图形定义（如圆 circle、正方体/长方体 cube、三棱柱、展开图、三视图、角与线段等），通过统一安全组件 `<GeometryFigure />` 响应式展示，矢量无损缩放且自适应暗黑/浅色模式主题颜色。
5. **鉴权采用 Option B（Native WebCrypto + JWT）**：
   - 彻底避开 Better-Auth 在 Cloudflare 免费版 50ms CPU 上限导致的 503 与 CORS 崩溃风险；
   - 零黑盒第三方依赖，原生毫秒级（< 1ms）哈希与极简单表设计。

---

## 2. 系统架构与交互流

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│                           czg/web 前端 (React 19 + TS + Vite)                  │
├────────────────────────────────┬──────────────────────────────────────────────┤
│ 1. 顶部栏 (Navbar)             │ 教材切换 (M7A-BS -> M7B)、登录/注册状态与用户   │
│ 2. 左侧目录树 (TOC Sidebar)    │ 第1~7章及各节 (显示各小节掌握度/薄弱标记)      │
│ 3. 小节工作台 (Section Panel)  │ • 核心概念与关键思想卡片                      │
│                                │ • 课标条目 (cs-m-2022 内容要求/素养/条文)     │
│                                │ • 先修依赖图 (DAG 关键前置知识点)             │
│                                │ • “开始自适应诊断” 行动入口                   │
│ 4. 诊断运行器 (Diag Modal)     │ 自适应出题 (对->推断祖先掌握, 错->回溯先修根因)│
│ 5. 诊断结果报告 (Report View)  │ 定位薄弱根因 (Root Cause)、补习路径建议       │
└────────────────────────────────┴──────────────────────────────────────────────┘
                                  │ HTTP API (JWT Bearer Token / JSON)
                                  ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           czg/api 后端 (Hono + TypeScript)                    │
├───────────────────────────────────────────────────────────────────────────────┤
│ • Auth 模块: Native WebCrypto (PBKDF2/SHA-256) + Hono JWT (注册/登录/Token)  │
│ • Records 模块: POST /api/diagnose/submit (保存每次诊断答题明细与根因)         │
│ • Progress 模块: GET /api/progress (获取用户当前教材各节掌握度统计)            │
│ • 存储适配层: SQLite (本地轻量开发) / Cloudflare D1 (线上生产部署)             │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 数据存放与分工架构 (Data Storage & Distribution)

关于 `cs-m-2022.json`、`m7a.json` 等静态数据在系统中的归属与消费机制：

### 3.1 存放位置与职责划分

| 文件 | 物理存放位置 | 归属端 | 作用与分工 |
| :--- | :--- | :--- | :--- |
| **`cs-m-2022.json`** | `czg/data/cs-m-2022.json` | **数据源基准 (Source of Truth)** | **国家数学课程标准 2022 版官方条文源数据**（236条）。作为构建、审计与文本对齐的不可变原始文件。 |
| **`m7a.json`** | `czg/data/m7a.json` | **数据源基准 (Source of Truth)** | **北师大七上教科书原始目录与课标关联定义**。也是未来扩充新教材（如 `m7b.json`、`m8a.json`）时的标准录入模板。 |
| **`m7a-bundle.json`** | `czg/web/src/data/m7a-bundle.json` | **Frontend (`czg/web`)** | **前端直接导入消费的生产数据包**。<br>由编译脚本 `czg/scripts/bundle_m7a.py` 自动将教材目录、课标要求、先修知识拓扑网络以及带几何 SVG 图形的题库融合成高精单册数据包，在前端构建时静态打包，供客户端极速离线加载与自适应回溯。 |

### 3.2 为什么将静态数据放在 Frontend 而不是 API？
1. **0ms 极速自适应做题体验**：自适应诊断算法（`DiagEngine.ts`）在用户答题后需毫秒级推断祖先节点掌握或沿 DAG 先修边回溯。所有知识点关系和题目置于前端内存中，可以消除网络往返延迟，实现丝滑流畅的交互体验。
2. **前后端职责解耦（关注点分离）**：
   - **Frontend (`czg/web`)**：全权负责**教材目录树、课标条文呈现、知识图谱导航、题目交互与几何矢量 SVG 渲染**；
   - **Backend (`czg/api`)**：轻装上阵，专注于**动态用户数据管理**（用户登录注册、JWT 签发校验、诊断历史明细存储、各知识点实时掌握度计算与持久化）。
3. **大幅节约 Cloudflare 免费额度**：静态 JSON 随前端由 Cloudflare Pages CDN 边缘节点全球缓存分发，完全不占用 Cloudflare Workers 的 CPU 执行时长配额与 D1 数据库的高频读写额度。

### 3.3 用户数据离线优先与同步策略 (Offline-First & IndexedDB Sync)

用户的做题诊断记录与知识点掌握度采用了**离线优先 (Offline-First) + 双向同步**设计：

1. **本地存储介质 (IndexedDB)**：
   - 采用零外部依赖的原生封装 [`czg/web/src/lib/indexedDB.ts`](file:///home/timathon/codes/smartedu/english-practices/czg/web/src/lib/indexedDB.ts)（库名 `czg_client_db`）。
   - **`mastery` 对象仓库**：按 `[textbookId, topicId]` 复合主键缓存每个知识点的掌握状态（`mastered` / `shaky` / `weak`）。
   - **`diagnosis_records` 对象仓库**：持久化每次诊断答题历史、回溯先修根因和时间戳，并维护索引 `synced: boolean`。
2. **页面初次加载 (Page Load)**：
   - 立即读取 IndexedDB 本地缓存的 `mastery`，**0ms 瞬时在 TOC 目录和工作台高亮已掌握/薄弱状态**，完全无需等待网络响应。
   - 若用户已登录（存在有效 JWT Token），异步请求后端 `GET /api/progress`，获取云端最新记录合并更新到内存与 IndexedDB。
3. **用户做题提交 (On Diagnosis Finish)**：
   - 先行更新 React 内存状态并立即异步写入 IndexedDB。
   - 若用户未登录或处于断网状态，记录标记为 `synced: false` 稳妥保存在本地，不丢失任何做题历史与根因推断结果。
   - 若用户已登录且在线，同步向后端 `POST /api/diagnose/submit` 写入 Cloudflare D1，成功后打上 `synced: true` 标记。
4. **用户登录或重新连网 (On Login / Reconnect)**：
   - 在用户登录成功或 Token 恢复时，前端后台自动检测 IndexedDB 中所有 `synced: false` 的记录，批量自动上传至 Cloudflare D1。
   - 自动同步完成后批量更新本地记录状态为已同步，无缝将游客离线诊断数据并入正式用户云端档案。

---

## 4. 后端服务设计 (`czg/api`)

### 3.1 极简数据库 Schema (`czg/api/src/db/schema.ts`)
无需 Better-Auth 复杂的 4 张关联表，仅需 3 张清晰明了的业务表：

```typescript
// 1. 用户表
export interface UserTable {
  id: string;              // uuid
  username: string;        // 唯一用户名
  password_hash: string;   // hex string
  salt: string;            // hex salt
  display_name?: string;
  created_at: number;
}

// 2. 诊断答题记录表
export interface DiagnosisRecordTable {
  id: string;              // uuid
  user_id: string;         // 关联用户
  textbook_id: string;     // 例如 "M7A-BS"
  chapter: string;         // 例如 "第二章 有理数及其运算"
  section_number: string;  // 例如 "2.1"
  target_topic_id: string; // 诊断目标知识点 ID
  status: string;          // "mastered" | "shaky" | "weak"
  root_causes: string;     // JSON array of weak topic IDs
  history: string;         // JSON array of test questions & answers
  created_at: number;
}

// 3. 用户知识点掌握度汇总表
export interface UserTopicMasteryTable {
  user_id: string;
  topic_id: string;
  mastery_level: string;   // "mastered" | "shaky" | "weak"
  updated_at: number;
}
```

### 3.2 鉴权与安全机制 (`czg/api/src/auth.ts`)
- **密码哈希**：使用标准 WebCrypto API 的 `crypto.subtle.importKey` + `PBKDF2`（HMAC-SHA256，10,000 次迭代，耗时 < 1ms），安全且轻量。
- **JWT 签发与验证**：使用 Hono 自带的 `hono/jwt`，Token 有效期 30 天，无额外三方包。

### 3.3 核心 API 路由接口
- `POST /api/auth/register`：暂停开放注册（返回 403 提示联系管理员）
- `POST /api/auth/login`：用户登录并返回 JWT Token（携带 role 与 allowedTextbooks）
- `GET /api/auth/me`：获取当前登录用户信息
- `GET /api/progress?textbook=M7A-BS`：读取该教材下所有章节/小节的掌握度统计
- `POST /api/diagnose/submit`：提交单次诊断答题记录，并批量更新 `user_topic_mastery`
- `GET /api/diagnose/history?section=2.1`：按小节获取用户的历史诊断与薄弱根因分析
- `GET /api/admin/users`：管理员拉取全量用户档案与权限状态
- `POST /api/admin/users`：管理员开通新学员/管理员账号
- `PUT /api/admin/users/:id/access`：管理员修改用户教材授权、角色或激活状态
- `PUT /api/admin/users/:id/password`：管理员重置用户密码
- `DELETE /api/admin/users/:id`：管理员删除用户及其学习数据

### 3.4 管理员体系与用户管控 (Admin Account & Access Control)
- **内置初始管理员**：用户名 `admina`，密码 `adminb`，系统启动自动注入且防删除防降权。
- **权限边界**：仅 `role === 'admin'` 的用户可调用 `/api/admin/*` 接口以及在前端查看与操作管理台。
- **教材授权矩阵**：每个用户可被精确指定可访问教材列表（如 `["M7A-BS", "M7B-BS"]`）。

---

## 4. 前端应用设计 (`czg/web`)

### 4.1 技术栈基准
- **构建工具**：Vite 8+
- **视图框架**：React 19 + TypeScript
- **状态与路由**：React Router 7 + React Context
- **图标与样式**：Lucide-react + 精心定制的高质感 Vanilla CSS / CSS Modules（与 `v2` 统一设计美学，支持响应式布局、平滑抽屉导航与微动效）

### 4.2 目录与模块组织
```text
czg/web/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── assets/
│   ├── components/
│   │   ├── Navbar.tsx             // 顶部导航、教材切换下拉框、用户登录按钮
│   │   ├── AuthModal.tsx          // 登录/注册浮窗
│   │   ├── TOCSidebar.tsx         // 教材目录树侧边栏 (章、节、掌握度徽章)
│   │   ├── SectionWorkspace.tsx   // 小节工作台主界面
│   │   ├── ConceptCard.tsx        // 核心概念展示卡
│   │   ├── StandardCard.tsx       // 课标要求展示卡 (cs-m-2022 条文与素养)
│   │   ├── PrereqDAGCard.tsx      // 先修知识点依赖拓扑卡
│   │   ├── DiagnosisModal.tsx     // 自适应做题对话框
│   │   └── DiagnosisReport.tsx    // 诊断结果雷达/树形图与薄弱根因报告
│   ├── engine/
│   │   ├── DiagEngine.ts          // 移植自 engine.js 的强类型 DAG 诊断引擎
│   │   └── types.ts               // 拓扑图、题目、状态等 TypeScript 定义
│   ├── lib/
│   │   ├── api.ts                 // API 客户端封装 (包含 JWT 自动装配)
│   │   └── authContext.tsx        // 用户登录态全局 Context
│   └── data/
│       └── m7a-bundle.json        // 编译优化后的 M7A 教材+课标+先修+题库全量包
```

---

## 5. 数据转换与关联管道 (`czg/data/`)

编写统一提炼脚本 `czg/scripts/bundle_m7a.py`：
1. **教科书基准**：读取 [`czg/data/m7a.json`](file:///home/timathon/codes/smartedu/english-practices/czg/data/m7a.json)；
2. **课标深度关联**：读取 [`czg/data/cs-m-2022.json`](file:///home/timathon/codes/smartedu/english-practices/czg/data/cs-m-2022.json) 与 [`czg/data/cs-m-2022-mapping.json`](file:///home/timathon/codes/smartedu/english-practices/czg/data/cs-m-2022-mapping.json)，将 `m7a.json` 中的 21 个小节课标映射标准化，补全条文原文与核心素养；
3. **先修图与题库子集裁剪**：从 `cn-math-taxonomy` 3.9万行题库中，精确提取初中七年级与小学关键先修的题目与边，去除高中与英语数据，生成体积小、加载快的专用数据包 `m7a-bundle.json`（约 300KB）。

---

## 6. 实施路线图与阶段规划

| 阶段 (Stage) | 工作内容 | 验收标准 / 产出 |
| :--- | :--- | :--- |
| **阶段 1：数据准备** | 编写 `czg/scripts/bundle_m7a.py`，提炼并验证 M7A 全量数据包 | 生成 `czg/web/src/data/m7a-bundle.json`，21 小节无遗漏关联课标与题目 |
| **阶段 2：后端搭建 (`czg/api`)** | 初始化 Hono 服务，编写 WebCrypto 哈希、JWT 鉴权、诊断记录与统计接口 | `npm run dev` 启动，通过 curl 验证用户注册、登录、提交诊断与查询接口 |
| **阶段 3：前端工程初始化 (`czg/web`)** | 初始化 Vite + React 19 + TypeScript 工程，配置路由、样式系统与全局状态 | 浏览器打开 `http://localhost:5173` 正常渲染骨架页面 |
| **阶段 4：诊断引擎移植** | 在 `czg/web/src/engine/` 中实现强类型 `DiagEngine.ts` | 单元测试验证：答对判定掌握并推断祖先；答错自动同级重测与先修回溯 |
| **阶段 5：目录与小节工作台** | 开发目录侧边栏、核心概念卡片、课标规范卡片、先修依赖图展示 | 能够流畅点击任意小节，直观浏览北师大版 M7A 各节概念与课标要求 |
| **阶段 6：做题与云端同步** | 实现沉浸式自适应诊断交互弹窗、答题判定、根因报告，并调用 API 同步云端 | 登录用户完成测验后，小节状态即时点亮，并在个人中心记录历史详情 |
| **阶段 7：多教材扩展与优化** | 编写 `M7B` 接入模板规范，清理临时文件，确保代码零冗余 | 代码遵循《Karpathy 原则》，无孤立死代码，整体运行流畅无报错 |
