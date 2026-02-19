# OpenClaw WORKSPACE_GOVERNANCE

> 把 OpenClaw 由「容易啟動」提升為「可長期穩定運作」：先計劃、先核對、後改動。

[English Version](./README.md)

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-0ea5e9)](https://docs.openclaw.ai/) [![Distribution](https://img.shields.io/badge/Distribution-Plugin%20%2B%20ClawHub-22c55e)](#安裝) [![Audience](https://img.shields.io/badge/Audience-Beginners-f59e0b)](#快速開始)

ClawHub 安裝頁：
- https://clawhub.ai/Adamchanadam/openclaw-workspace-governance-installer

---

## 這是什麼

OpenClaw WORKSPACE_GOVERNANCE 是一套面向 OpenClaw 工作區的 Plugin + Skills 治理方案。

它把高風險任務固定為一個可重覆流程：
1. `PLAN`
2. `READ`
3. `CHANGE`
4. `QC`
5. `PERSIST`

核心價值：
1. 降低「先改後查」造成的失誤。
2. 降低同類錯誤在不同 session 重覆出現。
3. 保留可核對的 run report 證據，便於審核、交接與回退。

---

## 快速開始

### 安裝

首次安裝：

```text
openclaw plugins install @adamchanadam/openclaw-workspace-governance@latest
openclaw plugins enable openclaw-workspace-governance
openclaw skills list --eligible
```

已安裝用戶（升級路徑）：

```text
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart
```

### 初始化或升級治理資產

```text
/gov_setup check
/gov_setup install      # 首次部署
/gov_setup upgrade      # 已有工作區升級
```

若 slash 不穩定：

```text
/skill gov_setup check
/skill gov_setup install
/skill gov_setup upgrade
```

---

## 指令選擇表

| 你的目標 | 使用指令 | 適用範圍 |
|---|---|---|
| 首次部署治理文件 | `/gov_setup install` | `<workspace-root>/prompts/governance/` |
| 升級既有治理文件 | `/gov_setup upgrade` | `<workspace-root>/prompts/governance/` |
| 套用治理對齊更新 | `/gov_migrate` | 工作區治理檔案 |
| 只讀核對一致性 | `/gov_audit` | 工作區治理證據 |
| 套用已批准 BOOT 提案 | `/gov_apply <NN>` | 僅限已批准 BOOT 項目 |
| 安全修改 OpenClaw 平台設定 | `/gov_platform_change` | `~/.openclaw/openclaw.json`、`~/.openclaw/extensions/` |

`gov_platform_change` 不適用於 Brain Docs（如 `USER.md`、`SOUL.md`、`memory/*.md`）及一般 workspace 文件。

---

## 三種使用場景

1. 全新 OpenClaw / 全新工作區：
   - `gov_setup install` -> 執行 bootstrap prompt -> `gov_audit`
2. 已運作工作區，首次導入治理：
   - `gov_setup install` -> 走 bootstrap/migration 路線 -> `gov_audit`
3. 已安裝治理方案（日常維護）：
   - `gov_setup upgrade` -> `gov_migrate` -> `gov_audit`
   - 若 BOOT 提供編號提案：`gov_apply <NN>` 後再 `gov_audit`

完整操作步驟請見：[`WORKSPACE_GOVERNANCE_README.md`](./WORKSPACE_GOVERNANCE_README.md)

---

## 可靠性規則（簡版）

1. 任何寫入/更新/保存任務均屬 Mode C，必須完整執行 5 gates。
2. OpenClaw 系統題必須先核對官方文檔：`https://docs.openclaw.ai`。
3. 版本敏感題必須再核對官方 releases：`https://github.com/openclaw/openclaw/releases`。
4. 日期時間題必須先核對 runtime 當前時間，並以絕對日期作答。
5. Brain Docs 只讀查詢必須先讀取精確目標檔案。
6. Brain Docs 寫入/更新的 run report 必須包含：`FILES_READ` + `TARGET_FILES_TO_CHANGE`。
7. 平台設定變更必須使用 `gov_platform_change`（含備份/驗證/回退）。

---

## 5 分鐘 UAT（無 slash）

如 slash routing 不穩定，可在對話輸入：

```text
請使用 gov_setup 的 check 模式（只讀）並回覆：
1) workspace root
2) 安裝狀態（NOT_INSTALLED / PARTIAL / READY）
3) 下一步建議
```

判定標準：
1. `NOT_INSTALLED` -> 執行 `gov_setup install`
2. `PARTIAL` -> 執行 `gov_setup upgrade`
3. `READY` -> 執行 `gov_migrate` 再 `gov_audit`

---

## 常見問題

### Q1. 本方案是否取代 OpenClaw？
不是。本方案是在 OpenClaw 之上補充治理控制面。

### Q2. 非技術用戶能否使用？
可以。先由 `gov_setup check` 開始，按下一步提示執行即可。

### Q3. 為何不建議直接改 config？
直接改動在長期運作中風險較高。治理流程會保留備份、驗證與回退證據。

### Q4. 何時使用 `gov_apply <NN>`？
僅在 BOOT 已提供編號提案且你已批准指定項目時使用。

### Q5. `gov_platform_change` 可否修改 Brain Docs？
不可以。Brain Docs 不屬平台控制面目標。

### Q6. Plugin 已安裝，但 workspace 未見治理文件？
請執行 `gov_setup install`（已有部署則執行 `gov_setup upgrade`）。

### Q7. Plugin 升級後要執行什麼？
`gov_setup upgrade` -> `gov_migrate` -> `gov_audit`。

### Q8. slash 不穩定時可否全程用 `/skill ...`？
可以。`/skill gov_setup ...`、`/skill gov_migrate`、`/skill gov_audit`、`/skill gov_apply <NN>`、`/skill gov_platform_change`。

### Q9. AI 做錯後會如何改進？
流程會把錯誤寫入 run report，支援 recurrence 檢測，並透過 BOOT 編號提案進行受控改進。

### Q10. 更深入文檔在哪裡？
請見下方 Deep Docs。

---

## Deep Docs

1. 操作手冊（繁中）：[`WORKSPACE_GOVERNANCE_README.md`](./WORKSPACE_GOVERNANCE_README.md)
2. 操作手冊（English）：[`WORKSPACE_GOVERNANCE_README.en.md`](./WORKSPACE_GOVERNANCE_README.en.md)
3. 定位與出廠差異（繁中）：[`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)
4. 定位與出廠差異（English）：[`VALUE_POSITIONING_AND_FACTORY_GAP.en.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md)

---

## 官方參考

- https://docs.openclaw.ai/tools/skills
- https://docs.openclaw.ai/tools/clawhub
- https://docs.openclaw.ai/plugins
- https://docs.openclaw.ai/cli/plugins
- https://docs.openclaw.ai/cli/skills
- https://github.com/openclaw/openclaw/releases
