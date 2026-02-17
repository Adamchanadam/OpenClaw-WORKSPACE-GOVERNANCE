# OpenClaw WORKSPACE_GOVERNANCE

> 面向 OpenClaw 使用者的工作區治理方案。  
> 目的：以可重複、可驗證、可追溯的方式管理 Bootstrap、Migration、Audit 與 BOOT 升級套用。

[English Version](./README.en.md)

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-0ea5e9)](https://docs.openclaw.ai/) [![Distribution](https://img.shields.io/badge/Distribution-Plugin%20%2B%20ClawHub-22c55e)](#安裝方式) [![Audience](https://img.shields.io/badge/Audience-Beginners-f59e0b)](#首次部署)

---

## 專案定位

本專案提供完整的 OpenClaw 工作區治理能力，包括：

1. 首次導入治理骨架（Bootstrap）。
2. 已運作工作區的升級對齊（Migration）。
3. 固定檢查清單的一致性核對（Audit）。
4. BOOT 編號提案的批准後受控套用（Apply）。

目前採用「Plugin 主體 + ClawHub Installer」雙層發佈模式：

1. Plugin：承載正式功能與 `gov_*` skills。
2. ClawHub Installer：提供發現、安裝與啟用導引。

---

## 安裝方式

### 方式 A（推薦）：直接安裝 Plugin

1. 安裝 plugin：

```text
openclaw plugins install @adamchanadam/openclaw-workspace-governance@0.1.0
```

2. 啟用 plugin：

```text
openclaw plugins enable openclaw-workspace-governance
```

3. 驗證載入：

```text
openclaw plugins list
openclaw skills list --eligible
```

### 方式 B：使用 ClawHub Installer

若以 GitHub 路徑安裝 installer skill，可使用：

```text
clawhub inspect Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/clawhub/openclaw-workspace-governance-installer
clawhub install Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/clawhub/openclaw-workspace-governance-installer
```

安裝 installer 後，請依其指引完成 plugin 安裝與啟用。

---

## 首次部署

Plugin/Installer 安裝完成後，在 OpenClaw 對話中執行：

```text
/gov_setup install
```

`/gov_setup` 會將治理核心 prompt 部署到當前 workspace 的 `prompts/governance/`。

若 slash command 不可用或撞名，請改用：

```text
/skill gov_setup install
```

---

## 三種使用場景

| 場景 | 適用情況 | 建議入口 |
|---|---|---|
| A | 全新 OpenClaw / 全新工作區 | `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` |
| B | 已運作 OpenClaw，但尚未導入治理方案 | `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` |
| C | 已導入治理方案，需持續維護 | `/gov_migrate` + `/gov_audit` |

### 場景 A：全新 OpenClaw / 全新工作區

1. 完成安裝與部署（先執行 `/gov_setup install`）。
2. 執行 `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`。
3. 執行 `/gov_audit` 確認基線一致。

### 場景 B：已運作 OpenClaw，首次導入治理

1. 完成安裝與部署（先執行 `/gov_setup install`）。
2. 執行 `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`。
3. 執行 `/gov_audit`。
4. 若系統提示已初始化，改為先執行 `/gov_migrate`，再執行 `/gov_audit`。

### 場景 C：已導入治理方案（日常維護）

1. 執行 `/gov_migrate`。
2. 執行 `/gov_audit`。
3. 當 BOOT 提供編號提案時，執行 `/gov_apply <NN>`，完成後再次執行 `/gov_audit`。

---

## 命令速查

```text
/gov_setup install   # 部署或升級治理 prompt 資產
/gov_migrate         # 套用治理升級
/gov_audit           # 執行一致性核對
/gov_apply <NN>      # 套用 BOOT 編號提案
```

若 slash command 不可用或撞名，請改用：

```text
/skill gov_setup install
/skill gov_migrate
/skill gov_audit
/skill gov_apply 01
```

---

## BOOT 升級機制

啟用 `boot-md` 後，建議流程如下：

1. `BOOT.md` 啟動時執行只讀檢查。
2. 輸出編號建議（例如 `01`、`02`、`03`）。
3. 由使用者批准指定項目。
4. 透過 `/gov_apply <NN>` 進行受控套用。
5. 以 `/gov_migrate` 與 `/gov_audit` 收斂至一致狀態。

---

## Repository 結構（GitHub 根目錄）

```text
.
├─ openclaw.plugin.json
├─ package.json
├─ index.ts
├─ OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md
├─ WORKSPACE_GOVERNANCE_MIGRATION.md
├─ APPLY_UPGRADE_FROM_BOOT.md
├─ WORKSPACE_GOVERNANCE_README.md
├─ README.md
├─ README.en.md
├─ manual_prompt/
│  ├─ MIGRATION_prompt_for_RUNNING_OpenClaw.md
│  └─ POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md
├─ skills/
│  ├─ gov_setup/SKILL.md
│  ├─ gov_migrate/SKILL.md
│  ├─ gov_audit/SKILL.md
│  └─ gov_apply/SKILL.md
└─ clawhub/
   └─ openclaw-workspace-governance-installer/SKILL.md
```

---

## 部署路徑對照（OpenClaw Workspace）

`/gov_setup install` 會部署以下內容到 workspace：

1. 核心 prompt 檔案 -> `<workspace-root>/prompts/governance/`
2. `manual_prompt/` -> `<workspace-root>/prompts/governance/manual_prompt/`

---

## 常見問題

### Q1. 仍可手動 copy 嗎？
可以。手動 copy 仍可用，但建議改為 Plugin + `/gov_setup`，可降低部署偏差。

### Q2. 是否每次都要執行 Bootstrap？
不需要。Bootstrap 主要用於首次導入；日常請使用 `gov_*` 命令。

### Q3. 何時使用 `/gov_apply <NN>`？
當 BOOT 報告提供編號提案且完成批准後使用。

### Q4. 指令撞名時怎麼辦？
使用 `/skill <name>` 形式直接呼叫對應 skill。

---

## 官方參考

- Skills: https://docs.openclaw.ai/tools/skills
- ClawHub: https://docs.openclaw.ai/tools/clawhub
- Slash Commands: https://docs.openclaw.ai/tools/slash-commands
- Plugin: https://docs.openclaw.ai/plugins
- Plugin Manifest: https://docs.openclaw.ai/plugins/manifest
- CLI Plugins: https://docs.openclaw.ai/cli/plugins
- CLI Skills: https://docs.openclaw.ai/cli/skills
