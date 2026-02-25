# OpenClaw WORKSPACE_GOVERNANCE

> 讓 OpenClaw 保持日常高效率，同時避開高成本失誤：改動不透明、升級風險高、出錯難回復。
> WORKSPACE_GOVERNANCE 為長期運行的 OpenClaw 工作區提供穩定的操作模型。

[English Version](./README.md)

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-0ea5e9)](https://docs.openclaw.ai/) [![Distribution](https://img.shields.io/badge/Distribution-Plugin%20%2B%20ClawHub-22c55e)](#install) [![Audience](https://img.shields.io/badge/Audience-Beginners-f59e0b)](#quick-start)

ClawHub 安裝頁：
- https://clawhub.ai/Adamchanadam/openclaw-workspace-governance-installer

---

## 📋 Release Notes 最新 3 版重點報告板

| 版本 | 發佈時間（UTC） | 關鍵變更 | 對使用者的直接影響 |
| --- | --- | --- | --- |
| `v0.1.54` | 2026-02-25 | 修正 `gov_brain_audit` 誤報：唯讀 audit run reports（audit/preview/scan）不再觸發 `COMPLETION_WITHOUT_EVIDENCE`；WARN/BLOCKED 下一步指引現在顯示實際 finding IDs；回歸測試 104/104 | 從 v0.1.53 升級的其他 runtime 不再看到來自 audit 報告的虛假 HIGH findings；操作者可直接複製正確的 APPROVE 指令 |
| `v0.1.53` | 2026-02-25 | `/gov_help` 重新設計：ASCII art 品牌橫幅 + 完整 9 指令目錄；README 指令排序對齊；章節標題加入 emoji；ROOT SPRAWL 回歸修正（temp workspace chain tests）；回歸測試 103/103 | 用戶一眼看到全部指令目錄與品牌橫幅；emoji 標題加速 README 導覽；所有產品介面顯示一致的指令排序 |
| `v0.1.52` | 2026-02-24 | 偵測邏輯強化：`gov_uninstall` 現在偵測全部 8 個 `_control/` 檔案引用（舊版只查 3 個）；發佈管道新增 `PLUGIN_VERSION` 常數對齊閘門；重構 brain-doc 掃描邏輯；回歸測試擴展至 100/100 | 卸載檢查/清理現在能捕捉到之前遺漏的治理殘留（如 `_control/ACTIVE_GUARDS.md` 引用）；機器閘門防止未來版本號不對齊 |

來源：GitHub Releases（`Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE`）

---

## 🎯 Hero

如果你每天使用 OpenClaw，最大風險通常不是模型能力不足，而是操作漂移：你很難快速知道改了什麼、下一步該跑哪條指令、升級動作是否安全。WORKSPACE_GOVERNANCE 的作用，就是把這種不確定感轉成可重覆執行的流程。

[Install](#install) | [Quick Start](#quick-start)

## 💡 Why This Matters

沒有治理機制時，常見痛點會快速累積：
1. 還未核實就先改檔——錯誤在被發現前已擴散到多個檔案。
2. plugin 更新完成後，你仍不知道下一步該跑什麼、更新是否完整。
3. 出事時，缺乏清晰記錄可查什麼被改過、如何安全回退。
4. 團隊交接時缺少脈絡——接手人無法得知已做過什麼、什麼通過了驗證、還有什麼待處理。

你會立即得到：
1. 每次改動都遵循固定安全流程：先規劃、再讀取證據、做最小改動、驗證、最後留存記錄。
2. 一條指令就能啟動：`/gov_setup quick` 會自動完成 check、install/upgrade、migrate、audit。
3. 平台設定改動自帶備份、驗證與回退——不再有高風險手動直改。
4. run report 與 audit 證據讓團隊交接與責任歸屬變得簡單。

## ✅ 功能成熟度（不誤導聲明）

GA（正式可落地）：
1. `/gov_help` — 一次列出全部指令與建議入口
2. `/gov_setup quick|check|install|upgrade` — 一步完成治理部署、升級或驗證
3. `/gov_migrate` — install 或 upgrade 後，將工作區行為對齊最新治理規則
4. `/gov_audit` — 驗證 12 項完整性核對，在宣稱完成前捕捉漂移
5. `/gov_uninstall quick|check|uninstall` — 安全清理，含備份與回復證據
6. `/gov_openclaw_json` — 安全編輯平台設定（`openclaw.json`），含備份、驗證與回退
7. `/gov_brain_audit` — 預覽優先、批准後套用、可回退的 Brain Docs 品質修補
8. `/gov_boot_audit` — 掃描重覆問題並生成升級提案（只讀診斷）

Experimental（實驗性）：
1. `/gov_apply <NN>` — 以人工明確批准的方式套用單一 BOOT 升級提案（僅限受控測試，已納入自動化回歸驗證）。
2. 套用後，務必以 `/gov_migrate` 與 `/gov_audit` 收尾。

## 🖼️ Visual Walkthrough（ref_doc）

![OpenClaw WORKSPACE_GOVERNANCE Infographic](./ref_doc/infograp_eng.png)
![gov_setup quick 畫面](./ref_doc/screen_gov_setup_quick.png)
![Page 1](./ref_doc/page_1.jpg)
![Page 2](./ref_doc/page_2.jpg)
![Page 3](./ref_doc/page_3.jpg)
![Page 4](./ref_doc/page_4.jpg)
![Page 5](./ref_doc/page_5.jpg)
![Page 6](./ref_doc/page_6.jpg)

<a id="install"></a>
## 🚀 60-Second Start

### 最快入口（建議）
在 OpenClaw TUI 直接輸入：
```text
/gov_help
/gov_setup quick
```
`/gov_setup quick` 會自動跑：
`check -> (install|upgrade|skip) -> migrate -> audit`
若中途受阻，會直接回傳單一步下一步指令。

### 共用 Allowlist 快速修復
只在出現 `Error: not in allowlist` 時使用。

```text
openclaw config get plugins.allow
openclaw configure
# 在 plugins.allow 追加 openclaw-workspace-governance，並保留所有原有 trusted IDs。
openclaw plugins enable openclaw-workspace-governance
openclaw gateway restart
```
編輯 allowlist 陣列時，請保留你原有的 trusted IDs。

### 新裝路徑（可直接照抄）
1. 主機終端先執行：
```text
openclaw plugins install @adamchanadam/openclaw-workspace-governance@latest
openclaw gateway restart
```
2. 信任模型檢查（必要）：
部分 OpenClaw 版本在 install 時，不會自動把新 plugin 加入 `plugins.allow`。
如果 `openclaw plugins info openclaw-workspace-governance` 顯示 `Error: not in allowlist`，請先執行上面的「共用 Allowlist 快速修復」。
3. OpenClaw TUI 對話中執行：
```text
/gov_setup quick
```
4. 若回覆顯示信任清單未就緒（例如出現 `plugins.allow is empty`，或提示要先對齊 `openclaw.json`），執行：
```text
/gov_openclaw_json
/gov_setup quick
```
5. 若需要嚴格逐步（或操作者要求 step-by-step），再用：
```text
/gov_setup install
prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md
# 若是已在運作中的既有 workspace 才需要：
/gov_migrate
/gov_audit
```

### 已安裝升級路徑（可直接照抄）
1. 主機終端先執行：
```text
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart
```
2. 若 plugin 顯示 `Error: not in allowlist`，請先執行上面的「共用 Allowlist 快速修復」。
3. OpenClaw TUI 對話中執行：
```text
/gov_setup quick
```
4. 若回覆顯示信任清單未就緒，執行：
```text
/gov_openclaw_json
/gov_setup quick
```
5. 若需要嚴格逐步（或操作者要求 step-by-step），再用：
```text
/gov_setup upgrade
/gov_migrate
/gov_audit
```

### 正式清理卸載路徑（可直接照抄）
不要先刪 plugin 套件，請先做 workspace 清理。

1. 先確保 plugin 已允許且可載入（否則 `/gov_uninstall` 無法執行）：
```text
openclaw plugins info openclaw-workspace-governance
```
若顯示 `Error: not in allowlist`，先執行上面的「共用 Allowlist 快速修復」。
2. 在 OpenClaw TUI 對話中執行：
```text
/gov_uninstall quick
# 如需嚴格驗證可再跑：
/gov_uninstall check
```
預期結果：
- quick：`PASS` 或 `CLEAN`
- 如有再跑 check：應為 `CLEAN`

3. 然後再移除 plugin 套件：
```text
openclaw plugins disable openclaw-workspace-governance
openclaw plugins uninstall openclaw-workspace-governance
openclaw gateway restart
```
卸載 runner 會先備份到 `archive/_gov_uninstall_backup_<ts>/...`，並寫出 run report：`_runs/gov_uninstall_<ts>.md`。
如存在 Brain Docs autofix 備份（`archive/_brain_docs_autofix_<ts>/...`），`/gov_uninstall` 會輸出並執行對應回復策略（含證據欄位）。

若你已經先卸載 plugin 套件：
1. 先重裝 plugin（令 `/gov_uninstall` 可用）
2. 跑 `/gov_uninstall check` -> `/gov_uninstall uninstall` -> `/gov_uninstall check`
3. 需要時再停用/卸載 plugin 套件

<a id="quick-start"></a>
## 🧭 Command Chooser（指令選擇器）

| 你的目標 | 先執行 | 再執行 | 對使用者的具體價值 |
| --- | --- | --- | --- |
| 一次列出全部治理指令 | `/gov_help` | 再選 quick 或手動流程 | 用戶無需先讀文檔或記指令 |
| 一鍵完成治理部署/升級+稽核 | `/gov_setup quick` | 若 blocked 才跟下一步指示 | 自動串 check/install-or-upgrade/migrate/audit，減少操作負擔 |
| 在任何改動前先確認正確路徑（手動） | `/gov_setup check` | 依回覆下一步執行 | 把不確定轉為明確行動，避免新手走錯 install/upgrade 分支 |
| 首次部署治理到工作區 | `/gov_setup install` | `/gov_migrate` -> `/gov_audit` | 先部署治理套件檔，再由 migration 決定性補齊缺失的 `_control` 基線檔 |
| 升級既有治理工作區 | `/gov_setup upgrade` | `/gov_migrate` -> `/gov_audit` | 同步治理檔版本與策略，並在變更後完成驗證 |
| 一鍵清理 workspace 治理殘留 | `/gov_uninstall quick` | 可選再跑 `/gov_uninstall check` | 以最少步驟完成安全清理，保留備份/回復證據 |
| 先清除平台信任警告再進治理流程 | `/gov_openclaw_json` | `/gov_setup check` | 避免後續因信任未對齊而失敗，提供單一路徑完成信任對齊 |
| 安全修改 OpenClaw 平台控制面 | `/gov_openclaw_json` | `/gov_audit` | 以備份/驗證/回退取代高風險直改，讓平台變更可恢復 |
| 低風險優化 Brain Docs 品質 | `/gov_brain_audit` | 批准 findings -> `/gov_audit` | 檢出高風險語句、保留人設方向，僅批准後套用且可回退 |
| 掃描重覆問題並取得升級提案 | `/gov_boot_audit` | 審閱提案 -> `/gov_apply <NN>`（Experimental） | 只讀掃描找出重覆問題並生成編號提案，你可先審閱再決定是否套用 |
| 套用單一 BOOT 提案項目（Experimental） | `/gov_apply <NN>` | `/gov_migrate` -> `/gov_audit` | 只執行單一人手批准項目，適用受控 UAT；不可視為無人值守 GA 自動化 |

## 🧠 核心能力：`/gov_brain_audit` 如何優化 Brain Docs 效能

`/gov_brain_audit` 不只是文字檢查，它會提升 OpenClaw agent 的運作品質，讓 Brain Docs 更一致、可驗證、較少自我矛盾。

實際優化效果：
1. 減少「先行動後核實」語句，降低寫入任務失穩風險。
2. 減少「無證據下過度肯定」語句，降低假完成回覆。
3. 強化 Brain Docs 與 run-report 證據要求的一致性。
4. 以最小差異修補，保留原有 persona 方向。

重要說明：
`F001`、`F003` 等是當次 preview 產生的動態 finding ID。
它們只是示例，不是固定代碼。請以最新 preview 輸出的 IDs 為準。

執行模式：
```text
/gov_brain_audit
/gov_brain_audit APPROVE: <PASTE_IDS_FROM_PREVIEW>
/gov_brain_audit ROLLBACK
```

## ⚙️ 你的請求如何被處理

治理機制會自動適配你的請求類型：

1. 提問與規劃（不改檔案）
   你詢問策略、說明或規劃。AI 只提供建議——不動任何檔案。

2. 需要可驗證的回答（不改檔案）
   你詢問版本、系統狀態或日期。AI 會先查證官方來源，再以證據作答。

3. 改動檔案（完整治理保護）
   你要求寫入、更新或保存檔案。AI 會走完整安全流程：先規劃、讀取證據、做最小改動、驗證品質，最後留存 run report。需要時以 `/gov_migrate` 與 `/gov_audit` 收尾。

## 🔒 安全預設

1. 治理工具只在你明確請求時才啟動（透過 `/gov_*` 或 `/skill gov_*`）。它們不會自行執行。
2. 這能防止意外觸發——如果你只是聊天或使用一般 OpenClaw 功能，治理工具不會介入。
3. 你原有的 OpenClaw 工作方式完全不受影響。治理是額外的保護層，不改變你現有的使用方式。

## ❓ FAQ（新手決策導向，10 題）

1. 我平時不會用 slash，第一句最安全怎樣講？
可直接貼這句自然語言：
```text
請先在此工作區做 governance readiness check（只讀），然後只告訴我下一步要跑什麼。
```
若需 slash 備援：`/gov_setup quick`

2. 我剛跑完官方指令（例如 `openclaw onboard` / `openclaw configure`）後，governance 好像被擋，應該怎樣叫 AI？
可直接貼：
```text
我剛執行了官方 OpenClaw 初始化/設定指令。請重新檢查 governance readiness，若有需要請對齊 openclaw.json 的信任 allowlist，然後告訴我精確下一步。
```
若需 slash 備援：
```text
/gov_openclaw_json
/gov_setup quick
```

3. Plugin 已安裝，但工作區仍未見治理檔案，我應該怎樣下指令？
可直接貼：
```text
請檢查這個 workspace 的 governance 狀態，安全部署缺少的治理檔案，最後執行 audit。
```
若需 slash 備援：
```text
/gov_setup check
/gov_setup install
/gov_migrate
/gov_audit
```

4. Plugin 已更新，但行為仍像舊版，應該怎樣叫 AI 跑完整流程？
可直接貼：
```text
請在此工作區執行 governance 升級流程：check、upgrade、migrate、最後 audit。
```
若需 slash 備援：
```text
/gov_setup check
/gov_setup upgrade
/gov_migrate
/gov_audit
```

5. 出現 `Blocked by WORKSPACE_GOVERNANCE runtime gate...`，是不是故障？
通常不是。先要求 AI 補齊證據再重試：
```text
請先輸出此寫入任務的 PLAN 與 READ 證據，包含 WG_PLAN_GATE_OK 與 WG_READ_GATE_OK，然後再繼續。
```
官方 `openclaw ...` 系統指令預設允許，不應被此 runtime gate 誤擋。

6. 我只想改 `openclaw.json`，不想動 workspace 文檔，怎樣講最清楚？
可直接貼：
```text
請只修改 OpenClaw 控制面設定（openclaw.json），要有備份與驗證，完成後回報結果。
```
若需 slash 備援：
```text
/gov_openclaw_json
/gov_audit
```

7. 這個 session 的 slash 路由不穩，我可以全程用自然語言嗎？
可以，直接用：
```text
請用 gov_setup 的 check 模式，回覆 status 與 next action。
```
或：
```text
請在此 workspace 跑完整 governance upgrade flow，並逐步回報每一步結果。
```

8. 我以自然語言下 coding 任務時，如何減少 governance block？
在任務開頭加上：
```text
改檔前先給我 PLAN 與 READ 證據，再做最小改動，最後附 QC 證據。
```

9. 我想優化 Brain Docs，不只是改字面，應該怎樣下指令？
可直接貼：
```text
請先以 gov_brain_audit 做 preview，列出高風險 findings 與原因；未經我批准不可套用 patch。
```
批准與回退備援：
`<PASTE_IDS_FROM_PREVIEW>` 代表「貼上你當次 preview 的 finding IDs」（例如 `F002,F005`）。
```text
/gov_brain_audit APPROVE: <PASTE_IDS_FROM_PREVIEW>
/gov_brain_audit ROLLBACK
```

10. 團隊在自然語言任務完成後，如何標準化交接？
收尾可直接貼：
```text
請用 governance 收尾此任務：如有需要先 migrate，再做 audit，最後輸出可交接的證據摘要。
```

## 📚 Deep Docs Links

1. Operations 手冊（EN）: [`WORKSPACE_GOVERNANCE_README.en.md`](./WORKSPACE_GOVERNANCE_README.en.md)
2. Positioning 與價值定位（EN）: [`VALUE_POSITIONING_AND_FACTORY_GAP.en.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md)
3. Operations 手冊（繁中）: [`WORKSPACE_GOVERNANCE_README.md`](./WORKSPACE_GOVERNANCE_README.md)
4. Positioning 與價值定位（繁中）: [`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)

官方參考：
1. https://docs.openclaw.ai/tools/skills
2. https://docs.openclaw.ai/tools/clawhub
3. https://docs.openclaw.ai/plugins
4. https://docs.openclaw.ai/cli/plugins
5. https://docs.openclaw.ai/cli/skills
6. https://github.com/openclaw/openclaw/releases

