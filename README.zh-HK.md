# OpenClaw WORKSPACE_GOVERNANCE

> 把 OpenClaw 出廠的可用基線，補強為可控、可驗證、可追溯的長期運作治理系統。
> 保留使用彈性，同時把高風險操作放入固定流程。

[English Version](./README.md)

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-0ea5e9)](https://docs.openclaw.ai/) [![Distribution](https://img.shields.io/badge/Distribution-Plugin%20%2B%20ClawHub-22c55e)](#安裝方式) [![Audience](https://img.shields.io/badge/Audience-Beginners-f59e0b)](#首次部署)

ClawHub 安裝頁：
- https://clawhub.ai/Adamchanadam/openclaw-workspace-governance-installer

---

## 由此開始（30 秒）

先選擇你的入口路徑：
1. 首次使用本插件：先安裝 plugin，再執行 `gov_setup install`
2. 已在使用本插件：先更新 plugin，再執行 `gov_setup upgrade -> gov_migrate -> gov_audit`
3. 需要修改 OpenClaw 平台設定：使用 `gov_platform_change`（不要直接 patch）

最短指令路徑：

```text
openclaw plugins install @adamchanadam/openclaw-workspace-governance@latest
/gov_setup install
/gov_audit
```

---

## 什麼是 OpenClaw WORKSPACE_GOVERNANCE

OpenClaw WORKSPACE_GOVERNANCE 是一層面向 OpenClaw 工作區的治理方案。

它把高風險任務收斂為固定生命週期：
1. Bootstrap：首次建立治理基線
2. Migration：把已運作工作區對齊到最新治理規則
3. Audit：以固定清單做一致性驗證
4. Apply：對 BOOT 編號提案做批准後受控套用

本專案提供雙通道發佈：
1. Plugin 套件（`@adamchanadam/openclaw-workspace-governance`）作為執行核心
2. ClawHub Installer 作為新手入口

---

## 適用對象

1. 需要穩定日常運作的 OpenClaw 個人用戶
2. 需要可追溯改動紀錄的長期工作區團隊
3. 希望使用導引式流程、而非臨時拼接 prompt 的新手用戶

---

## 為何要使用本方案

多數情況下，真正問題不是「功能不足」，而是「使用一段時間後失去控制」。

常見痛點：
1. 代理收到任務後先改檔，未先讀規則和證據
2. 同類錯誤在不同 session 重覆發生
3. 升級與修正缺乏可追溯紀錄，審核與回退成本高

本方案的核心價值：
1. 固定順序：`PLAN -> READ -> CHANGE -> QC -> PERSIST`
2. 系統題/時間題/版本題必須先查證
3. 每次改動留下 run report 證據
4. BOOT 先只讀提案，由人類批准後再受控套用

### 定位與邊界（建議閱讀）

如需完整理解「為何存在」與「不應過度承諾」：
1. 定位文件（繁中）：[`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)
2. 操作手冊（繁中）：[`WORKSPACE_GOVERNANCE_README.md`](./WORKSPACE_GOVERNANCE_README.md)

---

## 視覺化導讀

全局資訊圖：

![OpenClaw WORKSPACE_GOVERNANCE Infographic](./ref_doc/infograp_eng.png)

安裝參考畫面：

![gov_setup install 畫面](./ref_doc/screen_gov_setup_inst.png)

逐頁導讀（Page 1-6）：

![Page 1](./ref_doc/page_1.jpg)
![Page 2](./ref_doc/page_2.jpg)
![Page 3](./ref_doc/page_3.jpg)
![Page 4](./ref_doc/page_4.jpg)
![Page 5](./ref_doc/page_5.jpg)
![Page 6](./ref_doc/page_6.jpg)

---

## 核心流程（最重要）

任何寫入/更新/保存任務都必須通過 5 個關卡：
1. `PLAN`：先列目標、範圍、風險與目標檔案
2. `READ`：先讀治理規則與目標檔案
3. `CHANGE`：只做授權範圍內的最小改動
4. `QC`：按固定清單核對（12/12）
5. `PERSIST`：保留 run report 證據

Fail-Closed 原則：
1. 證據不足或路徑不明確時，流程必須停止
2. 任一必要 QC 未通過，不可宣稱完成

Mode 分流：
1. Mode A：一般對話（不寫檔、不作系統事實宣稱）
2. Mode B：需查證回答（不寫檔）
3. Mode C：任何寫入/更新/保存（必走完整 5 gates）

---

## 我應該用哪條指令？

| 任務目標 | 使用指令 | 適用範圍 | 不適用於 |
|---|---|---|---|
| 首次部署治理資產 | `/gov_setup install` | `<workspace-root>/prompts/governance/` | 直接修改平台設定 |
| 升級既有治理資產 | `/gov_setup upgrade` | `<workspace-root>/prompts/governance/` | 平台控制面 patch |
| 套用治理對齊更新 | `/gov_migrate` | 工作區治理檔案 | BOOT 編號提案套用 |
| 只讀核對一致性 | `/gov_audit` | 治理證據與一致性 | 寫入新變更 |
| 套用已批准 BOOT 提案 | `/gov_apply <NN>` | 已批准 BOOT 項目 | 未批准的臨時改動 |
| 安全修改 OpenClaw 平台控制面 | `/gov_platform_change` | `~/.openclaw/openclaw.json`、`~/.openclaw/extensions/` | Brain Docs 與一般 workspace 內容 |

`gov_platform_change` 不適用於 Brain Docs（`USER.md`、`IDENTITY.md`、`TOOLS.md`、`SOUL.md`、`MEMORY.md`、`HEARTBEAT.md`、`memory/*.md`）。

---

## 可靠性契約（簡版）

1. OpenClaw 系統題必須先核對本地 skills 與官方文檔：`https://docs.openclaw.ai`
2. 版本敏感題必須再核對官方 releases：`https://github.com/openclaw/openclaw/releases`
3. 日期時間題必須先核對 runtime 當前時間，再用絕對日期作答
4. Brain Docs 只讀查詢必須先讀目標檔案
5. Brain Docs 寫入任務的 run report 必須包含：`FILES_READ` + `TARGET_FILES_TO_CHANGE`
6. 平台設定變更必須使用 `gov_platform_change`，並保留備份/驗證/回退證據

---

## 安裝方式

### 方式 A（推薦）：直接安裝 Plugin

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

### 方式 B：由 ClawHub 安裝

```text
clawhub inspect Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/clawhub/openclaw-workspace-governance-installer
clawhub install Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/clawhub/openclaw-workspace-governance-installer
```

---

## 首次部署

安裝 plugin 後，需部署治理資產到 workspace：

```text
/gov_setup install
```

若 slash 不可用：

```text
/skill gov_setup install
```

重要說明：
- `openclaw plugins install ...` 只會把 plugin 安裝到 extensions
- 需要透過 `gov_setup install` / `gov_setup upgrade` 才會把治理 prompt 部署到工作區

---

## 已安裝用戶升級流程

1. 主機端先更新 plugin：

```text
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart
```

2. OpenClaw 對話中執行：

```text
/gov_setup upgrade
/gov_migrate
/gov_audit
```

`gov_setup` 三種模式：

```text
/gov_setup install   # 首次部署
/gov_setup upgrade   # 升級既有資產
/gov_setup check     # 只讀狀態檢查
```

---

## 三種使用場景

1. 全新 OpenClaw / 全新工作區：
   - `gov_setup install` -> bootstrap prompt -> `gov_audit`
2. 已運作工作區，首次導入治理：
   - `gov_setup install` -> bootstrap/migration 路線 -> `gov_audit`
3. 已導入治理（日常維護）：
   - `gov_setup upgrade` -> `gov_migrate` -> `gov_audit`
   - 若 BOOT 有編號提案：`gov_apply <NN>` 後再 `gov_audit`

---

## 新手 UAT：5 分鐘驗證（無 slash）

若 slash 路由不穩定，可送出以下自然語言請求：

```text
請使用 gov_setup 的 check 模式（只讀，不可改檔），並回覆：
1) workspace root
2) 狀態（NOT_INSTALLED / PARTIAL / READY）
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

### Q2. 非技術背景用戶能否使用？
可以。由 `gov_setup check` 開始，按下一步提示執行即可。

### Q3. 為何不建議直接 patch config？
平台直接改動在長期運作中風險較高。治理流程會保留備份、驗證與回退證據。

### Q4. 何時使用 `gov_apply <NN>`？
僅在 BOOT 已產生編號提案，且你已批准指定項目時使用。

### Q5. `gov_platform_change` 可否修改 Brain Docs？
不可以。Brain Docs 不屬平台控制面目標。

### Q6. Plugin 已安裝，但 workspace 未見治理文件？
請執行 `gov_setup install`（已有部署則執行 `gov_setup upgrade`）。

### Q7. Plugin 升級後要執行什麼？
`gov_setup upgrade` -> `gov_migrate` -> `gov_audit`。

### Q8. slash 不穩定時可否全程使用 `/skill ...`？
可以：`/skill gov_setup ...`、`/skill gov_migrate`、`/skill gov_audit`、`/skill gov_apply <NN>`、`/skill gov_platform_change`。

### Q9. AI 出錯後會如何改進？
錯誤會被寫入 run report；重覆模式可透過 BOOT 編號提案進行受控改進。

### Q10. 哪裡可讀完整深度文檔？
請見下方 Deep Docs。

---

## Deep Docs

1. 操作手冊（繁中）：[`WORKSPACE_GOVERNANCE_README.md`](./WORKSPACE_GOVERNANCE_README.md)
2. 操作手冊（English）：[`WORKSPACE_GOVERNANCE_README.en.md`](./WORKSPACE_GOVERNANCE_README.en.md)
3. 定位文件（繁中）：[`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)
4. 定位文件（English）：[`VALUE_POSITIONING_AND_FACTORY_GAP.en.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md)

---

## 官方參考

- https://docs.openclaw.ai/tools/skills
- https://docs.openclaw.ai/tools/clawhub
- https://docs.openclaw.ai/plugins
- https://docs.openclaw.ai/cli/plugins
- https://docs.openclaw.ai/cli/skills
- https://github.com/openclaw/openclaw/releases
