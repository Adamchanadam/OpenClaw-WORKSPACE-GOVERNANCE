# OpenClaw WORKSPACE_GOVERNANCE

> 把 OpenClaw 的「人格/記憶導向出廠設定」，補強為「可控、可驗證、可追溯」的工作區治理系統。  
> 不改變你原有的使用彈性，但把高風險變更納入固定流程，降低反覆返工與人手補救成本。

[English Version](./README.md)

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-0ea5e9)](https://docs.openclaw.ai/) [![Distribution](https://img.shields.io/badge/Distribution-Plugin%20%2B%20ClawHub-22c55e)](#安裝方式) [![Audience](https://img.shields.io/badge/Audience-Beginners-f59e0b)](#首次部署)

ClawHub Installer 頁面：
- https://clawhub.ai/Adamchanadam/openclaw-workspace-governance-installer

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

多數使用者的痛點不是「功能不足」，而是「功能越多，越難穩定」：

1. 收到指令即開始改檔，未先計劃與核對依據。
2. 同一類錯誤在新 session 重複出現，難以真正收斂。
3. 升級與修正分散在多個檔案，事後難以核對「改了甚麼、為何而改」。

本方案提供的價值不是增加命令數量，而是把高風險操作變成可管理流程：

1. 以 `PLAN -> READ -> CHANGE -> QC -> PERSIST` 固定先後次序，先核對再改動。
2. 對系統題與時間題先做事實驗證（官方文檔、版本資訊、runtime 時間），降低虛構與誤判。
3. 每次變更都有 run report 與索引證據，方便回顧、交接與審核。
4. 以「BOOT 只讀提案 -> 人工批准 -> 受控套用」機制，降低啟動期自動誤寫風險。

### 定位深讀（建議先讀）

若你想快速理解「為何 OpenClaw 出廠後仍需要 WORKSPACE_GOVERNANCE」，先讀以下兩份文件：

1. [VALUE_POSITIONING_AND_FACTORY_GAP.md](./VALUE_POSITIONING_AND_FACTORY_GAP.md)：說明本方案原意、用戶價值、與官方 baseline 的關係與邊界。
2. [WORKSPACE_GOVERNANCE_README.md](./WORKSPACE_GOVERNANCE_README.md)：完整治理手冊（三種場景、核心流程、風險控制）。

## 視覺化導讀

全局資訊圖：

![OpenClaw WORKSPACE_GOVERNANCE Infographic](./ref_doc/infograp_eng.png)

安裝/升級對照畫面：

![gov_setup install 畫面](./ref_doc/screen_gov_setup_inst.png)

逐頁對照圖（Page 1-6）：

![Page 1](./ref_doc/page_1.jpg)
![Page 2](./ref_doc/page_2.jpg)
![Page 3](./ref_doc/page_3.jpg)
![Page 4](./ref_doc/page_4.jpg)
![Page 5](./ref_doc/page_5.jpg)
![Page 6](./ref_doc/page_6.jpg)

---

## 核心流程（最重要）

OpenClaw WORKSPACE_GOVERNANCE 的核心，不是多幾條命令，而是固定執行次序。

任何涉及寫入、更新、保存的任務，都必須按以下 5 個關卡執行：

1. `PLAN`：先列目標、風險、將讀/將改文件。
2. `READ`：先讀治理依據與目標文件，再動手。
3. `CHANGE`：只做授權範圍內的最小改動。
4. `QC`：以固定清單逐項核對（12/12）。
5. `PERSIST`：留下 run report 與索引追蹤證據。

Fail-Closed 原則：

1. 缺文件、缺依據、路徑不明確時，流程必須停止，不可猜測執行。
2. 任一 QC 項目未通過，不可宣稱完成。

模式分流（避免混亂）：

1. Mode A：一般對話（不寫檔、不作系統事實宣稱）。
2. Mode B：需證據的回答（先核對，不寫檔）。
3. Mode C：任何寫入/更新/保存（必走完整 5 Gates）。

---

## 核心能力

1. 首次導入：`OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
2. 日常維護：`/gov_migrate`、`/gov_audit`
3. BOOT 升級：`/gov_apply <NN>`
4. 資產部署與更新：`/gov_setup install|upgrade|check`
5. 平台設定安全入口：`/gov_platform_change`

---

## 可靠性契約（重要）

為降低「答錯指令／誤判日期／路徑漂移」風險，本方案採用以下硬規則：

1. 三種運行模式：
   - Mode A：一般對話（不寫檔、不作系統事實宣稱）
   - Mode B：需事實依據的回答（不寫檔）
   - Mode C：任何寫入/更新/保存（必走完整治理流程）
2. OpenClaw 系統題（Mode B2）：
   - 回答前必須先核對本地 skills 與官方文檔（`https://docs.openclaw.ai`）。
   - 若屬「最新版本／最近變更／版本差異」題目，必須再核對官方 Releases（`https://github.com/openclaw/openclaw/releases`）。
   - 若無法完成驗證，必須明確回覆不確定與下一步查證，不可直接推理。
3. 日期時間題（Mode B3）：
   - 回答前必須先核對 runtime 當前時間（session status），並以絕對日期表達結論。
4. 路徑相容：
   - 以 runtime 的 `<workspace-root>` 為準；`~/.openclaw/workspace` 只視為常見預設，不可硬編碼假設。
5. 平台控制面變更：
   - 任何 `~/.openclaw/openclaw.json` 變更都屬 Mode C，必須走完整治理流程。
   - 執行入口必須使用 `gov_platform_change`，並保留備份/驗證/回退證據。
6. BOOT 套用成效：
   - `/gov_apply <NN>` 後要記錄前後指標；若無可衡量改善，結果應標記為 `PARTIAL`，並保留後續修正動作。

---

## 安裝方式

### 方式 A（推薦）：直接安裝 Plugin

1. 首次安裝：

```text
openclaw plugins install @adamchanadam/openclaw-workspace-governance@latest
```

2. 如已安裝，請用更新（不要再用 install）：

```text
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart
```

3. 確認啟用：

```text
openclaw plugins enable openclaw-workspace-governance
```

4. 驗證：

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

首次安裝 plugin 後，在 OpenClaw 對話中執行：

```text
/gov_setup install
```

此命令會把治理核心 prompt 部署到：`<workspace-root>/prompts/governance/`。

若 slash command 不可用或撞名，使用：

```text
/skill gov_setup install
```

說明：`plugins install` 只安裝 plugin 到 extensions；治理 prompts 需由 `gov_setup install` 部署到 `<workspace-root>/prompts/governance/`。

## 已安裝用戶升級（重要）

已在使用本插件的工作區，請先更新 plugin（不是 install）：

```text
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart
```

然後執行：

```text
/gov_setup upgrade
/gov_migrate
/gov_audit
```

## `gov_setup` 三種模式（重要）

`gov_setup` 不只用於首次安裝，亦是後續升級入口：

```text
/gov_setup install   # 首次部署 prompts/governance 資產
/gov_setup upgrade   # 升級已存在資產（先做備份再覆蓋）
/gov_setup check     # 只檢查來源/目標檔案狀態，不寫入
```

若 slash command 不可用，對應 fallback：

```text
/skill gov_setup install
/skill gov_setup upgrade
/skill gov_setup check
```

建議升級路線（plugin 更新後）：
1. `openclaw plugins update openclaw-workspace-governance`
2. `openclaw gateway restart`
3. `gov_setup upgrade`
4. `gov_migrate`
5. `gov_audit`

---

## 新手 UAT：5 分鐘確認治理正在運作（無 slash）

若你的 TUI slash command 有路由問題，可用以下「無 slash」方法驗證。

### Step 1：主機側確認插件和 skills 已載入

```text
openclaw plugins info openclaw-workspace-governance
openclaw skills list --eligible
openclaw skills info gov_setup
openclaw skills info gov_migrate
openclaw skills info gov_audit
openclaw skills info gov_apply
openclaw skills info gov_platform_change
```

### Step 2：在 OpenClaw TUI 送出自然語言（非 slash）

```text
請使用 gov_setup skill 執行 check 模式（只讀，不可修改任何檔案）。
請回覆：
1) 偵測到的 workspace root
2) governance prompts 是否已安裝齊全
3) 是否需要 upgrade（如需要，列出原因）
```

### Step 3：判定是否通過

`gov_setup check` 會出現 3 種狀態：

1. `NOT_INSTALLED`：新機常見狀態（尚未執行 `gov_setup install`）。
2. `PARTIAL`：目標路徑存在，但有缺檔或不同步。
3. `READY`：已安裝齊全。

建議下一步：

1. 若 `NOT_INSTALLED`：先執行 `gov_setup install`。
2. 若 `PARTIAL`：執行 `gov_setup upgrade`。
3. 若 `READY`：可直接進入 `gov_migrate` + `gov_audit`。

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

1. 先在主機端更新 plugin：`openclaw plugins update openclaw-workspace-governance`，再執行 `openclaw gateway restart`。
2. 執行 `/gov_setup upgrade`。
3. 執行 `/gov_migrate`。
4. 執行 `/gov_audit`。
5. 當 BOOT 提供編號提案時，執行 `/gov_apply <NN>`，並在完成後再次執行 `/gov_audit`。
6. 若任務涉及 `~/.openclaw/openclaw.json` 變更，改用 `/gov_platform_change`（或 `/skill gov_platform_change`），不可直接 patch config。

---

## 命令速查

```text
/gov_setup install   # 首次部署治理 prompt 資產
/gov_setup upgrade   # 升級治理 prompt 資產（先備份）
/gov_setup check     # 只檢查，不寫入
/gov_migrate         # 套用治理升級
/gov_audit           # 執行一致性核對
/gov_apply <NN>      # 套用 BOOT 編號提案
/gov_platform_change # 受控平台設定變更（備份/驗證/回退）
```

若 slash command 不可用或撞名，請改用：

```text
/skill gov_setup install
/skill gov_setup upgrade
/skill gov_setup check
/skill gov_migrate
/skill gov_audit
/skill gov_apply 01
/skill gov_platform_change
```

命名說明：本插件只保留一個安裝/部署入口：`gov_setup`。

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
├─ VALUE_POSITIONING_AND_FACTORY_GAP.md
├─ WORKSPACE_GOVERNANCE_README.en.md
├─ VALUE_POSITIONING_AND_FACTORY_GAP.en.md
├─ README.md
├─ README.zh-HK.md
├─ README.en.md
├─ ref_doc/
│  ├─ infograp_eng.png
│  ├─ screen_gov_setup_inst.png
│  └─ page_1.jpg ... page_6.jpg
├─ manual_prompt/
│  ├─ MIGRATION_prompt_for_RUNNING_OpenClaw.md
│  └─ POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md
├─ skills/
│  ├─ gov_setup/SKILL.md
│  ├─ gov_migrate/SKILL.md
│  ├─ gov_audit/SKILL.md
│  ├─ gov_apply/SKILL.md
│  └─ gov_platform_change/SKILL.md
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

### Q8. 更新到新 plugin 版本後，應如何套用到 workspace？
建議固定流程：
1. `openclaw plugins update openclaw-workspace-governance`
2. `openclaw gateway restart`
3. `/gov_setup upgrade` -> `/gov_migrate` -> `/gov_audit`
其中 `upgrade` 會先建立備份，再更新 governance prompts。

### Q9. 回答 OpenClaw 系統問題時，為何要先查官方文檔？
因為此類問題屬於系統事實（例如指令、設定、hooks、skills、plugins）。回答前要先核對 `docs.openclaw.ai`；如涉及最新版本或版本差異，還要核對官方 Releases，避免把過時或錯誤指令寫入系統配置。

### Q10. 為何強調 `<workspace-root>` 而不是固定路徑？
OpenClaw 支援可配置工作區。治理流程以 runtime workspace 為準，兼容官方預設與自訂部署，避免在不同環境出現路徑衝突。

### Q11. 為何我看不到 `/gov_setup`？
先確認你送出的是 command-only 訊息（第一個字就是 `/`，前面不能有空格，也不要加 `run`）。若 slash 仍無法路由，改用手動 prompt 入口（`manual_prompt/`）繼續治理流程。

### Q12. 為何 `openclaw plugins install ...` 後不會自動彈出下一步？
OpenClaw 的 plugin 安裝流程會把套件下載並解壓到 extensions，之後等待 gateway 重載；它不會自動替你執行 `/gov_setup install`。  
最快做法是安裝後立刻執行：
1. `/gov_setup check`（確認狀態）
2. 若顯示 `NOT_INSTALLED`：`/gov_setup install`
3. 完成後：`/gov_migrate` -> `/gov_audit`

### Q13. 我需要改 `~/.openclaw/openclaw.json`，可否直接用 patch 工具？
不建議。這屬平台控制面 Mode C 變更。  
請用 `/gov_platform_change`（或 `/skill gov_platform_change`），確保備份、驗證、回退證據完整。

---

## 官方參考

- Skills: https://docs.openclaw.ai/tools/skills
- ClawHub: https://docs.openclaw.ai/tools/clawhub
- Slash Commands: https://docs.openclaw.ai/tools/slash-commands
- Plugin: https://docs.openclaw.ai/plugins
- Plugin Manifest: https://docs.openclaw.ai/plugins/manifest
- CLI Plugins: https://docs.openclaw.ai/cli/plugins
- CLI Skills: https://docs.openclaw.ai/cli/skills
- OpenClaw Releases: https://github.com/openclaw/openclaw/releases
