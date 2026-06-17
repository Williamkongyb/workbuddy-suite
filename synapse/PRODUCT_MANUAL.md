# Synapse灵枢 v0.4.0 — 产品说明书

> AI全链路内容创作引擎 | 面向独立创作者  
> 最后更新: 2026-06-17 | 版本: v0.4.0 Production

---

## 一、产品概述

### 1.1 定位
Synapse（赛纳普斯·灵枢）是一款面向独立创作者的AI内容创作引擎。核心理念是"不做工具，组建AI团队"——用户输入一个主题，AI自动完成从爆款对标、文案生成、多平台适配、合规检测到内容排期的全流程。

### 1.2 核心差异化
- 🧠 **Brand Brain** — 品牌记忆层，对标 Jasper Brand Voice ($69/月)
- 👤 **去AI味引擎** — 独有的中文AI痕迹检测+改写方案
- 🛡️ **三层合规检测** — L1词库+L2 AI语义+L3平台规则
- 📱 **12平台格式化** — 小红书/知乎/公众号/抖音/B站等专属模板
- 🔄 **改写降重** — 对标秘塔写作猫（改写/润色/降重三模式）

### 1.3 技术架构
```
┌─────────────────────────────────────────────────┐
│               Frontend SPA (index.html)           │
│   侧边栏导航 · 6功能面板 · 右侧实时Inspector      │
├─────────────────────────────────────────────────┤
│           Express API (routes.js, 34端点)         │
├──────┬──────┬──────┬──────┬──────┬──────┬───────┤
│Brand │Re-   │Human-│Compl-│Hot   │Sche- │Cover  │
│Brain │writer│izer  │iance │Topics│duler │Gen    │
├──────┴──────┴──────┴──────┴──────┴──────┴───────┤
│              DeepSeek Chat API                    │
│         (deepseek-chat, 4096 max_tokens)          │
└─────────────────────────────────────────────────┘
```

---

## 二、功能模块清单

### 2.1 AI内容创作 ✍️
| 功能 | API端点 | 说明 |
|------|---------|------|
| 内容生成 | `POST /api/generate` | 基于主题+平台+品类生成爆款文案 |
| 生成+对标 | `POST /api/generate/benchmark` | 生成同时自动对标评分 |
| 品类推断 | 内置 | 12品类关键词自动识别 |
| 品牌注入 | 内置 | 自动注入Brand Brain语调 |

**支持的12个品类**: 美妆护肤/美食烹饪/穿搭时尚/家居生活/旅行攻略/宠物生活/健身运动/数码科技/效率工具/母婴育儿/职场成长/情感生活

### 2.2 改写优化 ✨
| 模式 | 说明 | 对标 |
|------|------|------|
| 改写 rewrite | 生成3种风格变体（网感/专业/走心） | 秘塔写作猫 |
| 润色 polish | 优化流畅度+网感，3档强度 | - |
| 降重 dedup | 同义替换+结构重组规避查重 | 论文降重工具 |

### 2.3 去AI味引擎 👤
| 功能 | API端点 | 说明 |
|------|---------|------|
| AI味检测 | `POST /api/detect-ai` | 18项AI指纹特征库 → 0-100评分 |
| 去AI味改写 | `POST /api/humanize` | 3档强度 · 口语化 · 模拟真人写作 |

**检测维度**: AI套话/互联网黑话/机械列举/单调句长/AI高频emoji  
**人写特征加分**: 口语词/网络热梗/真实分享信号

### 2.4 合规检测 🛡️
| 层级 | 技术 | 说明 |
|------|------|------|
| L1 词库匹配 | 本地500+词 | 广告法+品类+平台规则，0延迟 |
| L2 AI语义 | DeepSeek | 变体写法检测（"蕞好""第①"等） |
| L3 平台规则 | 引擎匹配 | 小红书禁引流/抖音禁站外/知乎禁硬广 |

**词库覆盖**: 绝对化用词/专利/医疗/化妆品/减肥/虚假承诺/竞品对比/金融/教育/敏感社会/诱导互动，共233+违规词

### 2.5 内容排期 📅
| 功能 | API端点 |
|------|---------|
| 保存草稿 | `POST /api/schedule/draft` |
| 查看草稿 | `GET /api/schedule/drafts` |
| 添加排期 | `POST /api/schedule` |
| 查看队列 | `GET /api/schedule/queue` |
| 标记发布 | `POST /api/schedule/:id/publish` |
| 取消排期 | `DELETE /api/schedule/:id` |
| 排期统计 | `GET /api/schedule/stats` |

### 2.6 爆款对标 📊
- 标题公式提取（8种模式）
- 正文结构分析（开头/正文/结尾）
- 关键词频率统计
- 0-100分原创评分
- 对标Top爆款 → 改进建议

### 2.7 实时热点 🔥
- 聚合源：微博热搜 · 知乎热榜 · 抖音热点榜
- 10分钟缓存机制
- 离线fallback（20条静态数据）
- 点击热词直接跳转创作

### 2.8 多平台格式化 📱
12个平台专属模板：小红书/微信公众号/知乎/抖音/B站/今日头条/百家号/微博/CSDN/掘金/搜狐号/飞书文档。每平台包含：字数限制/风格/内容形式/要求/禁忌/最佳发布时间。

### 2.9 Brand Brain 🧠
| 功能 | API端点 |
|------|---------|
| 品牌CRUD | `GET/POST/PUT /api/brand` |
| AI语调分析 | `POST /api/brand/analyze-tone` |
| 自动注入 | 生成时自动注入Prompt |
| 一致性检测 | 内置 checkConsistency |

### 2.10 封面生成 🎨
5种模板风格：科技感 · 种草风 · 知识干货 · 情感共鸣 · 极简风。支持品牌色+Logo自动注入。

### 2.11 竞品监控 🎯
CRUD操作管理竞品账号，基础监控。

---

## 三、API完整参考

### 3.1 健康检查
```
GET /api/health → { status, version, modules, data_stats }
```

### 3.2 M1 — 内容收集 (7端点)
```
GET  /api/collect/top?limit=20&platform=xiaohongshu
GET  /api/collect/search?keyword=美妆&limit=20
GET  /api/collect/by-platform/:platform
GET  /api/collect/by-category/:category
POST /api/collect/add  { title, platform, category, ... }
GET  /api/collect/stats
GET  /api/analyze?category=美妆&platform=xiaohongshu
POST /api/analyze/benchmark  { title, keywords, hashtags }
```

### 3.3 M2 — 内容生成+格式化 (6端点)
```
POST /api/generate  { topic, platform, count, keywords }
POST /api/generate/benchmark  { topic, platform, count }
POST /api/format  { title, body, hashtags, platform }
GET  /api/format/platforms
POST /api/format/multi  { title, body, hashtags, platforms }
GET  /api/format/tips/:platform
```

### 3.4 Brand Brain (4端点)
```
GET  /api/brand
POST /api/brand  { name, slogan, tone: { personality, voice_style, ... } }
PUT  /api/brand
POST /api/brand/analyze-tone  { samples: ["范文1", "范文2"] }
```

### 3.5 改写优化 (2端点)
```
POST /api/rewrite  { content, mode: "rewrite"|"polish"|"dedup", platform }
POST /api/humanize  { content, intensity: "light"|"medium"|"heavy", platform }
POST /api/detect-ai  { content }
```

### 3.6 合规检测 (1端点，升级)
```
POST /api/compliance/check  { content, platform?, enable_ai?: boolean }
→ { score, passed, risk_level, total_violations,
    local_check: { violations_count, details },
    ai_check: { violations, risk_level, overall_assessment },
    all_violations, suggestions }
```

### 3.7 内容排期 (7端点)
```
POST   /api/schedule/draft
GET    /api/schedule/drafts?status=draft
DELETE /api/schedule/draft/:id
POST   /api/schedule  { title, body, platform, scheduled_at }
GET    /api/schedule/queue?time_range=today|this_week|upcoming
DELETE /api/schedule/:id
POST   /api/schedule/:id/publish
GET    /api/schedule/stats
```

### 3.8 热点 (2端点)
```
GET /api/hot-topics?category=美妆&limit=20
GET /api/hot-topics/refresh
```

### 3.9 其他 (5端点)
```
GET    /api/competitors
POST   /api/competitors  { name, platform }
DELETE /api/competitors/:id
GET    /api/templates
POST   /api/cover/generate  { title, style, brand_colors?, subtitle? }
GET    /api/team
GET    /api/team/agent/:id
```

**总计: 34个API端点**

---

## 四、使用指南

### 4.1 快速上手
1. **配置品牌** → 点击左侧⚙️设置 → 填写品牌名称/标语/人格标签 → 上传3-5篇范文 → 点击"AI分析语调"
2. **开始创作** → 在✍️创作面板输入主题 → 选择平台 → 点击生成
3. **优化文案** → 点击生成结果下的"优化"按钮 → 选择改写/润色/降重/去AI味
4. **合规检测** → 点击"合规"或切换到🛡️合规面板 → 一键检测
5. **内容排期** → 切换到📅排期 → 设置发布时间 → 添加到队列

### 4.2 定价计划
| 方案 | 价格 | 包含 |
|------|------|------|
| Free | ¥0 | M1基础+M2三平台+M3五视频/月 |
| Creator | ¥39/月 | M1-M4全功能 |
| Pro | ¥99/月 | M1-M7+M11 |
| Business | ¥299/月 | 全11模块+M9飞轮 |

> 注：当前v0.4.0为Phase 1版本，Free计划功能全部可用。

---

## 五、竞品对标矩阵

| 维度 | Synapse v0.4 | 秘塔写作猫 | Jasper | 聚媒通 | 句易网 | 飞瓜数据 |
|------|-------------|-----------|--------|--------|--------|---------|
| AI写作 | ✅ DeepSeek | ✅ | ✅ GPT-4 | ❌ | ❌ | ❌ |
| 改写润色 | ✅ 3模式 | ✅ 核心功能 | ✅ | ❌ | ❌ | ❌ |
| 去AI味 | ✅ 独有 | ❌ | ❌ | ❌ | ❌ | ❌ |
| 合规检测 | ✅ 3层 | ❌ | ❌ | ❌ | ✅ 词库 | ❌ |
| 品牌记忆 | ✅ Brand Brain | ✅ 风格定制 | ✅ Brand Voice | ❌ | ❌ | ❌ |
| 12平台适配 | ✅ | 部分 | ❌ | ✅ 70+ | ❌ | ❌ |
| 多平台发布 | 排期(模拟) | ❌ | ❌ | ✅ API直发 | ❌ | ❌ |
| 热点榜单 | ✅ 3源聚合 | ❌ | ❌ | ❌ | ❌ | ✅ 实时 |
| 爆款对标 | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 价格 | 免费 | ¥99/月 | $49/月 | 付费 | 免费+付费 | ¥399+/月 |

---

## 六、项目文件结构

```
synapse/
├── public/index.html              # 前端SPA (侧边栏+6面板+Inspector)
├── server/
│   ├── index.js                   # Express入口 (端口3099)
│   ├── routes.js                  # API路由 (34端点)
│   ├── services/
│   │   ├── collector.js           # 文案收集
│   │   ├── analyzer.js            # 内容分析
│   │   ├── generator.js           # AI生成 (DeepSeek)
│   │   ├── formatter.js           # 12平台格式化
│   │   ├── brand-brain.js         # ★ 品牌记忆层
│   │   ├── rewriter.js            # ★ 改写引擎
│   │   ├── humanizer.js           # ★ 去AI味引擎
│   │   ├── compliance-service.js   # ★ 合规检测
│   │   ├── hot-topics-fetcher.js  # ★ 热点聚合
│   │   └── scheduler.js           # ★ 内容排期
│   ├── data/
│   │   ├── banned-words.json      # ★ 500+违规词库
│   │   ├── hot-topics.json        # 静态热点
│   │   ├── competitors.json       # 竞品数据
│   │   ├── brand-profile.json     # 品牌配置
│   │   └── schedule-queue.json    # 排期队列
│   └── generate-seeds.js          # 种子数据生成脚本
├── data/seed-posts.json           # 30条爆款种子
├── .env                           # 环境变量
└── synapse-product-plan.md        # 产品规划
```

> ★ = v0.4.0 新增文件/模块

---

## 七、环境变量

```env
PORT=3099
DEEPSEEK_API_KEY=sk-xxx
SF_API_KEY=sk-xxx
```

---

**版本历史**
- v0.1.0 — M1基础收集
- v0.2.0 — M2生成+格式化
- v0.3.0 — 违禁词+热点+竞品
- **v0.4.0** — Brand Brain · 改写 · 去AI味 · 三层合规 · 排期 · 实时热点 · 新UI

---

*Synapse灵枢 — 让每个创作者都拥有AI团队*
