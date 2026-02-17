# OpenClaw WORKSPACE_GOVERNANCE

> 給非技術背景用戶的 OpenClaw 工作區治理方案。  
> 目標：第一次安裝清楚、之後維護簡單、每次改動可追溯。

[English Version](./README.en.md)

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-0ea5e9)](https://docs.openclaw.ai/) [![Mode](https://img.shields.io/badge/Workflow-Bootstrap%20%2F%20Migrate%20%2F%20Apply-22c55e)](#-三種使用場景你是哪一種) [![Audience](https://img.shields.io/badge/For-Beginners-f59e0b)](#-60-秒快速開始)

---

## 你先記住 2 句

1. 第一次導入：跑一次 `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
2. 之後日常維護：主要用 3 個指令
   - `/gov_migrate`
   - `/gov_audit`
   - `/gov_apply <NN>`

---

## 60 秒快速開始

1. 把整個 `prompts/governance/` 放到 `<workspace-root>/prompts/governance/`
2. 在 OpenClaw 對話中執行：`OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
3. 完成後送出：`/gov_audit`

如果 slash command 不可用，改用：`/skill gov_audit`

---

## 三種使用場景（你是哪一種）

| 你的狀況 | 你要做什麼 | 用哪個入口 |
|---|---|---|
| A. 全新 OpenClaw / 全新 workspace | 建立治理骨架 | `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` |
| B. 已運作 OpenClaw，但未導入本方案 | 首次導入，不破壞既有資料 | `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` |
| C. 已導入本方案 | 日常升級與維護 | `/gov_migrate` + `/gov_audit` |

---

## 指令速查（每天會用）

```text
/gov_migrate     # 升級治理規則
/gov_audit       # 健康檢查與一致性核對
/gov_apply <NN>  # 套用 BOOT 建議的編號項目
```

建議：命令用「獨立訊息」送出（只打一行 `/...`）。

如指令不可用或撞名，改用：

```text
/skill gov_migrate
/skill gov_audit
/skill gov_apply 01
```

---

## 這個資料夾有什麼

```text
prompts/governance/
├─ OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md
├─ WORKSPACE_GOVERNANCE_MIGRATION.md
├─ APPLY_UPGRADE_FROM_BOOT.md
├─ README.md
├─ README.en.md
└─ manual_prompt/
   ├─ MIGRATION_prompt_for_RUNNING_OpenClaw.md
   └─ POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md
```

用途：
- `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`：首次安裝 / 首次導入
- `WORKSPACE_GOVERNANCE_MIGRATION.md`：升級治理規則
- `APPLY_UPGRADE_FROM_BOOT.md`：按 BOOT 編號受控套用
- `manual_prompt/*`：slash command 失效時的後備入口

---

## 詳細步驟 A：全新 OpenClaw / 全新工作區

### Step 1
放好檔案：
- `<workspace-root>/prompts/governance/`

### Step 2
在 OpenClaw 對話中執行：
- `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`

### Step 3
完成後檢查有沒有以下項目：
- `_control/`
- `_runs/`
- `skills/gov_migrate/`
- `skills/gov_audit/`
- `skills/gov_apply/`
- `BOOT.md`（可選但建議）

### Step 4
送出健康檢查：
- `/gov_audit`

---

## 詳細步驟 B：已運作 OpenClaw，但未導入本方案

### Step 1
同樣先放：
- `<workspace-root>/prompts/governance/`

### Step 2
執行：
- `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`

### Step 3
完成後做檢查：
- `/gov_audit`

### Step 4（如遇到提示已初始化）
如果系統說「不要重跑 bootstrap」：
- 先跑 `/gov_migrate`
- 再跑 `/gov_audit`

---

## 詳細步驟 C：已導入 WORKSPACE_GOVERNANCE（日常維護）

### Step 1
升級：
- `/gov_migrate`

### Step 2
核對：
- `/gov_audit`

### Step 3（當 BOOT 有編號建議）
例如 BOOT 顯示 01/02/03：
- `/gov_apply 01`
- 完成後再 `/gov_audit`

---

## BOOT 成長機制（本方案特色）

你已啟用 `boot-md` 時，典型流程是：
1. 啟動時 `BOOT.md` 做只讀檢查
2. 產生編號建議（例如 01）
3. 你批准一個編號
4. 用 `/gov_apply <NN>` 受控套用
5. 系統再走 migration / audit，保持一致

重點：
- 啟動階段是只讀提案
- 真正寫入必須有你批准

---

## 如果 slash command 失效

先試：
- `/skill gov_migrate`
- `/skill gov_audit`
- `/skill gov_apply 01`

還是不行就用手動後備：
- `prompts/governance/manual_prompt/MIGRATION_prompt_for_RUNNING_OpenClaw.md`
- `prompts/governance/manual_prompt/POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md`

---

## 常見問題

### Q1. 只放這個資料夾就會自動全部生效嗎？
不會。你要在對話中執行對應 prompt 或指令，流程才會開始。

### Q2. 每次都要跑完整 prompt 嗎？
不用。完整 bootstrap prompt 主要是第一次。之後以 skills 指令為主。

### Q3. 會不會刪我原本專案資料？
這套流程是非破壞式設計，重點是備份和可追溯。

### Q4. 我什麼時候用 `/gov_apply <NN>`？
當 BOOT 報告給你明確編號建議，而且你批准時。

---

## 對外發佈（GitHub）建議

最小建議保留：
- `prompts/governance/` 全部內容
- 本 README

這樣新用戶可以直接按 A/B/C 場景照做。

---

## 官方文件（對照）

- Skills: https://docs.openclaw.ai/tools/skills
- Slash Commands: https://docs.openclaw.ai/tools/slash-commands
- Hooks: https://docs.openclaw.ai/automation/hooks
- Hooks CLI: https://docs.openclaw.ai/cli/hooks
- Config Reference: https://docs.openclaw.ai/gateway/configuration-reference
- Memory Concepts: https://docs.openclaw.ai/concepts/memory
