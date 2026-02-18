# OpenClaw WORKSPACE_GOVERNANCE：定位、原意與出廠設定差異分析

> 對象：OpenClaw 使用者、維護者、團隊負責人  
> 目的：說清楚本方案「為何存在」、解決什麼問題、與 OpenClaw 官方出廠設定的關係與差異。  
> 說明：本文以官方文檔為依據，並結合實務運作經驗整理。

---

## 1) 先說結論

OpenClaw WORKSPACE_GOVERNANCE 不是替代 OpenClaw，而是補上「治理控制面」。

OpenClaw 官方出廠設定重點是「快速可用、個人助手體驗、可擴展」。  
本方案重點是「長期運作可控、可驗證、可追溯、可持續改進」。

兩者關係：

1. 官方提供運行底座（Gateway、workspace、hooks、skills、上下文注入機制）。
2. WORKSPACE_GOVERNANCE 在此底座上，加入硬性流程與審核機制。

---

## 2) 官方出廠設定（OpenClaw baseline）在做什麼

根據官方文檔，OpenClaw 會在工作區注入一組基礎檔案（若存在）作為 Project Context，包括：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- 新工作區時的 `BOOTSTRAP.md`
- 存在時的 `MEMORY.md` / `memory.md`

同時，官方有兩個注入上限（超出會截斷）：

1. `agents.defaults.bootstrapMaxChars`（單檔上限，預設 20000）
2. `agents.defaults.bootstrapTotalMaxChars`（總量上限，預設 150000）

此外，官方系統提示中對 skills 的處理是「先載入技能中繼資料」，詳細指令通常按需讀取。  
這對效率有利，但代表「關鍵規則是否真正進入當次推理」，會受上下文長度、任務路徑與讀檔行為影響。

---

## 3) 為什麼會出現「一收指令就做、未計劃未查證」的問題

在實務上，尤其使用較低成本、推理能力較弱模型時，常見以下模式：

1. 優先追求快速回應，先動手再補證據。
2. 把「已注入上下文」誤判為「已完整讀檔」。
3. 未觸發目標技能全文讀取，直接用片段印象推斷。
4. 日期與時間題目未先核對當前 runtime 時鐘。
5. 系統題目未先核對官方文檔，導致過時指令或錯誤配置被寫入。

以上現象不是單一模型問題，而是「缺少硬性治理關卡」的結果。  
這正是本方案要補上的空缺。

---

## 4) WORKSPACE_GOVERNANCE 的原意與核心設計

本方案原意不是「多加命令」，而是把高風險操作固定成標準次序：

1. `PLAN`：先列目標、風險、要讀與要改的檔案。
2. `READ`：先讀治理依據與目標檔案，再執行。
3. `CHANGE`：只做授權範圍內的最小改動。
4. `QC`：固定清單逐項核對（12/12）。
5. `PERSIST`：留下 run report 與索引證據。

配套硬規則：

1. Fail-Closed：依據不足即停止，不可猜測完成。
2. 路徑相容：以 runtime `<workspace-root>` 為準，不硬編碼。
3. 系統題查證：本地技能 + 官方文檔；版本敏感題再查 Releases。
4. 日期題查證：先核對 runtime 當前時間，再下結論。
5. 受控升級：BOOT 只讀提案 -> 編號批准 -> 受控套用。

---

## 5) 對用戶最直接的價值（非技術版本）

如果你是日常使用者，這套方案的價值可簡化為：

1. 減少「改錯後要人手救火」。
2. 減少「同一錯誤反覆出現」。
3. 每次變更都可追溯，方便交接與審核。
4. 新手也有固定入口，不必記大量內部細節。

---

## 6) 邊界與真實預期（不過度承諾）

本方案可以大幅降低錯誤率，但不等於：

1. 能把任何模型變成零錯誤。
2. 能完全取代人類審核。
3. 一次部署後永不需要維護。

正確預期是：透過流程約束與證據化輸出，持續收斂風險與重工成本。

---

## 7) 與 README 的分工（避免重複）

為保持文件可維護性，本文件只處理「定位、價值、邊界、出廠差異」。  
以下內容以 README 系列為準，不在本文重複展開：

1. 三種安裝/導入場景：見 [README.md](./README.md)。
2. 完整操作手冊與步驟：見 [WORKSPACE_GOVERNANCE_README.md](./WORKSPACE_GOVERNANCE_README.md)。
3. 指令與 UAT 路徑：見 [README.md](./README.md) 與 [README.en.md](./README.en.md)。

---

## 8) 官方參考來源

- Context（注入檔案與截斷機制）  
  https://docs.openclaw.ai/concepts/context
- System Prompt（系統提示組成）  
  https://docs.openclaw.ai/concepts/system-prompt
- Token Use（skills metadata 與上下文成本）  
  https://docs.openclaw.ai/reference/token-use
- Agent Runtime（workspace 與 bootstrap 概念）  
  https://docs.openclaw.ai/concepts/agent
- Agent Bootstrapping（首次引導）  
  https://docs.openclaw.ai/start/bootstrapping
- Configuration Reference（`workspace`、`skipBootstrap`、注入上限）  
  https://docs.openclaw.ai/gateway/configuration-reference
- Hooks（`session-memory`、`command-logger`、`bootstrap-extra-files`、`boot-md`）  
  https://docs.openclaw.ai/automation/hooks
- AGENTS.default（官方預設助手模板）  
  https://docs.openclaw.ai/AGENTS.default
