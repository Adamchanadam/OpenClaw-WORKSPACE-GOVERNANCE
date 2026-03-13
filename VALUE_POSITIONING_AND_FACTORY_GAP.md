# OpenClaw WORKSPACE_GOVERNANCE：定位與出廠差異

> 本文只解釋「為何需要本方案」。
> 不重覆安裝步驟與操作流程。

相關文件：
1. 首頁：[`README.zh-HK.md`](./README.zh-HK.md)
2. 操作手冊：[`WORKSPACE_GOVERNANCE_README.md`](./WORKSPACE_GOVERNANCE_README.md)
3. 英文版本：[`VALUE_POSITIONING_AND_FACTORY_GAP.en.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md)

---

## 1) 一句定位

OpenClaw WORKSPACE_GOVERNANCE 的角色，是在 OpenClaw 既有能力之上，補上治理控制面，使長期運作工作區保持可控、可驗證、可追溯。

---

## 2) 出廠基線與治理層的差異

OpenClaw 出廠基線主要強調：
1. 快速可用
2. 助理式互動體驗
3. 功能可擴展

治理層主要強調：
1. 高風險任務的固定先後次序
2. 先證據、後改動
3. 一致性核對與可回退

這不是替代官方能力，而是運作層補強。

---

## 3) 為何實務上會出現漂移

長期使用常見問題：
1. 先改後查，缺乏前置核對
2. 把上下文注入誤當完整讀檔
3. 對系統題/時間題/版本題查證不足
4. 同類錯誤跨 session 重覆出現

這些通常是流程關卡不足，不只是模型品質問題。

---

## 4) 本方案實際補上什麼

1. 固定執行次序：`PLAN -> READ -> CHANGE -> QC -> PERSIST`
2. Fail-Closed：證據不足即停止
3. Mode 分流：對話、查證、寫入任務分開處理
4. BOOT 只讀提案 + 人工批准 + 受控套用（Experimental 成熟度）
5. run report 證據化，支援回溯與降低重覆失誤
6. Brain Docs 保守修補能力（`gov_brain_audit`）：先預覽、後批准套用、可回退
7. 品牌化指令輸出：所有 `/gov_*` 回覆帶品牌標頭、emoji 狀態前綴、結構化分隔，操作者可一眼辨認狀態與下一步
8. 常態治理錨點（`prependSystemContext`）：每回合於 plugin 層將精簡 Mode A/B/C 摘要注入系統提示空間——在 cron/heartbeat light-context 模式及壓縮後段落排除下依然生效（需 OpenClaw v2026.3.7+）

## 5) 當前成熟度邊界

目前 GA 基線：
1. `gov_help` 指令目錄 + 一鍵入口（`/gov_setup quick`、`/gov_uninstall quick`）
2. 可確定性核心生命周期：`gov_setup`、`gov_migrate`、`gov_audit`、`gov_openclaw_json`、`gov_brain_audit`、`gov_boot_audit`、`gov_uninstall`
3. Runtime hard-gate 與顯式治理指令意圖 guard
4. 品牌化 UX 輸出合約（`🐾` 標頭 + emoji 狀態 + `👉` 下一步 + 結構化分隔線）
5. 常態 `prependSystemContext` 治理錨點（v0.2.0+，需 OpenClaw v2026.3.7+）

目前 Experimental：
1. `gov_apply <NN>`（BOOT 受控套用）
2. 僅建議於受控 UAT 使用，需明確人工批准，並以 `/gov_migrate`、`/gov_audit` 收尾

---

## 6) 對非技術用戶的實際價值

1. 減少可避免的系統破壞
2. 降低錯改後的人手補救成本
3. 清楚知道改了什麼、為何改、何時改
4. 交接與審核更容易

---

## 7) 邊界（避免過度承諾）

本方案可以降低風險，但不代表：
1. 任何模型都會零錯誤
2. 可完全取代人類判斷
3. 部署後永遠不用維護

合理預期是：
- 風險下降
- 重覆錯誤下降
- 證據品質提升

---

## 8) 下一步閱讀建議

1. 初次使用：先讀 [`README.zh-HK.md`](./README.zh-HK.md)
2. 要逐步操作：讀 [`WORKSPACE_GOVERNANCE_README.md`](./WORKSPACE_GOVERNANCE_README.md)
3. 需要英文內容：讀 [`README.md`](./README.md)

---

## 9) 官方參考

1. https://docs.openclaw.ai/concepts/context
2. https://docs.openclaw.ai/concepts/system-prompt
3. https://docs.openclaw.ai/reference/token-use
4. https://docs.openclaw.ai/concepts/agent
5. https://docs.openclaw.ai/start/bootstrapping
6. https://docs.openclaw.ai/gateway/configuration-reference
7. https://docs.openclaw.ai/automation/hooks
8. https://github.com/openclaw/openclaw/releases
