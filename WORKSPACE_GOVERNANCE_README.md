# WORKSPACE_GOVERNANCE 操作手冊（繁體中文）

> 本文是操作手冊（流程與步驟）。
> 首頁總覽請見：[`README.zh-HK.md`](./README.zh-HK.md)
> 定位與出廠差異請見：[`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)

---

## 1) 用途

本文用於「需要可重覆執行的實務流程」情境。

涵蓋內容：
1. 安裝與升級路徑
2. 日常治理流程
3. 平台設定安全修改
4. BOOT 受控套用（Experimental）
5. UAT 與故障排查

---

## 2) 開始前檢查

1. Plugin 套件：
   - `@adamchanadam/openclaw-workspace-governance`
2. 必備 skills：
   - GA：`gov_setup`、`gov_migrate`、`gov_audit`、`gov_openclaw_json`、`gov_brain_audit`、`gov_uninstall`
   - Experimental：`gov_apply`
3. 內建指令清單入口：
   - `gov_help`（一次列出指令 + 一鍵入口建議）
4. 如 slash 路由不穩，改用 `/skill ...`。

主機端檢查：

```text
openclaw plugins info openclaw-workspace-governance
npm view @adamchanadam/openclaw-workspace-governance version
openclaw skills list --eligible
```

---

## 3) 固定執行順序

任何寫入/更新/保存任務都必須按以下次序：
1. `PLAN`
2. `READ`
3. `CHANGE`
4. `QC`
5. `PERSIST`

Fail-Closed 原則：
1. 缺證據或路徑不明確時，必須停止
2. 任一 QC 未通過，不可宣稱完成

操作輸出格式（v0.1.50 品牌化）：
```
🐾 OpenClaw Governance · v0.1.50
─────────────────────────────────

✅  STATUS
PASS

  • 項目一
  • 項目二

─────────────────────────────────
👉 下一步操作指引。

  /gov_setup quick
```
狀態前綴：✅ PASS/READY/CLEAN、⚠️ WARNING/PARTIAL、❌ BLOCKED/FAIL、ℹ️ 其他

---

## 4) Mode 分流

1. Mode A：一般對話（不寫檔、不作系統事實宣稱）
2. Mode B：需證據回答（不寫檔）
3. Mode C：任何寫入/更新/保存（必走完整 5 gates）
   - 包括寫程式任務（例如 build/fix/refactor/implement）只要會改檔，一律屬 Mode C

補充規則：
1. OpenClaw 系統題：先核對本地 skills + `https://docs.openclaw.ai`
2. 版本敏感題：再核對 `https://github.com/openclaw/openclaw/releases`
3. 日期時間題：先核對 runtime 當前時間，再用絕對日期作答
4. Brain Docs 只讀題：先讀精確目標檔案
5. Brain Docs 寫入題：Mode C + run report 必須有 `FILES_READ` + `TARGET_FILES_TO_CHANGE`

工具暴露 root-fix（安全預設）：
1. 治理 plugin tools 只會在當前回合出現明確 `/gov_*`（或 `/skill gov_*`）意圖時執行。
2. 這個 fail-closed 行為可在 permissive tool-policy contexts 下縮小 untrusted-input 觸發面。
3. 這不會取代一般 OpenClaw 使用；沒有明確治理意圖時，治理工具不會自動執行。

---

## 5) 檔案範圍地圖（重要）

1. 工作區治理文件：
   - `<workspace-root>/prompts/governance/`
   - 由 `gov_setup install|upgrade|check` 管理
2. 平台控制面：
   - `~/.openclaw/openclaw.json`
   - `~/.openclaw/extensions/`（僅在明確需要時）
   - 由 `gov_openclaw_json` 管理
3. Brain Docs：
   - `USER.md`、`IDENTITY.md`、`TOOLS.md`、`SOUL.md`、`MEMORY.md`、`HEARTBEAT.md`、`memory/*.md`
   - 不屬 `gov_openclaw_json` 範圍
   - 建議以 `gov_brain_audit` 單一入口執行（預設預覽，批准後才套用或回退）

---

## 6) 標準操作流程

### 指令價值地圖（決策輔助）

| 指令 | 何時使用 | 立即價值 |
| --- | --- | --- |
| `gov_help` | 需要即場查看全部治理指令 | 用戶無需背指令，直接選擇一鍵或手動流程 |
| `gov_setup quick` | 日常 install/upgrade 的預設入口 | 一鍵自動串：check -> install/upgrade/skip -> migrate -> audit |
| `gov_setup check` | 任何 install/upgrade 前 | 直接給出狀態、信任清單就緒度與下一步，避免憑感覺操作 |
| `gov_setup install` | 此工作區首次部署治理 | 一次建立治理基線檔案，避免手動遺漏 |
| `gov_setup upgrade` | 已有治理檔案但需升到最新 | 更新治理包內容，同時保留前置檢查與安全邏輯 |
| `gov_migrate` | install/upgrade 後需做策略對齊 | 讓既有工作區行為對齊新治理規則 |
| `gov_audit` | 變更後、宣稱完成前 | 以固定清單驗證證據，及早發現漂移 |
| `gov_openclaw_json` | 需改平台控制面（`openclaw.json`/extensions） | 以備份/驗證/回退路徑進行最小改動 |
| `gov_apply <NN>`（Experimental） | BOOT 已產生編號提案且人類已批准（受控 UAT） | 保留人工批准的單項套用路徑；不可當作無人值守 GA 自動化 |
| `gov_brain_audit` | 需審核或修補 Brain Docs 風險語句 | 語義優先預覽、批准後才套用、可回退 |
| `gov_uninstall quick` | 卸載前需安全清理 workspace 治理內容 | 一鍵自動串：check -> uninstall（含備份/回復證據） |

### 共用信任對齊分支（當 `gov_setup check` 回覆 allowlist/trust 未就緒時使用）

```text
/gov_openclaw_json
/gov_setup check
```

### A) 全新 OpenClaw / 全新工作區

1. 安裝 plugin
2. `gov_setup quick`（預設一鍵路徑）
3. 若回覆顯示 allowlist 未就緒：先跑上面的共用信任對齊分支。
4. 若操作者要求逐步，改用手動鏈：
   - `gov_setup check` -> `gov_setup install` -> `gov_migrate` -> `gov_audit`

### B) 已運作工作區，首次導入治理

1. 安裝並啟用 plugin
2. `gov_setup quick`（預設一鍵路徑）
3. 若回覆顯示 allowlist 未就緒：先跑上面的共用信任對齊分支。
4. 若操作者要求逐步，改用手動鏈：
   - `gov_setup check` -> `gov_setup install` -> `gov_migrate` -> `gov_audit`

### C) 已安裝治理（日常維護）

1. 主機端：

```text
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart
```

2. OpenClaw 對話中：

```text
/gov_setup quick
# 若 check 回覆顯示 allowlist 未就緒（例如提示 plugins.allow 需對齊）：
/gov_openclaw_json
/gov_setup quick
/gov_setup upgrade
/gov_migrate
/gov_audit
```

補充（避免升級誤判）：
1. `/gov_setup check` 的 `READY` 只代表「當下檔案齊全且可運作」，不是「可跳過你已明確要求的 upgrade」。
2. 只要你明確下達 `/gov_setup upgrade`，就應執行 upgrade（最多是 `PASS: already up-to-date`），不應回覆 `SKIPPED (No-op upgrade)`。

### D) Brain Docs 保守修補流程

此流程適用於要降低「先行動、後核實」或「無證據下過度肯定」風險，同時保留人設語氣。
`gov_brain_audit` 以語義審核為主（跨語言），可選用腳本規則集（`tools/brain_audit_rules.mjs`）作可重現的結構化輔助對照。

檢查類別（語義 + 結構證據）：
1. 先行動後核實語句
2. 無證據下過度肯定語句
3. 缺少必要證據欄位但宣稱完成/通過
4. 聲稱已讀與檔案實際存在不一致
5. 把推測內容寫成記憶事實
6. 詞面提示模式僅作輔助，必須由語義審核確認，不能單獨作封鎖依據

1. 先做只讀預覽：

```text
/gov_brain_audit
```

2. 只批准指定項目（或安全批次）：
   - `F001` 這類 ID 只是示例；請貼上你最新 preview findings 清單中的實際 ID。

```text
/gov_brain_audit APPROVE: <PASTE_IDS_FROM_PREVIEW>
# 或
/gov_brain_audit APPROVE: APPLY_ALL_SAFE
```

3. 如需回退：

```text
/gov_brain_audit ROLLBACK
```

### E) `gov_brain_audit` runtime 自動健康檢查

已實作行為（只讀；不可自動套用）：
1. session/gateway 啟動時會進入觸發窗口
2. `gov_setup upgrade` 後會刷新觸發窗口
3. `gov_migrate` 後會刷新觸發窗口
4. `gov_audit` 後會刷新觸發窗口
5. 重覆阻擋寫入達門檻時會刷新觸發窗口
6. 觸發窗口期間，寫入任務可能被暫停，直到先完成 `/gov_brain_audit` 預覽

---

## 7) 平台設定變更流程

僅用於平台控制面檔案。

1. 以 `gov_openclaw_json` 作入口
2. 在 workspace 建立備份：`archive/_platform_backup_<ts>/...`
3. 套用最小改動
4. 進行驗證
5. 驗證失敗則由備份回退
6. 保存 run report 證據（before/after + backup path）

Fallback：

```text
/skill gov_openclaw_json
```

---

## 8) BOOT 受控套用流程（Experimental）

成熟度邊界：
1. 此流程僅建議用於受控 UAT 或人工覆核場景。
2. `gov_apply` 已納入 deterministic runtime regression baseline。
3. 正式 GA 落地不應依賴無人值守 `gov_apply` 自動執行。

1. BOOT 先做只讀檢查，輸出編號提案
2. 使用者批准指定編號
3. 執行：

```text
/gov_apply <NN>
```

4. 完成後執行：

```text
/gov_migrate
/gov_audit
```

5. 記錄前後指標
6. 若無可量化改善，標記為 `PARTIAL`

---

## 9) UAT 檢查清單

1. `gov_setup check` 有狀態與下一步
2. `gov_setup install|upgrade` 正確部署治理檔案
3. `gov_setup` 完成前，`allow_status` 已達 `ALLOW_OK`
4. `gov_migrate` 完成且無 QC 阻擋
5. `gov_audit` 為 12/12 PASS
6. 平台設定修改經 `gov_openclaw_json`
7. Brain Docs 寫入具備 `FILES_READ` + `TARGET_FILES_TO_CHANGE`
8. Runtime hard gate hooks 已啟用：
   - 缺少 PLAN/READ 證據時，可寫入工具調用會被阻擋
   - 只讀 shell/測試命令應保持可執行
   - 寫入任務被阻擋時，先補 `WG_PLAN_GATE_OK` + `WG_READ_GATE_OK` 再重試
9. Brain Docs 審核流程可完整運作：
   - `gov_brain_audit` 會產生 findings + approval checklist
   - `gov_brain_audit APPROVE: ...` 會產生備份與 run report
   - `gov_brain_audit ROLLBACK` 可回復最近備份
10. Optional Experimental UAT：
   - 若 BOOT 產生且已批准 menu item，可驗證 `/gov_apply <NN>`，完成後必跑 `/gov_migrate` + `/gov_audit`
11. 卸載流程驗收（必做）：
   - 先跑 `/gov_uninstall quick`
   - 可選嚴格驗證：再跑 `/gov_uninstall check`
   - 預期：quick 回覆 `PASS`/`CLEAN`，驗證 check 應為 `CLEAN`
   - 確認 `_runs/gov_uninstall_<ts>.md` 與 `archive/_gov_uninstall_backup_<ts>/...` 已生成

---

## 10) 故障排查

1. 安裝出現 `plugin already exists`：
   - 改用 `openclaw plugins update openclaw-workspace-governance`
2. slash 指令無反應：
   - 改用 `/skill ...` 或自然語言要求調用 skill
3. `gov_setup check` 顯示 `NOT_INSTALLED`：
   - 執行 `gov_setup quick`（或手動 `gov_setup install`）
4. `gov_setup check` 顯示 `PARTIAL`：
   - 執行 `gov_setup quick`（或手動 `gov_setup upgrade`）
5. `openclaw plugins list` 顯示 `plugins.allow is empty`：
   - 這是信任 allowlist 警告，不是 governance 崩潰
   - 先跑 `gov_setup check`，若 `allow_status!=ALLOW_OK`，先跑 `/gov_openclaw_json`，再重跑 `gov_setup check`
6. 官方初始化/設定指令改動了 `openclaw.json`（例如 `openclaw onboard`、`openclaw configure`）：
   - 屬預期情境：治理流程可能先要求信任清單重新對齊
   - 先跑 `/gov_setup check` -> 若信任未就緒跑 `/gov_openclaw_json` -> 再跑 `/gov_setup check`
7. 升級後 audit mismatch：
   - 先 `gov_migrate`，再 `gov_audit`
8. 出現 runtime gate 阻擋訊息：
   - 這通常表示治理保護已生效，並非系統崩潰
   - 官方 `openclaw ...` 系統指令預設允許，不應被 runtime gate 誤擋
   - 若屬寫入/更新/保存任務：先補 PLAN + READ 證據，加入 `WG_PLAN_GATE_OK` + `WG_READ_GATE_OK`，再重試 CHANGE
   - 若屬只讀診斷/測試：保持只讀命令並重新執行
9. `gov_setup upgrade` 仍顯示卡在 governance gate：
   - 更新 plugin 至最新版：`openclaw plugins update openclaw-workspace-governance`
   - 重啟 gateway：`openclaw gateway restart`
   - 重新執行：`/gov_setup check` 再 `/gov_setup upgrade`
   - 或用自然語言：`請在此工作區執行 gov_setup 的 upgrade 模式。`
10. `gov_setup` / `gov_migrate` 指令來源疑似混用（shadow）：
   - 先檢查來源：`openclaw skills info gov_setup --json`、`openclaw skills info gov_migrate --json`
   - 若 `gov_migrate` 來源顯示 `openclaw-workspace` 且指向 `<workspace>/skills/gov_*` 舊檔，先跑 `/gov_setup upgrade`
   - 最新 `gov_setup` 會自動把 `<workspace>/skills/gov_*` 舊副本搬到 `archive/_gov_setup_shadow_backup_<ts>/...`，再走正常升級流程
11. 關於自動更新：
   - 目前沒有背景自動更新機制
   - 請使用手動流程：`openclaw plugins update ...` -> `openclaw gateway restart` -> `gov_setup upgrade` -> `gov_migrate` -> `gov_audit`
12. `gov_brain_audit APPROVE: ...` 顯示 blocked：
   - 請提供明確批准輸入（`APPROVE: <PASTE_IDS_FROM_PREVIEW>` 或 `APPROVE: APPLY_ALL_SAFE`）
   - `PASTE_IDS_FROM_PREVIEW` 指的是你當次 preview 輸出的 finding IDs，不是固定代碼
   - 再以 `/gov_brain_audit APPROVE: ...` 重試
13. `BOOT AUDIT REPORT` 顯示舊的 migration blocked 警告：
   - 若同一流程族（`migrate_governance_*`）已有較新的 PASS，應視為已解決歷史（資訊提示），不是 active blocker
   - 若未有較新 PASS，先跑 `/gov_migrate`，再跑 `/gov_audit`
14. 已先做 `openclaw plugins uninstall` 才發現 workspace 殘留：
   - 先重新安裝 plugin（讓 `/gov_uninstall` 可執行）
   - 跑 `/gov_uninstall quick`（可選嚴格驗證：`/gov_uninstall check`）
   - Brain Docs 若有 `archive/_brain_docs_autofix_<ts>/...` 備份，`/gov_uninstall` 會輸出回復策略與證據欄位

---

## 11) 相關文件

1. 首頁（繁中）：[`README.zh-HK.md`](./README.zh-HK.md)
2. 首頁（English）：[`README.md`](./README.md)
3. 定位文件（繁中）：[`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)
4. 定位文件（English）：[`VALUE_POSITIONING_AND_FACTORY_GAP.en.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md)

