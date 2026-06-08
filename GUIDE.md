# WorkBuddy 统一调度中心 - 使用说明书

## 系统架构

```
┌──────────────────────────────────────────────┐
│              WorkBuddy 调度中心                │
│         http://localhost:8080/dashboard        │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Claude Code│ │ Codex CLI│ │ Trae IDE │      │
│  │  2.1.168 │ │  0.137.0 │ │ 字节跳动  │      │
│  └─────┬────┘ └────┬─────┘ └──────────┘      │
│        │           │                         │
│        ▼           ▼                         │
│  ┌────────────────────────┐                  │
│  │   代理服务器 :8080      │                  │
│  │   Anthropic ⇄ OpenAI   │                  │
│  └───────────┬────────────┘                  │
│              │                               │
│              ▼                               │
│  ┌────────────────────────┐                  │
│  │ SiliconFlow (免费)       │                  │
│  │ DeepSeek-V4 (付费)       │                  │
│  └────────────────────────┘                  │
└──────────────────────────────────────────────┘
```

## 快速开始

### 1. 打开仪表盘
双击桌面 **WorkBuddy调度中心.bat**，或浏览器访问 `http://localhost:8080/dashboard`

### 2. 选择模型
仪表盘左侧点一下即可切换：
- DeepSeek-V3（免费，日常够用）
- DeepSeek-V4（付费，最强推理）
- 千问 Qwen2.5（免费，备用）

### 3. 启动工具

**Claude Code：**
点仪表盘「Claude Code」卡片 → 点按钮 → 命令自动复制 → 打开 PowerShell → 粘贴运行

**Codex CLI：**
点仪表盘「Codex CLI」卡片 → 点按钮 → 命令自动复制 → 打开新 PowerShell → 粘贴运行

**Trae IDE：**
点仪表盘「Trae IDE」卡片 → 点按钮 → 路径自动复制 → 按 Win+R → 粘贴回车

## 命令行操作

```powershell
# 切换模型
cc-switch --switch deepseek     # DeepSeek-V3
cc-switch --switch deepseekv4   # DeepSeek-V4
cc-switch --switch qwen         # 千问

# 查看状态
cc-switch --current            # 当前模型
cc-switch --list               # 所有模型
cc-switch --dashboard          # 打开仪表盘

# 代理管理
cc-switch --start              # 启动代理
cc-switch --stop               # 停止代理
```

## 文件位置

| 文件 | 路径 |
|------|------|
| 代理服务器 | D:\AI_Tools\claude-code\simple-proxy.js |
| 仪表盘 | D:\AI_Tools\claude-code\dashboard.html |
| 调度脚本 | D:\AI_Tools\workbuddy.ps1 |
| 管理脚本 | D:\AI_Tools\claude-code\manage.ps1 |
| CC Switch | C:\Users\Confu\AppData\Roaming\npm\cc-switch.cmd |
| 项目工作区 | D:\AI-Workshop |
| Claude Code | D:\AI_Tools\claude-code |
| Codex | D:\AI_Tools\codex |
| Trae | D:\AI_Tools\Trae\TRAE SOLO CN |

## 模型池

| 简称 | 模型 | 来源 | 费用 |
|------|------|------|------|
| deepseek | DeepSeek-V3 | SiliconFlow | 免费 2000万 tokens |
| deepseekv4 | DeepSeek-V4 | 官方 API | 付费 (极低价) |
| qwen | Qwen2.5-72B | SiliconFlow | 免费 |
| glm | Qwen2.5-7B | SiliconFlow | 免费 |

## 常见问题

**Q: 仪表盘打不开？**
A: PowerShell 运行 `cc-switch --start` 确保代理启动

**Q: 切换模型后没生效？**
A: 刷新仪表盘页面，或 `cc-switch --current` 确认

**Q: Trae 怎么连上模型？**
A: Trae 是字节跳动 IDE，自带 AI 后端，不经过代理。用 Trae 查看和编辑代码产物。

**Q: API 额度用完了？**
A: SiliconFlow 注册即送 2000 万 tokens，用完可充值或换号

**Q: 想加新模型？**
A: 告诉我模型名和 API Key，5 分钟接入
