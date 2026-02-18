# WORKSPACE_GOVERNANCE（Bootstrap + Migration + Audit + Skills + BOOT Upgrade）— OpenClaw 工作區治理懶人包

## 發佈通道更新（Plugin + ClawHub）

本專案現已提供雙層發佈通道：

1. Plugin（主發佈）：`@adamchanadam/openclaw-workspace-governance`
2. ClawHub Installer（安裝入口）：`clawhub/openclaw-workspace-governance-installer`

建議安裝順序：

1. 安裝並啟用 Plugin。
2. 在 OpenClaw 對話中執行 `gov_setup` 模式：
   - `/gov_setup install`（首次部署）
   - `/gov_setup upgrade`（升級既有治理資產）
   - `/gov_setup check`（只檢查，不寫入）
   由技能自動處理 `<workspace-root>/prompts/governance/`。
3. 依工作區狀態執行 Bootstrap 或 Migration/Audit。

---

## 1) 這是甚麼

WORKSPACE_GOVERNANCE 是一套「固定、可重跑」的工作區治理方法，用於確保 OpenClaw 代理在**需要寫檔／更新文件／保存變更**時，會以一致流程處理，並留下可核對的證據。

OpenClaw 預設使用單一工作區目錄作為代理的工作目錄（workspace/cwd），常見預設為：

* `<workspace-root>/`（由 OpenClaw 配置決定；常見預設是 `~/.openclaw/workspace/`）

> 說明：本文以 `<workspace-root>/` 作抽象路徑；實際路徑請以你的 OpenClaw 設定為準（可在配置中核對 workspace 設定，見註 [5]）。

---

## 2) 為何要用（原因與好處）

很多工作區在長期使用後，容易出現三類問題：

1. **先改後讀**：代理先動手修改，之後才發現規則未讀或理解有偏差，造成重複、矛盾或越界寫檔。
2. **隔日重犯**：對話重置或新 session 後，同類錯誤反覆出現。
3. **改動不可追溯**：缺少備份與改動紀錄，難以說清「改了甚麼、是否一致、能否回退」。

採用本套治理後，工作區會得到：

* **穩定流程**：每次需要寫檔的工作都按同一套步驟執行（見第 3 節）。
* **缺依據即停止**：若必要文件缺失或依據不足，流程會停止，避免「猜測式修正」造成更大混亂。
* **每次改動都可核對**：每次變更都會生成備份與改動紀錄（run report），並為關鍵規則段落生成短識別碼（hash），方便日後快速核對是否一致。

同時，為避免誤會，採用本套治理後**不會強行改動**下列內容：

* `projects/`：既有交付物不會被移動或覆蓋。
* `memory/`、`canvas/` 等：治理目的在於「分工位置＋可追溯流程」，一般不會觸碰其內既有內容。
* `skills/`、`prompts/`：一般只在治理流程文件**明確授權**的範圍內建立/更新治理入口（例如 `gov_*` skills 與 governance prompts），並以「衝突即停止」方式避免覆蓋用戶自訂內容。

---

## 3) 核心流程

🔎 本治理把「描述型 Brain Docs」落實成五個固定步驟（每次寫檔都必須走完）：

1. **PLAN（先列清單）**：先寫清楚打算做甚麼、會讀哪些文件、會改哪些文件、有哪些風險。
2. **READ（先讀依據）**：先讀治理文件與目標檔案，再動手。
3. **CHANGE（按授權最小改動）**：只改被授權的檔案與段落；先備份再修改。
4. **QC（自檢清單）**：用同一份固定檢查清單逐項核對，確保沒有遺漏或漂移。
5. **PERSIST（留下證據）**：寫入 run report（改動紀錄），並更新索引，確保後續可追溯。

> 重點：此流程的目的不是「更技術」，而是把「先後次序」寫死，令工作區在長期使用下仍然可控、可驗證。

### 3.1 核心補強（防虛構、防時間誤判、防路徑漂移）

本治理將常見失誤收斂為可執行規則：

1. Mode A / B / C 分流：
   - Mode A：一般對話（不寫檔、不作系統事實宣稱）
   - Mode B：需事實依據的回答（不寫檔）
   - Mode C：任何寫入/更新/保存（必走 PLAN->READ->CHANGE->QC->PERSIST）
2. Mode B2（OpenClaw 系統題）：
   - 先讀相關本地 skills，再核對官方文檔 `https://docs.openclaw.ai`。
   - 若屬「最新版本／最近變更／版本差異」題目，必須再核對官方 Releases：`https://github.com/openclaw/openclaw/releases`。
   - 不足依據時必須回覆不確定與下一步查證，不可猜測。
3. Mode B3（日期時間題）：
   - 先核對 runtime 當前時間（session status），再以絕對日期表達結論，避免「今日/今年」漂移誤判。
4. 路徑相容契約：
   - 一律以 runtime `<workspace-root>` 為準。
   - `~/.openclaw/workspace` 只是常見預設，不是硬編碼依據。
5. BOOT 套用成效：
   - `/gov_apply <NN>` 後必須記錄前後指標；若沒有可衡量改善，結果只能標記 `PARTIAL`，不可宣稱完全解決。

---

## 4) 本套件是甚麼（實際檔案＋精確路徑）

### 4.1 套件放置位置（建議固定）

建議把治理相關文件放在：

* `<workspace-root>/prompts/governance/`

同時，治理的「日常入口」以 skills 形式放在：

* `<workspace-root>/skills/`（或 workspace 指定的 skills 目錄）

> **重要：Slash Commands（官方兼容）**
> - 建議以「獨立訊息」送出斜線指令（訊息內容只包含 `/command ...`）。
> - `user-invocable` skill 會暴露成 slash command；如撞名會自動加後綴（例如 `_2`）。
> - 如斜線指令不可用，使用 `/skill <name> [input]` 作後備；或用 prompts/governance 內的手動入口。

### 4.2 套件文件清單（最少必備）

以下為「建議最少集合」，按情境增減（見第 6 節）：

**A. 必備（新裝／首次導入治理）**

1. `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`（全新工作區／首次套用：建立治理結構與控制面文件；同時提供 canonical payload）
2. `WORKSPACE_GOVERNANCE_MIGRATION.md`（Migration 的流程規格；workflow SSOT）
3. `APPLY_UPGRADE_FROM_BOOT.md`（BOOT 升級套用 runner；用於 `/gov_apply <NN>`）

**B. 建議（提升新手可用性：三條指令入口）**
4. `skills/gov_migrate/SKILL.md`（提供 `/gov_migrate`）
5. `skills/gov_audit/SKILL.md`（提供 `/gov_audit`）
6. `skills/gov_apply/SKILL.md`（提供 `/gov_apply <NN>`）

**C. 可選（自動化提醒／提案：只讀）**
7. `BOOT.md`（放在 workspace 根目錄；配合 `boot-md` hook 於 gateway 啟動時執行；建議只做「只讀核對/提醒＋產生編號升級建議」）

**D. 可選（fallback／救援入口：仍可用但不再是日常主要入口）**
8. `manual_prompt/MIGRATION_prompt_for_RUNNING_OpenClaw.md`（已運作工作區：手動執行 Migration 的入口指令，供無 skills/slash command 或故障時使用）
9. `manual_prompt/POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md`（Migration 後：手動只讀核對入口，供無 skills/slash command 或故障時使用）

---

## 5) 套用治理後的完整目錄結構（透明展示）

以下為建議/預期工作區結構（以 `<workspace-root>/` 為例）：

```text
<workspace-root>/
├─ AGENTS.md
├─ README.md                         (可選)
├─ BOOT.md                           (可選；配合 boot-md：只讀提醒/提案)
├─ _control/                         (治理控制面：規則、QC、索引、決策、教訓)
│  ├─ GOVERNANCE_BOOTSTRAP.md
│  ├─ PRESETS.md
│  ├─ REGRESSION_CHECK.md
│  ├─ WORKSPACE_INDEX.md
│  ├─ DECISIONS.md
│  ├─ LESSONS.md
│  ├─ RULES.md
│  └─ ACTIVE_GUARDS.md
├─ _runs/                            (每次治理/遷移/套用的 run report)
├─ docs/                             (長文說明/操作手冊；非治理正本)
├─ projects/                         (持久交付物：代碼/方案/文件)
├─ skills/                           (治理入口＋其他技能)
│  ├─ gov_migrate/
│  │  └─ SKILL.md                    (/gov_migrate)
│  ├─ gov_audit/
│  │  └─ SKILL.md                    (/gov_audit)
│  └─ gov_apply/
│     └─ SKILL.md                    (/gov_apply <NN>)
├─ prompts/
│  └─ governance/
│     ├─ OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md
│     ├─ WORKSPACE_GOVERNANCE_MIGRATION.md
│     ├─ APPLY_UPGRADE_FROM_BOOT.md
│     ├─ manual_prompt/MIGRATION_prompt_for_RUNNING_OpenClaw.md  (可選 fallback)
│     ├─ manual_prompt/POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md (可選 fallback)
│     └─ WORKSPACE_GOVERNANCE_README.md                          (本文件；可選)
├─ memory/                           (如啟用 session-memory hook：存放記錄)
├─ canvas/                           (如使用 canvas：工具管理產物)
└─ archive/                          (各類備份：bootstrap/migration/platform 等)
```

補充說明：

* `projects/`：放交付物；治理/遷移流程不應隨意改動此目錄內容。
* `skills/`、`prompts/`：屬於「入口與規格資產」。治理只在授權下建立必要入口（例如 `gov_*`）及規格文件，並以「衝突即停止」保護用戶既有內容。

---

## 6) 安裝與使用（三種情境，一次講清）

🔎 最大升級：日常操作改為三條 skills 指令（新手只需記住：**migrate / audit / apply**）。

命名說明：安裝/部署入口只保留 `gov_setup`，避免多入口造成混淆。

`gov_setup` 模式說明（對外推薦）：
- `install`：首次導入（建立目標資料夾並部署治理 prompts）
- `upgrade`：升級既有治理 prompts（先備份再更新）
- `check`：檢查來源與目標檔案狀態（不寫檔）

> 補充（可驗證）：
>
> * `/gov_*` 是否可用＝取決於 該 skill 是否 `user-invocable` 並成功載入；撞名時會自動加 `_2` 後綴，仍可用 `/skill <name>` 直接呼叫。 ([OpenClaw][1])
> * 主機側亦可用 `openclaw skills list --eligible` / `openclaw skills check` 核對是否有效(eligible)。 ([OpenClaw][1])

### UAT 快速驗證（無 slash，適合新手）

若 TUI 的 slash command 路由不穩，建議用以下方式先驗證 governance 是否已運作：

1. 主機側先確認 plugin/skills 已載入：
   - `openclaw plugins info openclaw-workspace-governance`
   - `openclaw skills list --eligible`
   - `openclaw skills info gov_setup`
2. 在 OpenClaw 對話貼上自然語言（非 slash）：
   - 「請使用 gov_setup skill 執行 check 模式（只讀，不可修改任何檔案）。請回覆：1) workspace root、2) governance prompts 是否已安裝齊全、3) 是否需要 upgrade（如需要請說明原因）。」
3. 判定通過標準（3 項都要有）：
   - 有明確 workspace root 路徑
   - 顯示治理 prompts（含 `manual_prompt/`）已安裝
   - 明確說明 upgrade 決策與原因

通過後再進入 Migration/Audit 日常流程，可有效降低誤判與跳步風險。

### A) 全新 OpenClaw／全新工作區（新開局：Bootstrap）

最短流程：

1. 確認 workspace 根目錄（以你的 OpenClaw 設定為準；可到 `~/.openclaw/openclaw.json` 核對）。
2. 建立資料夾：`<workspace-root>/prompts/governance/`
3. 放入必備文件（第 4.2 節 A）及建議 skills（第 4.2 節 B）。
4. 在 OpenClaw 對話中執行（把檔案內容作為指令提交）：

   * `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`

完成後（新手驗收）：

* 以 `/gov_audit` 做一次只讀核對（如 `/gov_audit` 不見或撞名，改用 `/skill gov_audit`；或用主機側 `openclaw skills list --eligible` 核對）。 ([OpenClaw][1])

補充：若 slash 路由異常，改用手動 prompt 入口（`manual_prompt/`）繼續流程。

---

### B) 已運作的 OpenClaw（未用 WORKSPACE_GOVERNANCE：首次導入）

目標：不破壞既有 `projects/` 與工作成果，只把治理控制面與入口「加進來」。

建議流程：

1. 把第 4.2 節 A + B 的文件放入對應位置（`prompts/governance/` 及 `skills/gov_*/`）。
2. 在 OpenClaw 對話中執行：

   * `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
3. 完成後立刻執行：

   * `/gov_audit`（或 `/skill gov_audit`）作只讀核對，確保控制面文件與索引一致。

> 如果因為環境限制未能使用 `/gov_*`：
> 改用 fallback：`prompts/governance/manual_prompt/POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md` 作只讀核對（此檔仍保留可用）。

---

### C) 已運作的 OpenClaw（已安裝 WORKSPACE_GOVERNANCE：做 Migration 升級）

固定兩步（新手只需照做）：

**Step 1：Migration（套用升級）**

* 若剛更新 plugin 版本，先執行 `/gov_setup upgrade`（或 `/skill gov_setup upgrade`）。
* 然後執行：以獨立訊息送出 `/gov_migrate`；如不可用，改用 `/skill gov_migrate`。

**Step 2：Audit（只讀核對是否一致）**

* 執行：以獨立訊息送出 `/gov_audit`；如不可用，改用 `/skill gov_audit`。

> 如果因為環境限制未能使用 `/gov_*`：
> 改用 fallback：`prompts/governance/manual_prompt/MIGRATION_prompt_for_RUNNING_OpenClaw.md` → 再 `prompts/governance/manual_prompt/POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md`。

---

## 7)（可選）BOOT 從錯誤中成長：啟動只讀提案 → 編號升級 → 受控套用

🔎 BOOT 的定位：**自動偵測＋自動整理提案**；實際改動由用戶以編號受控觸發（避免啟動時自動寫檔風險）。

### 7.1 BOOT 能做到甚麼（非技術人士也用得到）

當 `boot-md` 啟用後，gateway 啟動時會執行 workspace 根目錄的 `BOOT.md`。 ([OpenClaw][4])
建議 `BOOT.md` 只做：

* 讀取最近 N 份 `_runs/`、`_control/ACTIVE_GUARDS.md`、`_control/LESSONS.md` 等
* 輸出「可讀、帶編號」的升級建議（例如 01/02/03）
* 每條建議附一個「建議採用的升級路徑」（例如：升級 Guard、補 QC、更新 canonical 段落）

### 7.2 用戶如何套用升級（只輸入編號）

當 BOOT 報告提供了編號清單後：

* 用戶只需提供編號：`01`（例如輸入「我批准 01」）
* 觸發方式：以獨立訊息送出 `/gov_apply 01`；如不可用，改用 `/skill gov_apply 01`。
* runner 會引導套用該條建議（受控、可追溯），並在需要時串接 migration + audit（以保持治理一致性）
* 套用後需比對前後指標；若改善未達可衡量門檻，應標記為 `PARTIAL` 並安排下一輪修正。

> `/gov_apply` 來自 user-invocable skill；若撞名或平台限制，仍可用 `/skill gov_apply 01`。 ([OpenClaw][1])

### 7.3 啟用 `boot-md`（需要主機側 CLI）

* 啟用：`openclaw hooks enable boot-md`
* 檢查 eligibility：`openclaw hooks list --verbose`（可顯示缺失要求） ([OpenClaw][4])

---

## 8) 風險與建議（實際操作）

* 檔案缺失或路徑錯誤：流程應停止（避免亂改）。
* 人手改動治理核心段落：Audit 會指出不一致並要求以規格正本修復。
* **不要在 BOOT 啟動階段自動寫檔**：建議只讀＋提案；套用交由 `/gov_apply <NN>` 受控觸發。
* 指令不可用／撞名：

  * 撞名時 slash command 會自動加後綴（例如 `_2`）；仍可用 `/skill <name>` 直呼叫。 ([OpenClaw][2])
  * 以主機側 `openclaw skills list --eligible` / `openclaw skills check` 核對 skills 是否 eligible。 ([OpenClaw][1])

---

## 9) 術語小註解（最少必要）

* Workspace：代理唯一工作目錄（由 OpenClaw 設定決定，可配置）。
* `BOOT.md`：放在 workspace 根目錄；可被 `boot-md` hook 於 gateway 啟動時讀取執行（建議只讀）。 ([OpenClaw][4])
* Skills：以 `SKILL.md` 描述的能力模組；`user-invocable` skills 會暴露成 slash command。 ([OpenClaw][1])
* Slash commands：`/commands` 可查看原生命令；skill 亦可作為 slash commands；撞名會加數字後綴；`/skill <name> [input]` 可作 fallback。 ([OpenClaw][2])
* Migration：按 workflow SSOT 授權做最小改動，並寫入備份與 run report。
* Audit：只讀核對（固定檢查清單），用作「是否一致」的可驗證結論。


## 參考索引

- Skills（技能規格／載入與優先序）：[OpenClaw][1]
- Slash Commands（`/skill`、skill 指令命名、及 command-only vs inline 行為）：[OpenClaw][2]
- BOOT.md 模板（boot-md 的 BOOT.md 入口）：[OpenClaw][3]
- Hooks CLI（啟用 boot-md 等 hooks）：[OpenClaw][4]
- Configuration Reference（常見設定與對照）：[OpenClaw][5]
- ClawHub（技能註冊庫／分享與版本管理）：[OpenClaw][6]
- OpenClaw Releases（官方版本與更新紀錄）：[OpenClaw][7]

[1]: https://docs.openclaw.ai/tools/skills
[2]: https://docs.openclaw.ai/tools/slash-commands
[3]: https://docs.openclaw.ai/reference/templates/BOOT
[4]: https://docs.openclaw.ai/cli/hooks
[5]: https://docs.openclaw.ai/gateway/configuration-reference
[6]: https://docs.openclaw.ai/tools/clawhub
[7]: https://github.com/openclaw/openclaw/releases



