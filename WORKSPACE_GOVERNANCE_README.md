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
4. BOOT 受控套用
5. UAT 與故障排查

---

## 2) 開始前檢查

1. Plugin 套件：
   - `@adamchanadam/openclaw-workspace-governance`
2. 必備 skills：
   - `gov_setup`、`gov_migrate`、`gov_audit`、`gov_apply`、`gov_platform_change`
3. 如 slash 路由不穩，改用 `/skill ...`。

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

操作輸出建議格式：
1. `STATUS`
2. `WHY`
3. `NEXT STEP (Operator)`
4. `COMMAND TO COPY`

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

---

## 5) 檔案範圍地圖（重要）

1. 工作區治理資產：
   - `<workspace-root>/prompts/governance/`
   - 由 `gov_setup install|upgrade|check` 管理
2. 平台控制面：
   - `~/.openclaw/openclaw.json`
   - `~/.openclaw/extensions/`（僅在明確需要時）
   - 由 `gov_platform_change` 管理
3. Brain Docs：
   - `USER.md`、`IDENTITY.md`、`TOOLS.md`、`SOUL.md`、`MEMORY.md`、`HEARTBEAT.md`、`memory/*.md`
   - 不屬 `gov_platform_change` 範圍

---

## 6) 標準操作流程

### A) 全新 OpenClaw / 全新工作區

1. 安裝 plugin
2. `gov_setup install`
3. 執行 bootstrap prompt（`OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`）
4. `gov_audit`

### B) 已運作工作區，首次導入治理

1. 安裝並啟用 plugin
2. `gov_setup install`
3. 執行 bootstrap prompt
4. 如工作區已在運作：`gov_migrate`
5. `gov_audit`

### C) 已安裝治理（日常維護）

1. 主機端：

```text
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart
```

2. OpenClaw 對話中：

```text
/gov_setup upgrade
/gov_migrate
/gov_audit
```

---

## 7) 平台設定變更流程

僅用於平台控制面檔案。

1. 以 `gov_platform_change` 作入口
2. 在 workspace 建立備份：`archive/_platform_backup_<ts>/...`
3. 套用最小改動
4. 進行驗證
5. 驗證失敗則由備份回退
6. 保存 run report 證據（before/after + backup path）

Fallback：

```text
/skill gov_platform_change
```

---

## 8) BOOT 受控套用流程

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
3. `gov_migrate` 完成且無 QC 阻擋
4. `gov_audit` 為 12/12 PASS
5. 平台設定修改經 `gov_platform_change`
6. Brain Docs 寫入具備 `FILES_READ` + `TARGET_FILES_TO_CHANGE`
7. Runtime hard gate hooks 已啟用：
   - 缺少 PLAN/READ 證據時，可寫入工具調用會被阻擋
   - 只讀 shell/測試命令應保持可執行
   - 寫入任務被阻擋時，先補 `WG_PLAN_GATE_OK` + `WG_READ_GATE_OK` 再重試

---

## 10) 故障排查

1. 安裝出現 `plugin already exists`：
   - 改用 `openclaw plugins update openclaw-workspace-governance`
2. slash 指令無反應：
   - 改用 `/skill ...` 或自然語言要求調用 skill
3. `gov_setup check` 顯示 `NOT_INSTALLED`：
   - 執行 `gov_setup install`
4. `gov_setup check` 顯示 `PARTIAL`：
   - 執行 `gov_setup upgrade`
5. 升級後 audit mismatch：
   - 先 `gov_migrate`，再 `gov_audit`
6. 出現 runtime gate 阻擋訊息：
   - 這通常表示治理保護已生效，並非系統崩潰
   - 若屬寫入/更新/保存任務：先補 PLAN + READ 證據，加入 `WG_PLAN_GATE_OK` + `WG_READ_GATE_OK`，再重試 CHANGE
   - 若屬只讀診斷/測試：保持只讀命令並重新執行
7. `gov_setup upgrade` 仍顯示卡在 governance gate：
   - 更新 plugin 至最新版：`openclaw plugins update openclaw-workspace-governance`
   - 重啟 gateway：`openclaw gateway restart`
   - 重新執行：`/gov_setup check` 再 `/gov_setup upgrade`
8. 關於自動更新：
   - 目前沒有背景自動更新機制
   - 請使用手動流程：`openclaw plugins update ...` -> `openclaw gateway restart` -> `gov_setup upgrade` -> `gov_migrate` -> `gov_audit`

---

## 11) 相關文件

1. 首頁（繁中）：[`README.zh-HK.md`](./README.zh-HK.md)
2. 首頁（English）：[`README.md`](./README.md)
3. 定位文件（繁中）：[`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)
4. 定位文件（English）：[`VALUE_POSITIONING_AND_FACTORY_GAP.en.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md)
