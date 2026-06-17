# AI Team Workflow — 最高优先级规则

> 版本: v2.0 | 生效日期: 2026-06-17 | 状态: ACTIVE
> 
> ⛔ **禁止修改条款**: 本文件的任何修改必须经 Confu 明确书面确认。未经 Confu 同意，任何 Agent（包括 Lead）不得修改本文件。
> 
> 📋 **调整流程**: 如需调整 → 先在测试环境验证 → 反馈3个方案 → Confu确认 → 修改规则

---

## §0 组合拳总览（速查卡）

```
Confu 下发指令
     │
     ▼
┌─────────────────────────────────────────────┐
│         §2 自动方案判定（Lead 第一动作）       │
│                                              │
│  新项目/竞品调研/行业调研? ──→ 方案D (调研)   │
│  改动 < 500行 / 单文件?   ──→ 方案A (快速)   │
│  改动 500-3000行?          ──→ 方案B (主力)   │
│  改动 > 3000行 / 架构变更? ──→ 方案C (全栈)   │
│                                              │
│  方案D输出报告后自动转方案B                    │
│  方案B/C在Plan后自动进入Code→Review→Test      │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│          方案B DevOps 流水线 (§3)             │
│                                              │
│  Plan ─→ Code ─→ Review ─→ Test ─→ Deploy   │
│   ↑        ↑        ↑         ↑        ↑    │
│  PM/     BE/FE/   QA/      QA/     DevOps/  │
│  Explore Content trae_     trae_   github   │
│                  review    write_           │
│                            tests            │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│          §4 MCP 使用率看板（每次任务后）       │
│                                              │
│  工具调用数 · 审查通过率 · 门禁状态           │
│  目标: MCP使用率 ≥85%                        │
└─────────────────────────────────────────────┘
```

---

## §0 MCP/AI 工具全矩阵

### 工具清单与当前状态

| 工具 | 接入方式 | 当前状态 | 核心能力 | 调用命令/方式 |
|------|---------|---------|---------|-------------|
| **trae-v25** | MCP 直连 DeepSeek | ✅ 可用 | 代码生成/分析/审查/修Bug/重构/测试/竞品 | MCP 工具 `mcp__trae-v24__trae_*` |
| **claude-code** | CLI → :8080 代理 → DS | ✅ 可用 | 多文件编辑、Agent工作流、深度重构 | `claude -p "prompt" --model deepseek-chat` |
| **codex-mcp** | CLI → :3999 代理 → DS | ✅ 可用 | AI 编程对话 | MCP 工具 `mcp__codex-mcp__codex` |
| **codex-direct** | CLI 直连 DS | ✅ 可用 | 轻量代码生成 | `node ~/.workbuddy/skills/codex-direct/codex-direct.mjs` |
| **deepseek-tui** | MCP (CodeWhale) | ⚠️ 待装二进制 | Shell执行/文件操作/16路子Agent | `codewhale mcp-server` |
| **hermes-mcp** | MCP | ✅ 可用 | 跨平台消息/通知/审批流 | MCP 工具 `mcp__hermes-mcp__*` |
| **filesystem** | MCP | ✅ 可用 | 文件CRUD/搜索 | MCP 工具 `mcp__filesystem__*` |
| **ardot** | MCP | ✅ 可用 | 设计/UI/截图/布局 | MCP 工具 `mcp__ardot__*` |
| **github** | MCP | ✅ 可用 | Git操作/PR/Issue | MCP 工具 `mcp__github__*` |

### claude-code 配置

```
代理地址: localhost:8080
代理脚本: ~/.workbuddy/packages/trae-mcp/anthropic-deepseek-proxy.cjs
健康检查: curl -s http://localhost:8080/health
配置路径: ~/.claude/settings.json
调用模板: claude -p "具体的编码任务描述" --model deepseek-chat
```

### hermes-mcp 配置

```
角色: 质量门禁通知 + 审批流转
触发条件: trae_review < 7/10 → 通知Lead | 代码生成完成 → 通知审核 | 任务状态变更 → events_poll
```

### 工具 → DevOps 阶段映射

| 阶段 | 主要工具 | 辅助工具 |
|------|---------|---------|
| **Plan** | trae_analyze_code, filesystem, trae_analyze_competitor | web_search |
| **Code** | trae_generate_code, claude-code, codex-direct | ardot(UI), filesystem(文件) |
| **Review** | trae_review_code, trae_analyze_code | filesystem(读取) |
| **Test** | trae_write_tests, codewhale_shell | filesystem(执行) |
| **Notify** | hermes-mcp | - |
| **Deploy** | github | codewhale_shell |

---

## §1 团队角色 (9人标准配置)

| # | 角色 | Agent ID | 职责范围 | 在哪些方案中激活 |
|---|------|---------|---------|----------------|
| 1 | **PO/Scrum Master** | po | 唯一对接Confu、需求拆解、任务分配、报告汇总 | D |
| 2 | **Architect** | arch | 架构设计、技术选型、Spec评审 | B Plan + C Review |
| 3 | **PM** | pm | Task创建、进度跟踪、风险管理 | B Plan + C |
| 4 | **BE Developer** | be | 后端服务+路由+数据 | B Code + C |
| 5 | **FE Developer** | fe | 前端HTML/CSS/JS、API对接 | B Code + C |
| 6 | **Designer** | design | UI/UX设计、视觉规范、交互 | C + (B 可选) |
| 7 | **Content** | content | 文案、种子数据、竞品内容分析 | B Code + C + D |
| 8 | **QA** | qa | 代码审查、测试脚本、质量验收 | A/B/C Review+Test |
| 9 | **DevOps** | devops | 部署、CI/CD、MCP运维 | C Deploy |

---

## §2 自动方案判定（Lead 收到指令后第一动作）⭐

### 2.1 判定算法

```
Lead 收到 Confu 指令
    │
    ├──→ 判定条件1: 是否包含以下关键词?
    │    "新项目" / "调研" / "竞品" / "对标" / "行业" / "从零"
    │    └─ YES → 触发 方案D，输出调研报告后自动转 方案B
    │
    ├──→ 判定条件2: 预估改动量?
    │    ① 先读项目文件: filesystem__directory_tree → 统计已有文件数
    │    ② 评估需改动/新建的文件数和行数
    │    ├─ < 3文件 且 < 500行 → 方案A
    │    ├─ 3-10文件 或 500-3000行 → 方案B（默认）
    │    └─ > 10文件 或 > 3000行 → 方案C
    │
    └──→ Confu 在指令中明确要求某个方案 → 以 Confu 要求为准
```

### 2.2 方案速查

| 方案 | 代号 | 触发条件 | Lead 角色 | Agent 数 | MCP目标使用率 |
|------|------|---------|----------|---------|-------------|
| **调研驱动** | D | 新项目/竞品/行业调研 | 仅下指令 | 9人(全) | 60% |
| **快速修复** | A | <500行 / 单文件 / Hotfix | 主力编码 | 2-3 | 60% |
| **标准开发** | B | 500-3000行 / 默认 | 写Spec+终审 | 5-6 | **≥85%** |
| **全栈重构** | C | >3000行 / 架构变更 | 架构决策+终审 | 8-10 | **≥95%** |

### 2.3 方案切换流转图

```
                        方案D (调研)
                        │
                        ▼ 输出报告 + Confu确认
                        │
     ┌──────────────────┼──────────────────┐
     ▼                  ▼                  ▼
  方案A              方案B               方案C
 (快速修复)         (标准开发)          (全栈重构)
     │                  │                  │
     └──────────────────┼──────────────────┘
                        ▼
                    方案A (后续维护/小修)
```

---

## §3 四方案详细流程

### 方案D — 调研驱动（新项目/竞品对标启动）

**Lead动作**:
1. 读取 Confu 指令 → 提取调研边界（行业/赛道/用户/功能）
2. 激活 PO Agent → 分配调研任务
3. PO 统筹 9 人 → 6渠道信息搜集 → 竞品拆解
4. PO 输出《行业情报+竞品分析报告》→ Lead 交付 Confu
5. Confu 确认 → 自动转入方案B 进入开发

### 方案A — 快速修复（小改动直通车）

**Lead动作**:
1. 声明"方案A模式"
2. Lead 调用 trae_generate_code / codex-direct 辅助编码
3. QA Agent 调用 trae_review_code + trae_write_tests
4. Lead 验收交付

**跳过**: PM拆任务、Explore调研、BE/FE分工

### 方案B — 标准开发（默认主力流）⭐

**Phase 1: Plan**
```
Step 1: PM Agent 创建 Task 列表
Step 2: Explore Agent 调用 filesystem + trae_analyze_code 摸底
Step 3: Explore 输出调研报告（必须含文件路径引用）
Step 4: Lead 基于调研写 Spec（含文件清单/接口/改动点）
Step 5: PM 分配任务给 BE/FE
```

**Phase 2: Code**
```
Step 1: BE Agent 调 trae_generate_code (复杂场景: claude-code)
Step 2: FE Agent 调 trae_generate_code + ardot
Step 3: Content Agent 生成数据文件
Step 4: Lead 集成路由
✋ 禁止 Lead 直接手写服务文件
```

**Phase 3: Review**
```
Step 1: QA Agent 调 trae_review_code 逐文件审查
Step 2: ≥7/10 继续 | <7/10 → hermes通知+打回
Step 3: QA 输出审查报告
Step 4: Lead 终审
```

**Phase 4: Test**
```
Step 1: QA Agent 调 trae_write_tests
Step 2: QA 执行测试
Step 3: 全部通过 → 输出报告 | 有失败 → hermes通知
Step 4: Lead 验收
```

### 方案C — 全栈重构（最大火力）

方案B全部流程 + 以下增强：
- Plan: Arch Agent 出架构设计
- Code: Design Agent 用 ardot 出设计 + BE/FE 双人并行
- Review: 双审查（Code-Review Agent + QA Agent）
- Test: 单元测试 + 集成测试 + 回归测试
- Deploy: DevOps Agent 自动化部署

---

## §4 质量门禁系统（所有方案适用）

| 门禁 | 工具 | 方案A | 方案B | 方案C | 不通过动作 |
|------|------|-------|-------|-------|-----------|
| L1 | trae_review_code | ≥6/10 | ≥7/10 | ≥8/10 | 打回修改 |
| L2 | trae_analyze_code | 可选 | 无ERROR | 无ERROR+WARN | 打回 |
| L3 | 合规检测 | 可选 | ≥80分 | ≥90分 | 标记修复 |
| L4 | Lead终审 | ✅ | ✅ | ✅ | 通过/驳回 |

---

## §5 MCP 使用率看板（每次任务后强制输出）

```
┌─────────────────────────────────────────────────────┐
│              MCP 工具使用率看板 v2.0                  │
│  方案: [A/B/C/D]  |  任务: [简述]  |  日期: YYYY-MM-DD │
├──────────────┬────────┬────────┬────────────────────┤
│ 工具          │ 应调用  │ 实调用  │ 状态               │
├──────────────┼────────┼────────┼────────────────────┤
│ trae_generate │  ≥1    │   N    │ ✅/❌              │
│ trae_review   │  ≥1    │   N    │ ✅/❌              │
│ trae_analyze  │  ≥1    │   N    │ ✅/❌              │
│ claude-code   │  按需   │   N    │ ✅/❌/—            │
│ codex-direct  │  按需   │   N    │ ✅/❌/—            │
│ filesystem    │  ≥2    │   N    │ ✅/❌              │
│ ardot         │  按需   │   N    │ ✅/❌/—            │
│ hermes        │  ≥1    │   N    │ ✅/❌              │
├──────────────┴────────┴────────┴────────────────────┤
│ 总使用率: XX% (实调用/应调用)  目标: ≥85%            │
│ 审查通过率: XX%  |  L1✅ L2✅ L3✅ L4✅              │
└─────────────────────────────────────────────────────┘
```

**计算规则**:
- 方案A: 应调用 ≥3 (trae_generate + trae_review + 任一)
- 方案B: 应调用 ≥5 (trae_generate + trae_review + trae_analyze + filesystem + 任一)
- 方案C: 应调用 ≥7 (全部工具至少一次)
- 方案D: 不计入使用率考核（调研阶段）

---

## §6 工具决策矩阵

| 场景 | 首选工具 | 备选 | 
|------|---------|------|
| 生成单个函数/组件 | trae_generate_code | codex-direct |
| 多文件重构 | **claude-code** | trae_refactor_code |
| 代码审查 | trae_review_code | claude-code -p "review..." |
| 生成测试 | trae_write_tests | codex-direct |
| 项目分析 | trae_analyze_code | filesystem__read_text_file |
| 竞品调研 | trae_analyze_competitor | web_search |
| 修复Bug | trae_fix_bug | codex-direct |
| 前端UI设计 | ardot | trae_generate_code |
| 文件CRUD | filesystem | codewhale_shell |
| 通知告警 | hermes-mcp | — |
| Git操作 | github MCP | codewhale_shell |

---

## §7 禁止事项

1. ❌ Lead 不可绕过 trae_generate_code 直接手写服务文件（方案B/C）
2. ❌ 代码未经 trae_review_code 审查不可合并
3. ❌ QA 未通过不可提交给 Confu
4. ❌ 调研报告不包含文件路径引用视为无效
5. ❌ 种子数据/词库等数据文件必须由 Content Agent 生成
6. ❌ 未经 Confu 确认，不可修改本规则文件
7. ❌ 方案B/C模式下不可跳过 Plan 阶段的 Explore 调研

---

## §8 Lead 任务启动检查表（每次收到 Confu 指令，按此执行）

```
□ 1. 读取指令 → 匹配 §2.1 判定条件
□ 2. 声明方案 (A/B/C/D)
□ 3. 如需调研 → 方案D → PO Agent 激活
□ 4. 如需开发 → Create Task 列表 → 按方案执行
□ 5. 每个 Phase 结束后输出进度
□ 6. 任务完成后输出 §5 MCP使用率看板
□ 7. TeamDelete 清理
```

---

## §9 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-06-17 | 初始版：9人+MCP全矩阵+四方案+质量门禁 |
| v2.0 | 2026-06-17 | 组合拳：自动判定算法+流转图+Lead检查表+方案间切换逻辑 |

---

**⛔ 本文件未经 Confu 明确书面确认，禁止任何 Agent 修改。**
