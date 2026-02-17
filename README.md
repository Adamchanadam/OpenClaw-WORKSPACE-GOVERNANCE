# OpenClaw WORKSPACE_GOVERNANCE

> OpenClaw 工作區治理方案（Plugin + ClawHub）。  
> 以標準化流程提升穩定性、降低重工、建立可追溯變更紀錄。

[English Version](./README.en.md)

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-0ea5e9)](https://docs.openclaw.ai/) [![Distribution](https://img.shields.io/badge/Distribution-Plugin%20%2B%20ClawHub-22c55e)](#安裝方式) [![Audience](https://img.shields.io/badge/Audience-Beginners-f59e0b)](#首次部署)

---

## 什麼是 OpenClaw WORKSPACE_GOVERNANCE

OpenClaw WORKSPACE_GOVERNANCE 是一套面向 OpenClaw 的工作區治理框架。  
它將常見的治理操作收斂為固定生命週期：

1. Bootstrap：首次建立治理基線。
2. Migration：在既有工作區套用治理升級。
3. Audit：以固定檢查清單驗證一致性。
4. Apply：對 BOOT 編號提案做批准後受控套用。

專案採用「Plugin 主體 + ClawHub Installer 入口」雙層發佈：

1. Plugin 提供正式功能與 `gov_*` skills。
2. ClawHub Installer 提供標準化安裝入口與導引。

---

## 為何要使用本方案

在長期運作的 OpenClaw 工作區中，常見風險包括：

1. 修改流程不一致，導致規則漂移。
2. 新 session 重複出現相同治理缺口。
3. 變更證據分散，事後核對與回溯成本高。

本方案的核心價值：

1. 以 `Bootstrap -> Migrate -> Audit -> Apply` 固化治理流程。
2. 以 BOOT 提案 + 人工批准 + 受控套用，降低誤寫風險。
3. 以固定入口與可追溯輸出，提升團隊協作與維護效率。

---

## 核心能力

1. 首次導入：`OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
2. 日常維護：`/gov_migrate`、`/gov_audit`
3. BOOT 升級：`/gov_apply <NN>`
4. 資產部署：`/gov_setup install`

---

## v1.1 可靠性契約（重要）

為降低「答錯指令／誤判日期／路徑漂移」風險，WG Core v1.1 增加了以下硬規則：

1. 三種運行模式：
   - Mode A：一般對話（不寫檔、不作系統事實宣稱）
   - Mode B：需事實依據的回答（不寫檔）
   - Mode C：任何寫入/更新/保存（必走完整治理流程）
2. OpenClaw 系統題（Mode B2）：
   - 回答前必須先核對本地 skills 與官方文檔（`https://docs.openclaw.ai`），不可直接推理。
3. 日期時間題（Mode B3）：
   - 回答前必須先核對 runtime 當前時間（session status），並以絕對日期表達結論。
4. 路徑相容：
   - 以 runtime 的 `<workspace-root>` 為準；`~/.openclaw/workspace` 只視為常見預設，不可硬編碼假設。
5. BOOT 套用成效：
   - `/gov_apply <NN>` 後要記錄前後指標；若無可衡量改善，結果應標記為 `PARTIAL`，並保留後續修正動作。

---

## 安裝方式

### 方式 A（推薦）：直接安裝 Plugin

1. 安裝：

```text
openclaw plugins install @adamchanadam/openclaw-workspace-governance@0.1.0
```

2. 啟用：

```text
openclaw plugins enable openclaw-workspace-governance
```

3. 驗證：

```text
openclaw plugins list
openclaw skills list --eligible
```

### 方式 B：使用 ClawHub Installer

```text
clawhub inspect Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/clawhub/openclaw-workspace-governance-installer
clawhub install Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/clawhub/openclaw-workspace-governance-installer
```

安裝 installer 後，依指引完成 plugin 安裝與啟用。

---

## 首次部署

安裝完成後，在 OpenClaw 對話中執行：

```text
/gov_setup install
```

此命令會把治理核心 prompt 部署到：`<workspace-root>/prompts/governance/`。

若 slash command 不可用或撞名，使用：

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

1. 執行 `/gov_setup install`。
2. 執行 `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`。
3. 執行 `/gov_audit` 驗證基線一致。

### 場景 B：已運作 OpenClaw，首次導入治理

1. 執行 `/gov_setup install`。
2. 執行 `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`。
3. 執行 `/gov_audit`。
4. 若系統提示已初始化，先執行 `/gov_migrate`，再執行 `/gov_audit`。

### 場景 C：已導入治理方案（日常維護）

1. 執行 `/gov_migrate`。
2. 執行 `/gov_audit`。
3. 當 BOOT 提供編號提案時，執行 `/gov_apply <NN>`，並在完成後再次執行 `/gov_audit`。

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

命名說明：本插件的安裝/部署入口是 `gov_setup`，不是 `gov_install`。

---

## BOOT 升級機制

啟用 `boot-md` 後，建議流程如下：

1. `BOOT.md` 於啟動時執行只讀檢查。
2. 系統輸出編號建議（例如 `01`、`02`、`03`）。
3. 使用者批准指定項目。
4. 透過 `/gov_apply <NN>` 受控套用。
5. 以 `/gov_migrate` 與 `/gov_audit` 收斂至一致狀態。
6. 比對前後指標；如未見可衡量改善，標記為 `PARTIAL` 並持續迭代。

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

`/gov_setup install` 會部署：

1. 核心 prompt 檔案 -> `<workspace-root>/prompts/governance/`
2. `manual_prompt/` -> `<workspace-root>/prompts/governance/manual_prompt/`

---

## 常見問題（高頻決策）

### Q1. 本方案適合哪些使用者？
適合需要長期維護 OpenClaw 工作區、希望降低治理漂移與重工成本的個人或團隊。

### Q2. 導入後會影響既有專案內容嗎？
設計原則是非破壞式治理；重點在治理檔案與流程對齊，不以覆蓋既有 `projects/` 內容為目標。

### Q3. 我應該選哪個場景啟動？
若工作區從未導入治理，使用場景 A 或 B（依是否全新工作區）。若已導入，固定使用場景 C 進行日常維護。

### Q4. 升級時如何降低風險？
建議先執行 `/gov_audit` 取得基線，再執行 `/gov_migrate`，完成後再次執行 `/gov_audit` 驗證變更結果。

### Q5. 如果 `/gov_*` 指令不可用？
請改用 `/skill gov_setup install`、`/skill gov_migrate`、`/skill gov_audit`、`/skill gov_apply <NN>`。

### Q6. 何時使用 `/gov_apply <NN>`？
僅在 BOOT 已產生編號提案且完成批准時使用；不建議在缺少 BOOT 編號上下文時直接執行。

### Q7. 如何回退到上一個穩定版本？
可重新安裝指定 plugin 版本（pin version），再執行 `/gov_setup install` 與 `/gov_audit` 完成回退與一致性確認。

### Q8. 回答 OpenClaw 系統問題時，為何要先查官方文檔？
因為此類問題屬於系統事實（例如指令、設定、hooks、skills、plugins），v1.1 要求先核對 `docs.openclaw.ai`，避免把錯誤指令寫入系統配置。

### Q9. 為何強調 `<workspace-root>` 而不是固定路徑？
OpenClaw 支援可配置工作區。v1.1 以 runtime workspace 為準，兼容官方預設與自訂部署，避免在不同環境出現路徑衝突。

### Q10. 為何我看不到 `/gov_install`？
此插件的正確命令是 `/gov_setup install`。`/gov_install` 不是本 repo 定義的 skill 名稱。

---

## 官方參考

- Skills: https://docs.openclaw.ai/tools/skills
- ClawHub: https://docs.openclaw.ai/tools/clawhub
- Slash Commands: https://docs.openclaw.ai/tools/slash-commands
- Plugin: https://docs.openclaw.ai/plugins
- Plugin Manifest: https://docs.openclaw.ai/plugins/manifest
- CLI Plugins: https://docs.openclaw.ai/cli/plugins
- CLI Skills: https://docs.openclaw.ai/cli/skills
