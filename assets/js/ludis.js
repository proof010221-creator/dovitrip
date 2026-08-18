    // LUDIS_AUTO_HELP_INAPP_MODAL_V1
    let ludisInAppModalResolver = null;

    function escapeLudisHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function textToLudisHtml(value) {
      return escapeLudisHtml(value).replace(/\n/g, "<br>");
    }

    function openLudisInAppModal({ title = "안내", html = "", confirmText = "확인", cancelText = "", showCancel = false } = {}) {
      const modal = document.getElementById("ludisInAppModal");
      const titleEl = document.getElementById("ludisInAppModalTitle");
      const contentEl = document.getElementById("ludisInAppModalContent");
      const confirmBtn = document.getElementById("ludisInAppModalConfirm");
      const cancelBtn = document.getElementById("ludisInAppModalCancel");
      if (!modal || !titleEl || !contentEl || !confirmBtn || !cancelBtn) {
        return Promise.resolve(true);
      }

      titleEl.textContent = title;
      contentEl.innerHTML = html;
      confirmBtn.textContent = confirmText || "확인";
      cancelBtn.textContent = cancelText || "취소";
      cancelBtn.classList.toggle("hidden", !showCancel);
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");

      return new Promise(resolve => {
        ludisInAppModalResolver = resolve;
        setTimeout(() => confirmBtn.focus(), 30);
      });
    }

    function closeLudisInAppModal(result) {
      const modal = document.getElementById("ludisInAppModal");
      if (modal) {
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
      }
      const resolver = ludisInAppModalResolver;
      ludisInAppModalResolver = null;
      if (typeof resolver === "function") resolver(Boolean(result));
    }

    function showLudisNotice(title, message, confirmText = "확인") {
      return openLudisInAppModal({
        title,
        html: `<p>${textToLudisHtml(message)}</p>`,
        confirmText,
        showCancel: false
      });
    }

    function showLudisConfirm(title, message, confirmText = "확인", cancelText = "취소") {
      return openLudisInAppModal({
        title,
        html: `<p>${textToLudisHtml(message)}</p>`,
        confirmText,
        cancelText,
        showCancel: true
      });
    }

    function openAutoSaveHelp() {
      const html = `
        <p>자동저장은 기록 입력을 더 빠르고 편하게 도와주는 기능입니다.</p>
        <p>자동저장 주사위 모드 사용시, 입금 및 출금 내역과 승리 및 패배 기록이 자동으로 저장됩니다.</p>
        <div class="guide-line"></div>
        <h3>1. 유저 번호 입력</h3>
        <p>먼저 내 유저 번호를 입력해 주세요.</p>
        <p>예시:<br><code>61140</code></p>
        <p>유저 번호는 기록을 구분하기 위한 번호입니다.</p>
        <div class="guide-line"></div>
        <h3>2. 유저 번호 저장</h3>
        <p>유저 번호를 입력한 뒤 <code>유저 번호 저장</code> 버튼을 눌러 주세요.</p>
        <p>저장해두면 다음에 기록할 때도 같은 번호를 바로 사용할 수 있어 매번 다시 입력하지 않아도 됩니다.</p>
        <div class="guide-line"></div>
        <h3>3. 주사위 모드 ON</h3>
        <p>주사위 기록을 남길 때는 <code>주사위 모드</code>를 ON으로 켜주세요.</p>
        <p>주사위 모드가 켜져 있으면 기록 입력 화면에서 주사위 관련 기록을 더 빠르게 남길 수 있습니다.</p>
        <div class="guide-line"></div>
        <h3>4. 자동저장 사용</h3>
        <p>자동저장을 켜면 기록 입력 과정이 더 편해집니다.</p>
        <p>기록을 남길 때마다 필요한 정보가 자동으로 이어져, 반복 입력을 줄이고 실수로 기록을 놓치는 상황을 줄이는 데 도움이 됩니다.</p>
        <div class="guide-line"></div>
        <h3>꼭 확인해 주세요</h3>
        <p>자동저장은 기록을 도와주는 보조 기능입니다.</p>
        <p>현금 거래나 계좌 거래처럼 유저 번호가 포함된 거래가 있을 수 있으니, 기록 전에는 모드가 올바르게 켜져 있는지 한 번 확인해 주세요.</p>
        <div class="guide-line"></div>
        <h3>한 줄 정리</h3>
        <p><code>유저 번호 저장</code> → <code>주사위 모드 ON</code> → <code>자동저장 ON</code><br>이 순서로 설정하면 더 편하게 기록할 수 있습니다.</p>
      `;
      openLudisInAppModal({
        title: "자동저장 사용방법",
        html,
        confirmText: "확인",
        showCancel: false
      });
    }

    document.addEventListener("keydown", function(e){
      const modal = document.getElementById("ludisInAppModal");
      if (!modal || modal.classList.contains("hidden")) return;
      if (e.key === "Escape") closeLudisInAppModal(false);
    });

    // 브라우저 기본 alert 대신 루디스 내부 안내창을 사용합니다.
    // confirm은 반환값이 즉시 필요한 기능이 많아서 자동저장 관련 confirm만 별도로 안전하게 교체했습니다.
    try {
      window.alert = function(message) {
        showLudisNotice("루디스 안내", String(message || ""));
        return undefined;
      };
    } catch (err) {}

    // Ludis soft animation helper
    // 기존 기록/인증/판매/Supabase 데이터는 건드리지 않고 화면 반응 효과만 담당합니다.
    function ludisPlayRecordSavedEffect(result) {
      try {
        const panel = document.getElementById("recordInputPanel");
        if (!panel) return;
        panel.classList.remove("ludis-record-saved");
        void panel.offsetWidth;
        panel.classList.add("ludis-record-saved");
        window.setTimeout(() => panel.classList.remove("ludis-record-saved"), 720);
      } catch (err) {
        console.warn("루디스 기록 저장 애니메이션 오류:", err);
      }
    }


    /************************************************************
     * Ludis clean entry screen
     * - 인증 성공 시에만 메인으로 이동
     * - 인증 실패 시 모달 유지
     * - 사용 이전은 별도 버튼/모달로 처리
     ************************************************************/
    (function setupLudisCleanEntry(){
      if (window.__LUDIS_CLEAN_ENTRY_V4__) return;
      window.__LUDIS_CLEAN_ENTRY_V4__ = true;

      const FREE_STARTED_KEY = "ludis_free_started_v1";
      let authModalMode = "auth";

      function hasStoredVipAccess(){
        try {
          const okValues = ["1", "true", "vip"];
          const hasOk =
            okValues.includes(String(localStorage.getItem("dobi_access_ok_v1"))) ||
            okValues.includes(String(localStorage.getItem("ludis_access_ok_v1"))) ||
            localStorage.getItem("ludis_access_tier_v1") === "vip";

          const hasId = Boolean(localStorage.getItem("dobi_access_id_v1") || localStorage.getItem("ludis_access_id_v1"));
          const expires = localStorage.getItem("dobi_access_expires_at_v1") || localStorage.getItem("ludis_access_expires_at_v1");
          const notExpired = !expires || expires === "null" || expires === "무제한" || new Date(expires).getTime() > Date.now();

          return (hasOk || hasId) && notExpired;
        } catch (err) {
          return false;
        }
      }

      function showAuthMessage(message, ok = false){
        const box = document.getElementById("ludisAuthModalMessage");
        if (!box) return;
        box.textContent = message || "";
        box.classList.toggle("ludis-start-hidden", !message);
        box.classList.toggle("ok", Boolean(ok));
      }

      function focusAuthField(id){
        setTimeout(() => {
          try { document.getElementById(id)?.focus(); } catch (err) {}
        }, 50);
      }

      window.ludisHideStartScreen = function(){
        document.getElementById("ludisStartScreen")?.classList.add("ludis-start-hidden");
      };

      window.ludisShowStartScreen = function(){
        document.getElementById("ludisStartScreen")?.classList.remove("ludis-start-hidden");
      };

      window.ludisStartFreeMode = function(){
        try { localStorage.setItem(FREE_STARTED_KEY, "true"); } catch (err) {}
        window.ludisHideStartScreen();
        if (typeof showApp === "function") {
          try { showApp(); } catch (err) {}
        }
      };

      window.ludisOpenAuthModal = function(mode){
        authModalMode = mode === "restore" ? "restore" : "auth";
        showAuthMessage("");

        const title = document.getElementById("ludisAuthModalTitle");
        const desc = document.getElementById("ludisAuthModalDesc");
        const submit = document.getElementById("ludisAuthModalSubmit");

        if (title) title.textContent = authModalMode === "restore" ? "사용 이전" : "VIP 인증하기";
        if (desc) {
          desc.textContent = authModalMode === "restore"
            ? "기존에 사용하던 이용권 코드를 새 브라우저/앱으로 이전합니다."
            : "닉네임과 이용권 코드를 입력해 VIP 기능을 활성화합니다.";
        }
        if (submit) {
          submit.textContent = authModalMode === "restore" ? "사용 이전" : "VIP 인증";
          submit.disabled = false;
        }

        try {
          const nick = localStorage.getItem("dobi_last_nickname_v1") || localStorage.getItem("ludis_last_nickname_v1") || "";
          const input = document.getElementById("startNicknameInput");
          if (input && nick && !input.value) input.value = nick;
        } catch (err) {}

        document.getElementById("ludisAuthModal")?.classList.remove("ludis-start-hidden");
        focusAuthField("startNicknameInput");
      };

      window.ludisCloseAuthModal = function(){
        document.getElementById("ludisAuthModal")?.classList.add("ludis-start-hidden");
      };

      function syncModalInputsToOldInputs(){
        const nickname = document.getElementById("startNicknameInput")?.value?.trim() || "";
        const code = document.getElementById("startVipCodeInput")?.value?.trim() || "";

        const nicknameTargets = ["nicknameInput", "accessNicknameInput", "vipNicknameInput", "userNicknameInput"];
        const codeTargets = ["accessCodeInput", "vipCodeInput", "vipCode", "codeInput"];

        for (const id of nicknameTargets) {
          const el = document.getElementById(id);
          if (el && nickname) {
            el.value = nickname;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }

        for (const id of codeTargets) {
          const el = document.getElementById(id);
          if (el && code) {
            el.value = code;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }

        try {
          if (nickname) {
            localStorage.setItem("dobi_last_nickname_v1", nickname);
            localStorage.setItem("ludis_last_nickname_v1", nickname);
          }
        } catch (err) {}

        return { nickname, code };
      }

      function finishAuthIfSuccess(){
        if (!hasStoredVipAccess()) return false;

        try {
          localStorage.setItem(FREE_STARTED_KEY, "true");
          localStorage.setItem("ludis_access_tier_v1", "vip");
        } catch (err) {}

        showAuthMessage("인증이 완료되었습니다. 메인 화면으로 이동합니다.", true);

        setTimeout(() => {
          window.ludisCloseAuthModal();
          window.ludisHideStartScreen();
          if (typeof showApp === "function") {
            try { showApp(); } catch (err) {}
          }
        }, 650);

        return true;
      }

      async function runOriginalAuth(){
        if (authModalMode === "restore") {
          if (typeof restoreAccessTransfer === "function") {
            await restoreAccessTransfer();
            return true;
          }
        } else {
          if (typeof redeemCode === "function") {
            await redeemCode();
            return true;
          }
        }
        return false;
      }

      window.ludisSubmitAuthModal = async function(){
        showAuthMessage("");

        const { nickname, code } = syncModalInputsToOldInputs();

        if (!nickname) {
          showAuthMessage("닉네임을 입력해 주세요.");
          focusAuthField("startNicknameInput");
          return;
        }

        if (!code) {
          showAuthMessage("이용권 코드를 입력해 주세요.");
          focusAuthField("startVipCodeInput");
          return;
        }

        const submit = document.getElementById("ludisAuthModalSubmit");
        if (submit) submit.disabled = true;

        try {
          await runOriginalAuth();

          setTimeout(() => {
            if (!finishAuthIfSuccess()) {
              showAuthMessage(authModalMode === "restore"
                ? "사용 이전에 실패했습니다. 닉네임과 이용권 코드를 다시 확인해 주세요."
                : "인증에 실패했습니다. 닉네임과 이용권 코드를 다시 확인해 주세요."
              );
              focusAuthField("startVipCodeInput");
            }
            if (submit) submit.disabled = false;
          }, 650);
        } catch (err) {
          console.error("ludisSubmitAuthModal failed:", err);
          showAuthMessage("처리 중 오류가 발생했습니다. 코드를 다시 확인하거나 고객센터로 문의해 주세요.");
          if (submit) submit.disabled = false;
        }
      };

      window.ludisDownloadWindowsApp = function(){
        const fallback = "https://github.com/proof010221-creator/proof/releases/latest/download/LudisSetup.exe";
        const url = String(window.LUDIS_WINDOWS_APP_DOWNLOAD_URL || (typeof LUDIS_WINDOWS_APP_DOWNLOAD_URL !== "undefined" ? LUDIS_WINDOWS_APP_DOWNLOAD_URL : "") || fallback).trim();
        try {
          const a = document.createElement("a");
          a.href = url;
          a.download = "LudisSetup.exe";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (err) {
          location.href = url;
        }
      };

      window.ludisOpenCustomerCenter = function(){
        const fallback = "https://discord.gg/9bX3D9MwRc";
        const url = String(window.LUDIS_CUSTOMER_CENTER_URL || (typeof LUDIS_CUSTOMER_CENTER_URL !== "undefined" ? LUDIS_CUSTOMER_CENTER_URL : "") || fallback).trim();

        // 현재 루디스 페이지는 유지하고 고객센터만 새 탭으로 엽니다.
        // noopener 옵션에서는 새 탭이 정상으로 열려도 window.open 반환값이 null일 수 있으므로
        // location.href fallback을 사용하지 않습니다.
        try {
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (err) {
          window.open(url, "_blank");
        }
      };

      window.addEventListener("DOMContentLoaded", () => {
        const start = document.getElementById("ludisStartScreen");
        if (!start) return;

        try {
          const nick = localStorage.getItem("dobi_last_nickname_v1") || localStorage.getItem("ludis_last_nickname_v1") || "";
          const input = document.getElementById("startNicknameInput");
          if (input && nick) input.value = nick;
        } catch (err) {}

        try {
          const params = new URLSearchParams(location.search || "");
          const mode = params.get("mode");

          // 보안 V3:
          // mode=free는 무료 모드 진입 허용.
          // mode=vip는 절대 VIP 권한을 만들지 않음.
          // VIP 권한은 index.html에서 Supabase 인증 성공 후 저장된
          // dobi_access_id_v1 + ludis_access_tier_v1 값으로만 판단.
          if (mode === "free") {
            localStorage.setItem(FREE_STARTED_KEY, "true");
            localStorage.setItem("ludis_access_tier_v1", "free");
          }

          if (mode) {
            history.replaceState(null, "", "ludis/");
          }
        } catch (err) {}

        const hasVip = hasStoredVipAccess();
        const hasFree = localStorage.getItem(FREE_STARTED_KEY) === "true";

        if (hasVip || hasFree) {
          if (!hasVip && localStorage.getItem("ludis_access_tier_v1") !== "vip") {
            localStorage.setItem("ludis_access_tier_v1", "free");
          }

          window.ludisHideStartScreen();
          setTimeout(() => {
            try {
              if (typeof showApp === "function") showApp();
            } catch (err) {}
          }, 0);
        } else {
          location.replace("../index.html");
          return;
        }

        document.getElementById("startVipCodeInput")?.addEventListener("keydown", (event) => {
          if (event.key === "Enter") window.ludisSubmitAuthModal();
        });
        document.getElementById("startNicknameInput")?.addEventListener("keydown", (event) => {
          if (event.key === "Enter") document.getElementById("startVipCodeInput")?.focus();
        });
      });
    })();

    const {
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      WINDOWS_APP_DOWNLOAD_URL: LUDIS_WINDOWS_APP_DOWNLOAD_URL,
      CUSTOMER_CENTER_URL: LUDIS_CUSTOMER_CENTER_URL
    } = window.LUDIS_CONFIG;

    // 판매 잠금을 임시로 끄고 싶으면 false로 변경
    const ENABLE_ACCESS_LOCK = true; // 기존 VIP 인증 확인은 유지하되, 코드가 없어도 무료 모드로 입장합니다.

    const ACCESS_KEY = "dobi_access_ok_v1";
    const ACCESS_ID_KEY = "dobi_access_id_v1";
    const ACCESS_EXPIRES_KEY = "dobi_access_expires_at_v1";
    const ACCESS_TIER_KEY = "ludis_access_tier_v1";
    // 보안: 테스트 VIP 코드는 운영본에서 제거했습니다.
    const DEVICE_KEY = "dobi_device_id_v1";
    const RECORD_KEY = "dobi_records_v3_sales_lock";
    const SETTINGS_KEY = "dobi_settings_v3_sales_lock";
    const DARK_KEY = "dobi_dark_mode";
    const FORTUNE_KEY = "ludis_daily_fortune_v1";
    const DICE_PREDICT_KEY = "ludis_prediction_dice_v1";
    const TAROT_KEY = "ludis_daily_tarot_v1";
    const AUTO_DICE_KEY = "ludis_auto_dice_mode_v1";
    const AUTO_DICE_PROCESSED_KEY = "ludis_auto_dice_processed_v1";
    const AUTO_DICE_FUNCTION_URL = SUPABASE_URL + "/functions/v1/shiba-logs-proxy";

    const isSupabaseConfigured = () =>
      SUPABASE_URL.startsWith("https://") &&
      !SUPABASE_URL.includes("YOUR-PROJECT") &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");

    let sb = null;
    if (isSupabaseConfigured() && window.supabase) {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    let records = loadRecords();
    let settings = loadSettings();
    let accessHeartbeatTimer = null;
    let autoDiceTimer = null;
    let autoDiceBusy = false;
    // 보안 강화: 다음판 예상 확률은 브라우저 계산이 아니라 서버 검증 결과만 표시합니다.
    let serverNextChanceData = null;
    let serverNextChanceLoading = false;
    let serverNextChanceTimer = null;
    let serverNextChanceLastKey = "";


    function loadRecords() {
      try { return JSON.parse(localStorage.getItem(RECORD_KEY) || "[]"); }
      catch { return []; }
    }
    function saveRecords() { localStorage.setItem(RECORD_KEY, JSON.stringify(records)); }
    function loadSettings() {
      try {
        return Object.assign({ startBalanceEok: 0, targetProfitEok: 0, lossWarningEok: 0 }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
      } catch {
        return { startBalanceEok: 0, targetProfitEok: 0, lossWarningEok: 0 };
      }
    }
    function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }


    function getCurrentTier() {
      return localStorage.getItem(ACCESS_TIER_KEY) === "vip" ? "vip" : "free";
    }

    function isVip() {
      return getCurrentTier() === "vip";
    }

    function setCurrentTier(tier) {
      localStorage.setItem(ACCESS_TIER_KEY, tier === "vip" ? "vip" : "free");
      applyTierUI();
    }

    function requireVipFeature(featureName) {
      if (isVip()) return true;
      showLudisNotice("VIP 전용 기능", featureName + "은 VIP 전용 기능입니다.\n\n무료 사용자는 수동 기록, 통계, 그래프, 백업 기능을 사용할 수 있습니다.");
      return false;
    }

    function renderNextChanceVipState(chance = null) {
      const vip = isVip();
      const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
      const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

      ["nextChancePanel", "nextChanceBox", "menuNextChanceMetric"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("vip-locked", !vip || !chance);
      });

      if (!vip) {
        setText("nextConfidenceText", "VIP 전용");
        setText("nextWinPct", "—");
        setText("nextLossPct", "—");
        setHtml("nextChanceMiniTop", "<b>VIP 전용 기능입니다.</b><br>이용권 인증 후 서버에서 VIP 상태를 확인한 뒤 승리/패배 예상 확률이 표시됩니다.");
        setText("nextChanceText", "다음판 예상 확률은 VIP 전용");
        setText("nextChanceMiniSummary", "무료 모드에서는 수동 기록·통계·그래프·백업만 사용할 수 있습니다.");
        setText("menuNextChance", "VIP 전용");
        setText("predictionWinChance", "VIP 전용");
        return false;
      }

      if (serverNextChanceLoading && !chance) {
        setText("nextConfidenceText", "서버 확인 중");
        setText("nextWinPct", "확인중");
        setText("nextLossPct", "확인중");
        setHtml("nextChanceMiniTop", "<b>서버에서 VIP 인증을 확인하고 있습니다.</b><br>잠시만 기다려 주세요.");
        setText("nextChanceText", "서버에서 다음판 예상 확률을 확인 중입니다.");
        setText("nextChanceMiniSummary", "VIP 서버 검증 중입니다.");
        setText("menuNextChance", "확인중");
        return false;
      }

      if (!chance) {
        setText("nextConfidenceText", "서버 대기");
        setText("nextWinPct", "대기");
        setText("nextLossPct", "대기");
        setHtml("nextChanceMiniTop", "<b>VIP 서버 계산 대기 중입니다.</b><br>기록을 저장하거나 잠시 후 다시 확인해 주세요.");
        setText("nextChanceText", "VIP 서버 계산 대기 중입니다.");
        setText("nextChanceMiniSummary", "서버 응답 후 표시됩니다.");
        setText("menuNextChance", "대기");
        return false;
      }

      const win = Number(chance.win || 50);
      const loss = Number(chance.loss || (100 - win));
      setText("nextWinPct", `${win.toFixed(1)}%`);
      setText("nextLossPct", `${loss.toFixed(1)}%`);
      setText("nextConfidenceText", `신뢰도 ${chance.confidence || "낮음"}`);
      setHtml("nextChanceMiniTop", `<b>${escapeHtml(chance.message || "서버 계산 결과입니다.")}</b>`);
      setText("nextChanceText", `다음판 승리예상 ${win.toFixed(1)}% · 패배예상 ${loss.toFixed(1)}%`);
      setText("nextChanceMiniSummary", chance.message || "서버 계산 결과입니다.");
      setText("menuNextChance", `${win.toFixed(1)}%`);
      return true;
    }

    function buildNextChanceSummary(s) {
      const todayList = getRecordsForToday();
      const recent10 = records.slice(-10);
      const recent5 = records.slice(-5);
      const countWins = (list) => list.filter(r => r && r.result === "win").length;
      const last = records.length ? records[records.length - 1] : null;

      return {
        totalGames: Number(s?.totalGames || records.length || 0),
        wins: Number(s?.wins || 0),
        losses: Number(s?.losses || 0),
        streak: Number(s?.streak || 0),
        today_count: todayList.length,
        today_wins: countWins(todayList),
        recent10_count: recent10.length,
        recent10_wins: countWins(recent10),
        recent5_count: recent5.length,
        recent5_wins: countWins(recent5),
        last_result: last?.result === "win" ? "win" : (last?.result === "loss" ? "loss" : ""),
        client_version: "security_blacklist_v1"
      };
    }

    function scheduleServerNextChanceRefresh(s = getStats(), delay = 350) {
      if (!isVip()) {
        serverNextChanceData = null;
        serverNextChanceLoading = false;
        renderNextChanceVipState(null);
        return;
      }
      clearTimeout(serverNextChanceTimer);
      serverNextChanceTimer = setTimeout(() => refreshServerNextChance(s), delay);
    }

    async function refreshServerNextChance(s = getStats()) {
      if (!isVip()) {
        serverNextChanceData = null;
        serverNextChanceLoading = false;
        renderNextChanceVipState(null);
        return false;
      }
      if (!isSupabaseConfigured() || !sb) {
        serverNextChanceData = null;
        serverNextChanceLoading = false;
        renderNextChanceVipState(null);
        return false;
      }
      const accessId = getSavedAccessId();
      const deviceId = getDeviceId();
      if (!accessId || !deviceId) {
        clearAccessState();
        serverNextChanceData = null;
        serverNextChanceLoading = false;
        renderNextChanceVipState(null);
        return false;
      }

      const summary = buildNextChanceSummary(s);
      const summaryKey = JSON.stringify(summary) + "|" + accessId + "|" + deviceId;
      if (summaryKey === serverNextChanceLastKey && serverNextChanceData) {
        renderNextChanceVipState(serverNextChanceData);
        return true;
      }

      serverNextChanceLoading = true;
      renderNextChanceVipState(serverNextChanceData);
      try {
        const { data, error } = await sb.rpc("vip_get_next_chance", {
          p_access_id: accessId,
          p_device: deviceId,
          p_summary: summary
        });
        if (error) throw error;

        if (!data || !data.ok) {
          serverNextChanceData = null;
          serverNextChanceLastKey = "";
          serverNextChanceLoading = false;
          clearAccessState();
          renderNextChanceVipState(null);
          return false;
        }

        serverNextChanceData = data;
        serverNextChanceLastKey = summaryKey;
        serverNextChanceLoading = false;
        setCurrentTier("vip");
        renderNextChanceVipState(serverNextChanceData);
        return true;
      } catch (err) {
        console.error("VIP 다음판 예상 확률 서버 검증 오류:", err);
        serverNextChanceData = null;
        serverNextChanceLastKey = "";
        serverNextChanceLoading = false;
        renderNextChanceVipState(null);
        return false;
      }
    }

    function applyTierUI() {
      const vip = isVip();
      const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
      setText("tierMedal", vip ? "VIP" : "FREE");
      setText("tierStatusTitle", vip ? "VIP 모드" : "무료 모드");
      setText("tierStatusDesc", vip ? "자동저장과 거래주의 조회까지 사용할 수 있습니다." : "코드 없이 수동 기록, 통계, 그래프, 백업 기능을 사용할 수 있습니다.");
      setText("tierBadge", vip ? "VIP" : "FREE");
      const badge = document.getElementById("tierBadge");
      if (badge) badge.className = vip ? "tier-badge vip" : "tier-badge";

      const quick = document.getElementById("quickAutoBox");
      if (quick) quick.classList.toggle("vip-locked", !vip);

      const autoBtn = document.querySelector('.top-actions button[onclick*="auto"]');
      if (autoBtn) autoBtn.textContent = vip ? "자동저장" : "자동저장";

      const blacklistBox = document.getElementById("blacklistBox");
      if (blacklistBox) blacklistBox.classList.toggle("vip-locked", !vip);
      setText("blacklistTierBadge", vip ? "VIP 사용 가능" : "VIP 전용");
      const lockNotice = document.getElementById("blacklistLockNotice");
      if (lockNotice) {
        lockNotice.className = vip ? "notice success" : "notice warning";
        lockNotice.textContent = vip ? "VIP 기능 활성화 · 고유번호로 바로 조회할 수 있습니다." : "VIP 이용권에서 고유번호로 거래주의 등록 여부를 확인할 수 있습니다.";
      }

      const vipDisabledIds = [
        "quickAutoUserIdInput", "autoUserIdInput", "quickAutoToggleBtn", "autoDiceToggleBtn"
      ];
      vipDisabledIds.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = !vip; });

      renderNextChanceVipState();

      if (!vip) stopAutoDiceTimer();
      renderAutoDicePanel?.();
    }

    async function activateVipFromMain() {
      // 기존 메인 상단의 직접 코드 입력 방식은 사용하지 않습니다.
      // 기존 구매 코드가 이미 사용된 코드로 처리되는 문제를 막기 위해 모달 인증으로 통일합니다.
      if (typeof ludisOpenAuthModal === "function") {
        ludisOpenAuthModal("auth");
      }
    }

    function renderUnifiedBlacklistFound(box, userNumber, result) {
      const incidentCount = Number(result.count || (Array.isArray(result.items) ? result.items.length : 1) || 1);
      const incidents = Array.isArray(result.items) ? result.items : [];
      const aggregateLevel = result.warning_level || "위험";
      const latestItemText = result.item_price_text ? `<br>물품/가격: ${escapeHtml(result.item_price_text)}` : "";
      const incidentList = incidents.length
        ? `<div style="margin-top:10px; display:grid; gap:8px;">${incidents.slice(0, 10).map((item, idx) => {
            const itemPrice = item.item_price_text ? `<br>물품/가격: ${escapeHtml(item.item_price_text)}` : "";
            const reason = item.public_reason || "거래 관련 신고 이력 있음";
            const level = item.warning_level || "위험";
            const dateText = item.created_at ? `<br><span class='mini'>등록일: ${escapeHtml(new Date(item.created_at).toLocaleDateString("ko-KR"))}</span>` : "";
            return `<div style="border:1px solid rgba(226,59,83,.22); background:rgba(226,59,83,.045); border-radius:12px; padding:9px 10px;"><b>${idx + 1}. ${escapeHtml(level)}</b>${itemPrice}<br>사유: ${escapeHtml(reason)}${dateText}</div>`;
          }).join("")}</div>`
        : "";
      const moreText = incidentCount > incidents.length
        ? `<br><span class='mini'>최근 ${incidents.length.toLocaleString("ko-KR")}건만 표시됩니다. 전체 등록건수는 ${incidentCount.toLocaleString("ko-KR")}건입니다.</span>`
        : "";

      box.className = "blacklist-compact-result notice danger";
      box.innerHTML = `거래주의 등록 이력이 확인되었습니다.<br><br>` +
        `고유번호: ${escapeHtml(userNumber)}<br>` +
        `닉네임: ${escapeHtml(result.nickname || "비공개")}<br>` +
        `상태: ${escapeHtml(aggregateLevel)}<br>` +
        `사유: ${escapeHtml(result.public_reason || "거래 관련 신고 이력 있음")}` +
        `${latestItemText}` +
        `${incidentList}` +
        `${moreText}` +
        `<br><span class='mini'>동일 고유번호에 여러 사건이 등록될 수 있습니다. 최종 거래 판단은 이용자 본인에게 있습니다.</span>`;
    }

    async function searchBlacklistUser() {
      if (!requireVipFeature("거래주의 조회")) return;
      const input = document.getElementById("blacklistUserNumberInput");
      const box = document.getElementById("blacklistResult");
      const userNumber = String(input?.value || "").replace(/[^0-9]/g, "").trim();
      if (!userNumber) {
        if (typeof showLudisNotice === "function") showLudisNotice("조회할 고유번호를 입력해주세요.");
        else alert("조회할 고유번호를 입력해주세요.");
        return;
      }
      if (!box) return;

      if (!isSupabaseConfigured() || !sb) {
        box.className = "blacklist-compact-result notice warning";
        box.innerHTML = "⚠️ 거래주의 조회 서버 연결이 아직 설정되지 않았습니다.<br><span class='mini'>관리자에게 문의해 주세요.</span>";
        return;
      }

      const accessId = getSavedAccessId();
      const deviceId = getDeviceId();
      if (!accessId || !deviceId) {
        clearAccessState();
        applyTierUI();
        box.className = "blacklist-compact-result notice warning";
        box.innerHTML = "VIP 인증 확인이 필요합니다.<br><span class='mini'>VIP 인증 또는 사용 이전 후 다시 조회해 주세요.</span>";
        return;
      }

      box.className = "blacklist-compact-result notice";
      box.innerHTML = "서버에서 VIP 인증과 거래주의 정보를 확인 중입니다...";

      try {
        const { data, error } = await sb.rpc("vip_search_blacklist_user", {
          p_access_id: accessId,
          p_device: deviceId,
          p_user_number: userNumber
        });
        if (error) throw error;

        if (!data || data.need_vip) {
          clearAccessState();
          applyTierUI();
          box.className = "blacklist-compact-result notice warning";
          box.innerHTML = "VIP 인증이 만료되었거나 해제되었습니다.<br><span class='mini'>다시 인증 후 조회해 주세요.</span>";
          return;
        }

        const localFound = !!data.found;

        if (localFound) {
          const incidentCount = Number(data.count || 1);
          const incidents = Array.isArray(data.items) ? data.items : [];
          renderUnifiedBlacklistFound(box, userNumber, {
            count: incidentCount,
            items: incidents,
            nickname: data.nickname || "비공개",
            item_price_text: data.item_price_text || "",
            warning_level: data.warning_level || (incidentCount >= 2 ? "위험" : "위험"),
            public_reason: data.public_reason || "주사위 패배 후 종료"
          });
          return;
        }

        box.className = "blacklist-compact-result notice success";
        box.innerHTML = "✅ 등록된 거래주의 정보가 없습니다.<br><span class='mini'>그래도 거래 전 금액과 조건은 다시 확인하세요.</span>";
      } catch (err) {
        console.error("거래주의 조회 오류:", err);
        box.className = "blacklist-compact-result notice warning";
        box.innerHTML = "⚠️ 거래주의 조회 서버 함수 연결에 실패했습니다.<br><span class='mini'>Supabase에 vip_search_blacklist_user 함수와 ludis_blacklist_users 테이블을 먼저 적용해야 합니다.</span>";
      }
    }

    function getDeviceId() {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    }

    function getSavedAccessId() {
      return localStorage.getItem(ACCESS_ID_KEY) || "";
    }

    function clearAccessState() {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(ACCESS_ID_KEY);
      localStorage.removeItem(ACCESS_EXPIRES_KEY);
      localStorage.setItem(ACCESS_TIER_KEY, "free");
    }

    function isUnlocked() {
      if (!ENABLE_ACCESS_LOCK) return true;
      return localStorage.getItem(ACCESS_KEY) === "1" && !!getSavedAccessId();
    }

    async function validateSavedAccess(showMessage = true) {
      if (!ENABLE_ACCESS_LOCK) return true;
      if (!isSupabaseConfigured() || !sb) return false;

      const accessId = getSavedAccessId();
      if (!accessId) {
        clearAccessState();
        return false;
      }

      try {
        const { data, error } = await sb.rpc("check_access_status", {
          p_access_id: accessId,
          p_device: getDeviceId()
        });
        if (error) throw error;

        if (data && data.ok) {
          localStorage.setItem(ACCESS_KEY, "1");
          localStorage.setItem(ACCESS_TIER_KEY, "vip");
          if (data.expires_at) localStorage.setItem(ACCESS_EXPIRES_KEY, data.expires_at);
          else localStorage.removeItem(ACCESS_EXPIRES_KEY);
          return true;
        }

        clearAccessState();
        if (showMessage) alert((data && data.message) || "인증이 만료되었거나 해제되었습니다. 다시 인증해주세요.");
        return false;
      } catch (err) {
        console.error("인증 상태 확인 오류:", err);
        if (showMessage) alert("인증 상태 확인 오류: " + (err?.message || JSON.stringify(err)));
        return false;
      }
    }

    async function redeemCode() {
      const btn = document.getElementById("redeemBtn");
      const code = document.getElementById("accessCodeInput").value.trim();
      const nickname = document.getElementById("nicknameInput").value.trim();

      if (!isSupabaseConfigured() || !sb) {
        alert("Supabase 설정이 아직 안 들어갔습니다. index.html 상단의 URL/key를 먼저 바꿔주세요.");
        return;
      }
      if (!code) {
        alert("이용 코드를 입력해주세요.");
        return;
      }

      btn.disabled = true;
      btn.textContent = "확인 중...";
      try {
        const { data, error } = await sb.rpc("redeem_access_code", {
          p_code: code,
          p_device: getDeviceId(),
          p_nickname: nickname,
          p_user_agent: navigator.userAgent
        });

        if (error) throw error;
        if (data && data.ok) {
          localStorage.setItem(ACCESS_KEY, "1");
          localStorage.setItem(ACCESS_TIER_KEY, "vip");
          if (data.access_id) localStorage.setItem(ACCESS_ID_KEY, data.access_id);
          if (data.expires_at) localStorage.setItem(ACCESS_EXPIRES_KEY, data.expires_at);
          else localStorage.removeItem(ACCESS_EXPIRES_KEY);
          alert("인증 완료! 사이트를 사용할 수 있습니다.");
          setCurrentTier("vip");
          showApp();
          scheduleServerNextChanceRefresh(getStats(), 100);
        } else {
          alert((data && data.message) || "코드가 틀렸거나 이미 사용된 코드입니다.");
        }
      } catch (err) {
           console.error("Supabase 인증 오류:", err);
        alert("Supabase 오류: " + (err?.message || JSON.stringify(err)));
      } finally {
        btn.disabled = false;
        btn.textContent = "입장하기";
      }
    }


    async function restoreAccessTransfer() {
      const restoreBtn = document.getElementById("restoreBtn");
      const redeemBtn = document.getElementById("redeemBtn");
      const code = document.getElementById("accessCodeInput").value.trim();
      const nickname = document.getElementById("nicknameInput").value.trim();

      if (!isSupabaseConfigured() || !sb) {
        alert("Supabase 설정이 아직 안 들어갔습니다. index.html 상단의 URL/key를 먼저 바꿔주세요.");
        return;
      }
      if (!code) {
        alert("기기 이전할 이용 코드를 입력해주세요.");
        return;
      }

      const ok = confirm(
        "기존 인증을 이 브라우저/앱으로 이전할까요?\n\n" +
        "이전이 완료되면 같은 코드로 인증되어 있던 기존 브라우저나 앱은 자동으로 이용이 중지됩니다.\n\n" +
        "본인 코드가 맞을 때만 진행해주세요."
      );
      if (!ok) return;

      restoreBtn.disabled = true;
      if (redeemBtn) redeemBtn.disabled = true;
      restoreBtn.textContent = "이전 중...";

      try {
        const { data, error } = await sb.rpc("restore_access_code", {
          p_code: code,
          p_device: getDeviceId(),
          p_nickname: nickname,
          p_user_agent: navigator.userAgent
        });

        if (error) throw error;

        if (data && data.ok) {
          localStorage.setItem(ACCESS_KEY, "1");
          if (data.access_id) localStorage.setItem(ACCESS_ID_KEY, data.access_id);
          if (data.expires_at) localStorage.setItem(ACCESS_EXPIRES_KEY, data.expires_at);
          else localStorage.removeItem(ACCESS_EXPIRES_KEY);

          alert(
            (data.message || "기존 인증을 이 기기로 이전했습니다.") +
            "\n\n이전 브라우저/앱의 인증은 자동으로 해제됩니다."
          );
          setCurrentTier("vip");
          showApp();
          scheduleServerNextChanceRefresh(getStats(), 100);
        } else {
          alert((data && data.message) || "인증 이전에 실패했습니다.");
        }
      } catch (err) {
        console.error("인증 이전 오류:", err);
        alert("인증 이전 오류: " + (err?.message || JSON.stringify(err)));
      } finally {
        restoreBtn.disabled = false;
        if (redeemBtn) redeemBtn.disabled = false;
        restoreBtn.textContent = "사용 이전";
      }
    }

    function showLock() {
      if (accessHeartbeatTimer) {
        clearInterval(accessHeartbeatTimer);
        accessHeartbeatTimer = null;
      }
      stopAutoDiceTimer();
      document.body.classList.add("access-locked");
      document.getElementById("lockScreen").classList.remove("hidden");
      document.getElementById("lockScreen").setAttribute("aria-hidden", "false");
      document.getElementById("app").classList.add("hidden");
      document.getElementById("app").setAttribute("aria-hidden", "true");
      document.getElementById("setupWarning").classList.toggle("hidden", isSupabaseConfigured());
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    let accessCheckInProgress = false;

    function forceLock(message) {
      clearAccessState();
      alert(message || "이용 기간이 만료되었거나 인증이 해제되었습니다. 다시 인증해주세요.");
      showLock();
    }

    function continueFreeModeFromLock() {
      // 이용권 만료/인증해제 후에도 수동 기록, 통계, 그래프, 백업은 무료 모드로 계속 사용할 수 있게 합니다.
      // VIP 권한은 서버 검증 대상이므로 여기서는 반드시 브라우저의 VIP 표시값을 정리하고 FREE 상태로만 진입합니다.
      try {
        clearAccessState();
        localStorage.setItem("ludis_free_started_v1", "true");
        localStorage.setItem(ACCESS_TIER_KEY, "free");
        localStorage.removeItem(ACCESS_ID_KEY);
        localStorage.removeItem(ACCESS_EXPIRES_KEY);
        localStorage.removeItem(ACCESS_KEY);
      } catch (err) {
        console.warn("무료 모드 전환 저장값 정리 실패:", err);
      }

      serverNextChanceData = null;
      serverNextChanceLastKey = "";
      serverNextChanceLoading = false;
      stopAutoDiceTimer();
      showApp();
    }

    async function checkAccessNow(showMessage = false) {
      if (!ENABLE_ACCESS_LOCK) return true;
      if (!isVip()) return true;
      if (document.getElementById("app").classList.contains("hidden")) return false;
      if (accessCheckInProgress) return true;

      accessCheckInProgress = true;
      try {
        const ok = await validateSavedAccess(showMessage);
        if (!ok) {
          serverNextChanceData = null;
          serverNextChanceLastKey = "";
          forceLock(showMessage ? undefined : "이용 기간이 만료되었거나 인증이 해제되었습니다. 다시 인증해주세요.");
          return false;
        }
        return true;
      } finally {
        accessCheckInProgress = false;
      }
    }

    async function requireAccess() {
      // 무료 모드에서는 수동 기록/통계/백업을 코드 없이 사용할 수 있습니다.
      // VIP 전용 기능은 requireVipFeature()에서 별도로 막습니다.
      return true;
    }

    function startAccessHeartbeat() {
      if (!ENABLE_ACCESS_LOCK || !isVip() || !isSupabaseConfigured() || !sb) return;
      if (accessHeartbeatTimer) clearInterval(accessHeartbeatTimer);

      // 켜둔 상태에서도 인증해제/기간만료를 빠르게 반영합니다.
      accessHeartbeatTimer = setInterval(async () => {
        await checkAccessNow(false);
      }, 10000);
    }

    function showApp() {
      document.body.classList.remove("access-locked");
      document.getElementById("lockScreen").classList.add("hidden");
      document.getElementById("lockScreen").setAttribute("aria-hidden", "true");
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("app").setAttribute("aria-hidden", "false");
      initInputs();
      applyTierUI();
      render();
      startAccessHeartbeat();
      if (isVip()) {
        startAutoDiceTimer();
        scheduleServerNextChanceRefresh(getStats(), 100);
      } else {
        stopAutoDiceTimer();
      }
    }
    function lockAgain() {
      if (!confirm("이 브라우저의 인증 상태만 초기화합니다. 계속할까요?")) return;
      clearAccessState();
      location.reload();
    }

    function openCustomerCenter() {
      const url = String(LUDIS_CUSTOMER_CENTER_URL || "").trim();
      if (!url) return;

      // 현재 루디스 페이지는 유지하고 고객센터만 새 탭으로 엽니다.
      // noopener 옵션에서는 새 탭이 정상으로 열려도 window.open 반환값이 null일 수 있으므로
      // location.href fallback을 사용하지 않습니다.
      try {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        window.open(url, "_blank");
      }
    }

    function downloadWindowsApp() {
      const url = String(LUDIS_WINDOWS_APP_DOWNLOAD_URL || "").trim();
      if (!url || url.includes("여기에_")) {
        alert("Windows 앱 다운로드 링크가 아직 설정되지 않았습니다. GitHub Releases에 설치파일을 LudisSetup.exe 이름으로 올린 뒤 index.html 상단의 LUDIS_WINDOWS_APP_DOWNLOAD_URL 값을 바꿔주세요.");
        return;
      }

      // 주소 페이지로 이동하지 않고 설치파일을 바로 받도록 숨은 다운로드 링크를 눌러줍니다.
      const a = document.createElement("a");
      a.href = url;
      a.download = "LudisSetup.exe";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function parseEok(value) {
      if (typeof value === "number") return Number.isFinite(value) ? value : 0;
      let s = String(value || "").trim().replace(/,/g, "").replace(/\s+/g, "");
      if (!s) return 0;

      let total = 0;
      const joMatch = s.match(/(-?\d+(?:\.\d+)?)조/);
      if (joMatch) total += parseFloat(joMatch[1]) * 10000;
      const eokMatch = s.match(/(-?\d+(?:\.\d+)?)억/);
      if (eokMatch) total += parseFloat(eokMatch[1]);

      if (!joMatch && !eokMatch) {
        const num = parseFloat(s.replace(/[^0-9.\-]/g, ""));
        total = Number.isFinite(num) ? num : 0;
      }
      return Math.round(total * 100) / 100;
    }

    function formatEok(n) {
      n = Number(n) || 0;
      const sign = n < 0 ? "-" : "";
      n = Math.abs(n);
      if (n >= 10000) {
        const jo = Math.floor(n / 10000);
        const eok = Math.round((n % 10000) * 100) / 100;
        return sign + jo.toLocaleString() + "조" + (eok ? " " + eok.toLocaleString() + "억" : "");
      }
      return sign + n.toLocaleString() + "억";
    }

    function formatDate(iso) {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,"0");
      const day = String(d.getDate()).padStart(2,"0");
      const hh = String(d.getHours()).padStart(2,"0");
      const mm = String(d.getMinutes()).padStart(2,"0");
      return `${y}.${m}.${day} ${hh}:${mm}`;
    }

    function isToday(iso) {
      const d = new Date(iso);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }

    function setAmount(eok) {
      const input = document.getElementById("amountInput");
      const current = parseEok(input.value);
      const next = Math.max(0, current + Number(eok || 0));
      input.value = formatEok(next);
      previewAmount();
    }

    function resetAmount() {
      const input = document.getElementById("amountInput");
      input.value = "";
      previewAmount();
      input.focus();
    }

    function previewAmount() {
      const amount = parseEok(document.getElementById("amountInput").value);
      document.getElementById("amountPreview").textContent = "선택 금액: " + formatEok(amount);
    }

    function initInputs() {
      document.body.classList.toggle("dark", localStorage.getItem(DARK_KEY) === "1");
      document.getElementById("startBalanceInput").value = settings.startBalanceEok ? formatEok(settings.startBalanceEok) : "";
      document.getElementById("targetProfitInput").value = settings.targetProfitEok ? formatEok(settings.targetProfitEok) : "";
      document.getElementById("lossWarningInput").value = settings.lossWarningEok ? formatEok(settings.lossWarningEok) : "";
      previewAmount();
    }

    function saveSettingsFromInputs() {
      settings.startBalanceEok = parseEok(document.getElementById("startBalanceInput").value);
      settings.targetProfitEok = parseEok(document.getElementById("targetProfitInput").value);
      settings.lossWarningEok = parseEok(document.getElementById("lossWarningInput").value);
      saveSettings();
      render();
    }

    async function addRecord(result) {
      if (!await requireAccess()) return;

      const amount = parseEok(document.getElementById("amountInput").value);
      const memo = document.getElementById("memoInput").value.trim();
      if (!amount || amount <= 0) {
        alert("베팅 금액을 입력해주세요.");
        return;
      }
      const profit = result === "win" ? amount : -amount;
      records.push({
        id: Date.now().toString(36) + Math.random().toString(16).slice(2),
        createdAt: new Date().toISOString(),
        result,
        amountEok: amount,
        profitEok: profit,
        memo
      });
      document.getElementById("memoInput").value = "";
      saveRecords();
      render();
      ludisPlayRecordSavedEffect(result);
    }

    function getStats() {
      const totalGames = records.length;
      const wins = records.filter(r => r.result === "win").length;
      const losses = totalGames - wins;
      const totalBet = records.reduce((s,r) => s + Number(r.amountEok || 0), 0);
      const totalProfit = records.filter(r => r.profitEok > 0).reduce((s,r) => s + r.profitEok, 0);
      const totalLoss = Math.abs(records.filter(r => r.profitEok < 0).reduce((s,r) => s + r.profitEok, 0));
      const net = records.reduce((s,r) => s + Number(r.profitEok || 0), 0);
      const todayNet = records.filter(r => isToday(r.createdAt)).reduce((s,r) => s + Number(r.profitEok || 0), 0);
      const avgBet = totalGames ? totalBet / totalGames : 0;
      const winRate = totalGames ? wins / totalGames * 100 : 0;
      let streak = 0;
      if (records.length) {
        const last = records[records.length - 1].result;
        for (let i = records.length - 1; i >= 0; i--) {
          if (records[i].result === last) streak += last === "win" ? 1 : -1;
          else break;
        }
      }
      return { totalGames, wins, losses, totalBet, totalProfit, totalLoss, net, todayNet, avgBet, winRate, streak };
    }

    function getRecordsForToday() {
      return records.filter(r => isToday(r.createdAt));
    }

    function isThisWeek(iso) {
      const d = new Date(iso);
      const now = new Date();
      const start = new Date(now);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0,0,0,0);

      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return d >= start && d < end;
    }

    function getMaxStreakInList(list, targetResult) {
      let max = 0;
      let current = 0;
      list.forEach(r => {
        if (r.result === targetResult) {
          current += 1;
          max = Math.max(max, current);
        } else {
          current = 0;
        }
      });
      return max;
    }

    function getReportStats(list) {
      const totalGames = list.length;
      const wins = list.filter(r => r.result === "win").length;
      const losses = totalGames - wins;
      const totalBet = list.reduce((s,r) => s + Number(r.amountEok || 0), 0);
      const net = list.reduce((s,r) => s + Number(r.profitEok || 0), 0);
      const winRate = totalGames ? wins / totalGames * 100 : 0;
      const bestWin = list.filter(r => r.profitEok > 0).reduce((m,r) => Math.max(m, Number(r.profitEok || 0)), 0);
      const worstLoss = Math.abs(list.filter(r => r.profitEok < 0).reduce((m,r) => Math.min(m, Number(r.profitEok || 0)), 0));
      const maxWinStreak = getMaxStreakInList(list, "win");
      const maxLossStreak = getMaxStreakInList(list, "loss");
      return { totalGames, wins, losses, totalBet, net, winRate, bestWin, worstLoss, maxWinStreak, maxLossStreak };
    }

    function dateKey(iso) {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,"0");
      const day = String(d.getDate()).padStart(2,"0");
      return `${y}.${m}.${day}`;
    }

    function getBestDay(list) {
      const grouped = {};
      list.forEach(r => {
        const key = dateKey(r.createdAt);
        grouped[key] = (grouped[key] || 0) + Number(r.profitEok || 0);
      });
      const entries = Object.entries(grouped).sort((a,b) => b[1] - a[1]);
      if (!entries.length) return null;
      return { date: entries[0][0], net: entries[0][1] };
    }

    function getFlowInfo(s) {
      if (!s.totalGames) {
        return {
          badge: "기록 대기",
          cls: "",
          title: "오늘의 승부를 기록해보세요",
          message: "루디스가 승패, 손익, 승률, 연승·연패 흐름을 한눈에 정리해드립니다."
        };
      }

      const recent = records.slice(-10);
      const recentNet = recent.reduce((sum, r) => sum + Number(r.profitEok || 0), 0);
      const recentWins = recent.filter(r => r.result === "win").length;
      const recentRate = recent.length ? recentWins / recent.length * 100 : 0;

      if (settings.targetProfitEok > 0 && s.net >= settings.targetProfitEok) {
        return {
          badge: "목표 달성",
          cls: "good",
          title: "목표 수익에 도달했습니다",
          message: `현재 순손익 ${formatEok(s.net)}입니다. 더 욕심내기보다 흐름을 지키는 선택도 좋아요.`
        };
      }

      if (settings.lossWarningEok > 0 && s.net <= -Math.abs(settings.lossWarningEok)) {
        return {
          badge: "위험 구간",
          cls: "bad",
          title: "손실 경고선에 도달했습니다",
          message: `현재 순손익 ${formatEok(s.net)}입니다. 추격 베팅보다 잠깐 멈추는 선택이 필요합니다.`
        };
      }

      if (s.streak >= 3) {
        return {
          badge: "과열 상승세",
          cls: "warn",
          title: `${s.streak}연승 중입니다`,
          message: "흐름은 좋지만 연승 뒤 금액을 키우는 구간은 특히 조심하세요."
        };
      }

      if (s.streak <= -3) {
        return {
          badge: "휴식 추천",
          cls: "bad",
          title: `${Math.abs(s.streak)}연패 중입니다`,
          message: "연패 구간에서는 기록이 신호입니다. 금액을 줄이거나 쉬어가는 게 좋습니다."
        };
      }

      if (recent.length >= 5 && recentNet > 0 && recentRate >= 60) {
        return {
          badge: "상승 흐름",
          cls: "good",
          title: "최근 흐름이 좋습니다",
          message: `최근 ${recent.length}판 기준 승률 ${recentRate.toFixed(1)}%, 손익 ${formatEok(recentNet)}입니다.`
        };
      }

      if (s.net > 0) {
        return {
          badge: "✅ 수익 흐름",
          cls: "good",
          title: "전체 흐름은 수익권입니다",
          message: `현재 총 순손익은 ${formatEok(s.net)}입니다. 기록을 유지하면서 흐름을 확인하세요.`
        };
      }

      if (s.net < 0) {
        return {
          badge: "⚠️ 손실 구간",
          cls: "warn",
          title: "현재는 손실 구간입니다",
          message: `현재 총 순손익은 ${formatEok(s.net)}입니다. 무리한 추격보다 기록 기준으로 조절하세요.`
        };
      }

      return {
        badge: "균형 구간",
        cls: "",
        title: "승부 흐름을 쌓는 중입니다",
        message: "기록이 쌓일수록 오늘 리포트와 주간 흐름이 더 정확해집니다."
      };
    }

    function clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    }

    function getNextChance(s) {
      // 보안 강화: 유료 계산식은 index.html에 두지 않습니다.
      // 실제 다음판 예상 확률은 Supabase 함수 vip_get_next_chance가
      // access_id + device_id를 검증한 뒤 계산해서 내려준 결과만 사용합니다.
      if (serverNextChanceData && serverNextChanceData.ok) {
        return {
          win: Number(serverNextChanceData.win || 50),
          loss: Number(serverNextChanceData.loss || 50),
          confidence: serverNextChanceData.confidence || "낮음",
          message: serverNextChanceData.message || "서버 계산 결과입니다."
        };
      }
      return {
        win: 50,
        loss: 50,
        confidence: "서버 대기",
        message: "VIP 서버 검증 후 표시됩니다."
      };
    }

    function getRecentAnalysis(s) {
      const recent = records.slice(-10);
      const recentWins = recent.filter(r => r.result === "win").length;
      const recentNet = recent.reduce((sum, r) => sum + Number(r.profitEok || 0), 0);
      const recentRate = recent.length ? recentWins / recent.length * 100 : 0;
      let signal = "기록 대기";
      let note = "기록이 쌓이면 최근 흐름을 분석합니다.";

      if (recent.length) {
        signal = "균형";
        note = `최근 ${recent.length}판 기준 ${recentWins}승 ${recent.length - recentWins}패입니다.`;
      }
      if (s.streak >= 3) {
        signal = "과열";
        note = `${s.streak}연승 중입니다. 흐름은 좋지만 금액을 키우는 구간은 조심하세요.`;
      } else if (s.streak <= -3) {
        signal = "휴식";
        note = `${Math.abs(s.streak)}연패 중입니다. 추격보다 쉬어가는 신호로 보는 게 좋습니다.`;
      } else if (recent.length >= 5 && recentNet > 0 && recentRate >= 60) {
        signal = "상승";
        note = `최근 흐름이 좋습니다. 최근 손익은 ${formatEok(recentNet)}입니다.`;
      } else if (recent.length >= 5 && recentNet < 0 && recentRate <= 40) {
        signal = "주의";
        note = `최근 손익이 ${formatEok(recentNet)}입니다. 금액 조절이 필요한 구간입니다.`;
      }

      return { recent, recentWins, recentNet, recentRate, signal, note };
    }

    function getRiskInfo(s) {
      let risk = 10;
      let note = "안정 구간입니다. 기록을 유지하면서 흐름을 확인하세요.";

      if (s.net < 0) risk += Math.min(25, Math.abs(s.net) / 100);
      if (s.streak <= -1) risk += Math.min(35, Math.abs(s.streak) * 12);
      if (s.streak >= 3) risk += Math.min(25, s.streak * 7);

      if (settings.lossWarningEok > 0) {
        const ratio = Math.abs(Math.min(0, s.net)) / Math.abs(settings.lossWarningEok) * 100;
        risk = Math.max(risk, ratio);
      }

      risk = clamp(Math.round(risk), 0, 100);
      let cls = "";
      if (risk >= 70) {
        cls = "bad";
        note = "위험 신호가 높습니다. 연패·손실 구간에서는 무리한 추격을 조심하세요.";
      } else if (risk >= 45) {
        cls = "warn";
        note = "주의 구간입니다. 다음 기록은 금액을 키우기보다 흐름 확인용으로 보는 게 좋습니다.";
      }

      return { risk, cls, note };
    }

    function getTargetInfo(s) {
      if (!settings.targetProfitEok || settings.targetProfitEok <= 0) {
        return { percent: 0, note: "목표 수익을 설정하면 진행률이 표시됩니다." };
      }
      const percent = clamp(Math.round((s.net / settings.targetProfitEok) * 100), 0, 100);
      const remain = Math.max(0, settings.targetProfitEok - s.net);
      return {
        percent,
        note: percent >= 100 ? "목표 수익을 달성했습니다. 쉬어가는 선택도 좋습니다." : `목표까지 ${formatEok(remain)} 남았습니다.`
      };
    }

    function renderDiceBoard(s) {
      const analysis = getRecentAnalysis(s);
      const risk = getRiskInfo(s);
      const target = getTargetInfo(s);
      const recent6 = records.slice(-6);

      const strip = document.getElementById("diceFlowStrip");
      if (strip) {
        if (!recent6.length) {
          strip.innerHTML = `<div class="flow-empty">아직 기록이 없습니다.</div>`;
        } else {
          const chips = recent6.map((r, idx) => {
            const text = r.result === "win" ? "승" : "패";
            const isLatest = idx === recent6.length - 1;
            const cls = `flow-chip ${r.result === "win" ? "win" : "loss"}${isLatest ? " latest" : ""}`;
            const latestLabel = isLatest ? "<small>최신</small>" : "";
            return `<span class="${cls}" title="${formatDate(r.createdAt)} / ${formatEok(r.profitEok)}"><b>${text}</b>${latestLabel}</span>`;
          });
          strip.innerHTML = chips.join("");
          strip.scrollLeft = strip.scrollWidth;
        }
      }

      const diceNote = document.getElementById("diceFlowNote");
      if (diceNote) {
        if (analysis.recent.length) {
          diceNote.innerHTML = `
            <div class="flow-note-line">왼쪽은 오래된 기록, 오른쪽은 최신 기록입니다.</div>
            <div class="flow-note-line">최근 6판 · ${analysis.recentWins}승 ${analysis.recent.length - analysis.recentWins}패 · ${formatEok(analysis.recentNet)}</div>
            <div class="flow-note-line">${analysis.note}</div>
          `;
        } else {
          diceNote.innerHTML = `
            <div class="flow-note-line">왼쪽은 오래된 기록, 오른쪽은 최신 기록입니다.</div>
            <div class="flow-note-line">최근 6판 흐름이 여기에 표시됩니다.</div>
            <div class="flow-note-line">기록이 쌓이면 최근 흐름 분석이 함께 표시됩니다.</div>
          `;
        }
      }

      const tip = document.getElementById("smartTipText");
      if (tip) tip.textContent = "";

      const riskBar = document.getElementById("quickRiskBar");
      const riskText = document.getElementById("quickRiskText");
      const riskNote = document.getElementById("quickRiskNote");
      if (riskBar) {
        riskBar.style.width = risk.risk + "%";
        riskBar.className = "risk-fill" + (risk.cls ? " " + risk.cls : "");
      }
      if (riskText) riskText.textContent = risk.risk + "%";
      if (riskNote) riskNote.textContent = risk.note;

      renderNextChanceVipState(serverNextChanceData);

      const recentWinRateMini = document.getElementById("recentWinRateMini");
      const recentNetMini = document.getElementById("recentNetMini");
      const signalMini = document.getElementById("signalMini");
      const targetProgressMini = document.getElementById("targetProgressMini");
      const riskStageMini = document.getElementById("riskStageMini");
      const playTipMini = document.getElementById("playTipMini");
      if (recentWinRateMini) recentWinRateMini.textContent = analysis.recent.length ? `${analysis.recentRate.toFixed(1)}%` : "0%";
      if (recentNetMini) recentNetMini.textContent = formatEok(analysis.recentNet);
      if (signalMini) signalMini.textContent = analysis.signal;
      if (targetProgressMini) targetProgressMini.textContent = `${target.percent}%`;
      if (riskStageMini) riskStageMini.textContent = risk.risk >= 70 ? "위험" : risk.risk >= 45 ? "주의" : "안정";
      if (playTipMini) playTipMini.textContent = analysis.note;
    }

    function renderNextChance(s) {
      renderNextChanceVipState(serverNextChanceData);
      scheduleServerNextChanceRefresh(s);
    }

    function renderHeroAndReports(s) {
      const today = getReportStats(getRecordsForToday());
      const analysis = getRecentAnalysis(s);
      const risk = getRiskInfo(s);
      const flow = getFlowInfo(s);

      renderDiceBoard(s);

      const badge = document.getElementById("flowBadge");
      if (badge) {
        badge.textContent = flow.badge;
        badge.className = "state-chip" + (flow.cls ? " " + flow.cls : "");
      }

      const title = document.getElementById("flowTitle");
      const message = document.getElementById("flowMessage");
      if (title) title.textContent = flow.title;
      if (message) message.textContent = flow.message;

      const quickTodayNet = document.getElementById("quickTodayNet");
      const quickWinRate = document.getElementById("quickWinRate");
      const quickStreak = document.getElementById("quickStreak");
      const quickTodayGames = document.getElementById("quickTodayGames");
      if (quickTodayNet) quickTodayNet.textContent = formatEok(today.net);
      if (quickWinRate) quickWinRate.textContent = s.totalGames ? `${s.winRate.toFixed(1)}%` : "0%";
      if (quickStreak) quickStreak.textContent = s.streak > 0 ? `${s.streak}연승` : s.streak < 0 ? `${Math.abs(s.streak)}연패` : "균형";
      if (quickTodayGames) quickTodayGames.textContent = `${today.totalGames}판`;

      const todayGamesMini = document.getElementById("todayGamesMini");
      const todayWinLossMini = document.getElementById("todayWinLossMini");
      const avgBetMini = document.getElementById("avgBetMini");
      const maxFlowMini = document.getElementById("maxFlowMini");
      const todayMiniNote = document.getElementById("todayMiniNote");
      if (todayGamesMini) todayGamesMini.textContent = `${today.totalGames}판`;
      if (todayWinLossMini) todayWinLossMini.textContent = `${today.wins}승 ${today.losses}패`;
      if (avgBetMini) avgBetMini.textContent = formatEok(s.avgBet);
      if (maxFlowMini) {
        maxFlowMini.textContent = today.totalGames ? `최대 ${today.maxWinStreak}연승 / ${today.maxLossStreak}연패` : "기록 없음";
      }
      if (todayMiniNote) {
        todayMiniNote.textContent = today.totalGames
          ? `오늘 손익 ${formatEok(today.net)} · 오늘 승률 ${today.winRate.toFixed(1)}%`
          : "오늘 기록이 쌓이면 요약이 자동으로 표시됩니다.";
      }
    }

    function scrollToInput() {
      document.getElementById("recordInputPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => document.getElementById("amountInput")?.focus(), 450);
    }

    async function copyShareCard() {
      if (!await requireAccess()) return;
      const s = getStats();
      const today = getReportStats(getRecordsForToday());
      const flow = getFlowInfo(s);
      const text = [
        "🎲 [루디스 오늘의 기록]",
        `오늘 ${today.totalGames}판 · ${today.wins}승 ${today.losses}패`,
        `오늘 승률 ${today.totalGames ? today.winRate.toFixed(1) : "0.0"}%`,
        `오늘 손익 ${formatEok(today.net)}`,
        `전체 순손익 ${formatEok(s.net)}`,
        `현재 흐름 ${s.streak > 0 ? s.streak + "연승" : s.streak < 0 ? Math.abs(s.streak) + "연패" : "균형"}`,
        `${flow.badge} · ${flow.title}`
      ].join("\n");
      navigator.clipboard.writeText(text).then(() => alert("공유 문구를 복사했습니다."));
    }

    function hashString(str) {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
      }
      return Math.abs(h);
    }

    function getTodayKey() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }

    function loadDailyFortune() {
      try {
        const saved = JSON.parse(localStorage.getItem(FORTUNE_KEY) || "null");
        if (!saved || saved.date !== getTodayKey()) return null;
        return saved;
      } catch {
        return null;
      }
    }

    function saveDailyFortune(fortune) {
      localStorage.setItem(FORTUNE_KEY, JSON.stringify(fortune));
    }

    function buildFortune(seed, s) {
      const flows = [
        "신중한 흐름",
        "균형 좋은 날",
        "기록운 상승",
        "소액 안정운",
        "타이밍 관찰",
        "무리 금지",
        "짧게 먹는 날",
        "흐름 반전운"
      ];
      const styles = [
        "소액 유지",
        "기준 금액 고정",
        "2연패 후 휴식",
        "목표 도달 시 정리",
        "흐름 확인 위주",
        "큰 판 자제",
        "짧은 판수 운영",
        "수익권 방어"
      ];
      const warnings = [
        "추격 베팅",
        "연승 후 과열",
        "손실 회복 욕심",
        "금액 급상승",
        "장시간 플레이",
        "감정 베팅",
        "목표 초과 욕심",
        "무계획 재도전"
      ];
      const oneLines = [
        "오늘은 크게 먹기보다 흐름을 지키는 쪽이 좋습니다.",
        "이긴 뒤 금액을 키우는 순간을 조심하세요.",
        "기록이 흔들리면 잠깐 쉬는 것도 전략입니다.",
        "손익보다 판수 조절이 더 중요한 날입니다.",
        "좋은 흐름은 짧게 먹고 지키는 게 핵심입니다.",
        "추격보다 기준을 먼저 정하는 게 좋습니다.",
        "수익권에 들어오면 욕심보다 마무리를 생각하세요.",
        "오늘은 감보다 기록을 더 믿는 게 좋습니다."
      ];

      const pick = (arr, offset = 0) => arr[(seed + offset) % arr.length];
      let score = 50 + (seed % 41); // 50~90
      if (s.streak <= -3) score = Math.max(45, score - 12);
      if (s.streak >= 3) score = Math.max(45, score - 7);
      if (s.net > 0) score = Math.min(95, score + 4);
      if (s.net < 0) score = Math.max(40, score - 4);

      return {
        date: getTodayKey(),
        seed,
        flow: pick(flows, 0),
        dice: (seed % 6) + 1,
        score,
        style: pick(styles, 3),
        warning: pick(warnings, 5),
        oneLine: pick(oneLines, 7),
        advice: "오늘 운세가 뽑혔습니다. 결과는 내일까지 유지됩니다."
      };
    }

    function getFortuneInfo(s) {
      const saved = loadDailyFortune();
      if (!saved) {
        return {
          drawn: false,
          flow: "아직 뽑지 않음",
          dice: "🎲",
          score: "-",
          style: "운세 대기",
          warning: "운세 대기",
          oneLine: "운세를 뽑으면 한줄 조언이 표시됩니다.",
          advice: "오늘 운세를 직접 뽑아보세요. 하루에 한 번만 뽑을 수 있습니다."
        };
      }
      return Object.assign({ drawn: true }, saved);
    }

    async function drawTodayFortune() {
      if (!await requireAccess()) return;
      const existing = loadDailyFortune();
      if (existing) {
        alert("오늘 운세는 이미 뽑았습니다. 날짜가 바뀌면 다시 뽑을 수 있어요.");
        renderMenuFeatures();
        return;
      }

      const s = getStats();
      const seedBase = `${getTodayKey()}:${getDeviceId()}:${Date.now()}:${Math.random()}`;
      const seed = hashString(seedBase);
      const fortune = buildFortune(seed, s);
      saveDailyFortune(fortune);
      renderMenuFeatures();
      alert("오늘의 주사위 운세를 뽑았습니다!");
    }


    function diceFace(n) {
      const faces = ["⚀","⚁","⚂","⚃","⚄","⚅"];
      return faces[Number(n) - 1] || "?";
    }

    function loadPredictionDice() {
      try {
        return JSON.parse(localStorage.getItem(DICE_PREDICT_KEY) || "null");
      } catch {
        return null;
      }
    }

    function savePredictionDice(result) {
      localStorage.setItem(DICE_PREDICT_KEY, JSON.stringify(result));
    }

    function buildPredictionDiceResult(myDice, rivalDice) {
      const s = getStats();
      const vip = isVip();
      const base = vip ? getNextChance(s).win : 50;
      const diff = myDice - rivalDice;
      const diceBonus = diff * 1.6;
      const winChance = vip ? clamp(base + diceBonus, 35, 65) : null;
      let label = "균형";
      let advice = "동점입니다. 다음판은 기준 금액을 유지하면서 흐름을 확인하세요.";

      if (diff > 0) {
        label = "승리 기운";
        advice = `내 주사위가 ${diff}만큼 앞섰습니다. 다음판은 흐름이 좋아 보이지만 무리한 증액은 조심하세요.`;
      } else if (diff < 0) {
        label = "조심 구간";
        advice = `상대 주사위가 ${Math.abs(diff)}만큼 앞섰습니다. 다음판은 추격보다 기준 금액 유지가 좋아 보입니다.`;
      }

      if (myDice === 6 && rivalDice < 6) {
        label = "강한 승리 기운";
        advice = "내 주사위가 6입니다. 흐름은 좋지만, 이럴 때일수록 목표 수익 기준을 지키세요.";
      }

      if (myDice === 1 && rivalDice > 1) {
        label = "쉬어가기 신호";
        advice = "내 주사위가 1입니다. 다음판은 무리하게 들어가기보다 잠깐 쉬어가는 신호로 보세요.";
      }

      return {
        createdAt: new Date().toISOString(),
        myDice,
        rivalDice,
        diff,
        base,
        winChance,
        label,
        advice
      };
    }

    function renderPredictionDice() {
      const result = loadPredictionDice();
      const myEl = document.getElementById("myPredictionDice");
      const rivalEl = document.getElementById("rivalPredictionDice");
      const resultText = document.getElementById("predictionResultText");
      const chanceText = document.getElementById("predictionWinChance");
      const adviceText = document.getElementById("predictionAdvice");

      if (!myEl || !rivalEl || !resultText || !chanceText || !adviceText) return;

      if (!result) {
        myEl.textContent = "?";
        rivalEl.textContent = "?";
        resultText.textContent = "대기";
        chanceText.textContent = isVip() ? "-" : "VIP 전용";
        adviceText.textContent = "버튼을 누르면 내 주사위와 상대 주사위가 함께 굴러갑니다.";
        return;
      }

      myEl.textContent = diceFace(result.myDice);
      rivalEl.textContent = diceFace(result.rivalDice);
      resultText.textContent = result.label;
      chanceText.textContent = isVip() && Number.isFinite(result.winChance) ? result.winChance.toFixed(1) + "%" : "VIP 전용";
      adviceText.textContent = result.advice;
    }

    async function rollPredictionDice() {
      if (!await requireAccess()) return;

      const btn = document.getElementById("predictionDiceButton");
      const myEl = document.getElementById("myPredictionDice");
      const rivalEl = document.getElementById("rivalPredictionDice");
      if (!btn || !myEl || !rivalEl) return;

      btn.disabled = true;
      btn.textContent = "🎲 굴리는 중...";
      myEl.classList.add("rolling");
      rivalEl.classList.add("rolling");

      let tick = 0;
      const timer = setInterval(() => {
        myEl.textContent = diceFace(1 + Math.floor(Math.random() * 6));
        rivalEl.textContent = diceFace(1 + Math.floor(Math.random() * 6));
        tick += 1;
        if (tick >= 12) {
          clearInterval(timer);
          const myDice = 1 + Math.floor(Math.random() * 6);
          const rivalDice = 1 + Math.floor(Math.random() * 6);
          const result = buildPredictionDiceResult(myDice, rivalDice);
          savePredictionDice(result);
          myEl.classList.remove("rolling");
          rivalEl.classList.remove("rolling");
          renderPredictionDice();
          btn.disabled = false;
          btn.textContent = "🎲 예측 주사위 다시 굴리기";
        }
      }, 70);
    }


    function loadDailyByKey(key) {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (!saved || saved.date !== getTodayKey()) return null;
        return saved;
      } catch {
        return null;
      }
    }

    function saveDailyByKey(key, value) {
      localStorage.setItem(key, JSON.stringify(Object.assign({ date: getTodayKey() }, value)));
    }

    function getFinishTiming(s, today) {
      if (!today.totalGames) {
        return { label:"기록 대기", cls:"", advice:"오늘 기록이 쌓이면 마무리 타이밍을 알려드립니다." };
      }
      if (today.net > 0 && today.winRate >= 55) {
        return { label:"마무리 추천", cls:"good", advice:`오늘 손익 ${formatEok(today.net)}, 승률 ${today.winRate.toFixed(1)}%입니다. 좋은 흐름일 때 마무리하는 것도 전략입니다.` };
      }
      if (today.maxLossStreak >= 3 || today.net < 0) {
        return { label:"쉬어가기 추천", cls:"bad", advice:`오늘 손익 ${formatEok(today.net)}입니다. 추격보다 기록 저장 후 쉬어가는 흐름이 좋습니다.` };
      }
      if (today.totalGames >= 10) {
        return { label:"⚠️ 판수 체크", cls:"warn", advice:"오늘 판수가 늘어나고 있습니다. 목표 없이 계속 굴리는 구간을 조심하세요." };
      }
      return { label:"⚖️ 유지 가능", cls:"", advice:"아직 무리한 흐름은 아닙니다. 기준 금액과 목표를 유지하세요." };
    }

    function getStyleAnalysis(s, today) {
      const recent = getRecentAnalysis(s);
      if (!s.totalGames) {
        return { label:"기록 대기", cls:"", type:"기록 대기", warning:"기록 필요", desc:"기록이 쌓이면 승부 스타일을 분석합니다." };
      }

      if (s.streak <= -3 || (recent.recentNet < 0 && recent.recentRate <= 40)) {
        return { label:"추격 주의형", cls:"bad", type:"추격 주의형", warning:"연패 후 증액", desc:"손실 구간에서 흐름을 되돌리려는 패턴이 보입니다. 쉬는 기준을 먼저 정하는 게 좋습니다." };
      }
      if (s.streak >= 3 || (recent.recentNet > 0 && recent.recentRate >= 65)) {
        return { label:"흐름 공격형", cls:"warn", type:"흐름 공격형", warning:"연승 후 과열", desc:"좋은 흐름을 잘 타는 편입니다. 다만 연승 후 금액을 키우는 순간을 조심하세요." };
      }
      if (s.winRate >= 55 && s.net >= 0) {
        return { label:"✅ 안정 수익형", cls:"good", type:"안정 수익형", warning:"목표 초과 욕심", desc:"전체 기록이 안정적입니다. 목표 수익에 도달하면 마무리 기준을 지키는 게 좋습니다." };
      }
      return { label:"⚖️ 균형 기록형", cls:"", type:"균형 기록형", warning:"무계획 장기전", desc:"큰 쏠림 없이 기록을 이어가는 스타일입니다. 판수와 손실선을 함께 관리하면 좋습니다." };
    }

    function loadDailyTarot() {
      return loadDailyByKey(TAROT_KEY);
    }

    function buildTarot(seed, s) {
      const cards = [
        { icon:"⚅", name:"승리의 6", meaning:"흐름이 강하게 들어올 수 있는 날입니다.", advice:"좋은 흐름이 와도 목표 수익에서 멈추는 기준을 지키세요." },
        { icon:"⚂", name:"균형의 3", meaning:"승패가 크게 쏠리지 않는 균형의 날입니다.", advice:"기준 금액을 유지하며 기록을 쌓는 쪽이 좋습니다." },
        { icon:"⚀", name:"휴식의 1", meaning:"무리하면 흐름이 꼬일 수 있는 날입니다.", advice:"연패가 보이면 빠르게 쉬어가는 선택이 좋습니다." },
        { icon:"⚃", name:"반전의 4", meaning:"초반 흐름과 후반 흐름이 달라질 수 있습니다.", advice:"초반 결과만 보고 금액을 키우지 마세요." },
        { icon:"⚄", name:"과열의 5", meaning:"연승 뒤 과열을 조심해야 하는 날입니다.", advice:"수익권일수록 마무리 타이밍을 확인하세요." },
        { icon:"⚁", name:"흐름의 2", meaning:"작은 흐름을 잘 읽으면 안정적으로 운영할 수 있습니다.", advice:"최근 6판 흐름과 현재 위험도를 함께 보세요." }
      ];
      const idx = seed % cards.length;
      return Object.assign({ date:getTodayKey(), seed }, cards[idx]);
    }

    async function drawTodayTarot() {
      if (!await requireAccess()) return;
      const existing = loadDailyTarot();
      if (existing) {
        alert("오늘의 주사위 카드는 이미 뽑았습니다. 날짜가 바뀌면 다시 뽑을 수 있어요.");
        renderMenuFeatures();
        return;
      }
      const seed = hashString(`${getTodayKey()}:tarot:${getDeviceId()}:${Date.now()}:${Math.random()}`);
      const tarot = buildTarot(seed, getStats());
      saveDailyByKey(TAROT_KEY, tarot);
      renderMenuFeatures();
      alert("오늘의 주사위 카드를 뽑았습니다!");
    }

    function renderExtraFeatures() {
      const s = getStats();
      const today = getReportStats(getRecordsForToday());
      const finish = getFinishTiming(s, today);
      const style = getStyleAnalysis(s, today);
      const tarot = loadDailyTarot();

      const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };

      const finishBadge = document.getElementById("finishBadge");
      if (finishBadge) {
        finishBadge.textContent = finish.label;
        finishBadge.className = "condition-badge" + (finish.cls ? " " + finish.cls : "");
      }
      setText("finishAdvice", finish.advice);
      setText("finishTodayNet", formatEok(today.net));
      setText("finishTodayRate", today.totalGames ? today.winRate.toFixed(1) + "%" : "0%");

      const styleBadge = document.getElementById("styleBadge");
      if (styleBadge) {
        styleBadge.textContent = style.label;
        styleBadge.className = "condition-badge" + (style.cls ? " " + style.cls : "");
      }
      setText("styleType", style.type);
      setText("styleWarning", style.warning);
      setText("styleDesc", style.desc);

      const tarotBtn = document.getElementById("tarotDrawButton");
      if (tarot) {
        setText("tarotIcon", tarot.icon);
        setText("tarotName", tarot.name);
        setText("tarotMeaning", tarot.meaning);
        setText("tarotAdvice", tarot.advice + " 날짜가 바뀌면 다시 뽑을 수 있습니다.");
        if (tarotBtn) {
          tarotBtn.disabled = true;
          tarotBtn.textContent = "✅ 오늘의 카드 뽑기 완료";
        }
      } else {
        setText("tarotIcon", "🎴");
        setText("tarotName", "아직 뽑지 않음");
        setText("tarotMeaning", "오늘의 주사위 카드를 직접 뽑아보세요.");
        setText("tarotAdvice", "하루에 한 번 뽑을 수 있고, 날짜가 바뀌면 다시 뽑을 수 있습니다.");
        if (tarotBtn) {
          tarotBtn.disabled = false;
          tarotBtn.textContent = "🎴 오늘의 카드 뽑기";
        }
      }
    }

    function getConditionInfo(s) {
      const risk = getRiskInfo(s);
      const analysis = getRecentAnalysis(s);

      if (!s.totalGames) {
        return {
          label: "기록 대기",
          cls: "",
          detail: "아직 기록이 없습니다. 첫 판을 기록하면 컨디션을 분석합니다."
        };
      }

      if (risk.risk >= 70 || s.streak <= -3) {
        return {
          label: "휴식 추천",
          cls: "bad",
          detail: "연패 또는 손실 위험이 높습니다. 추격보다 잠깐 쉬는 쪽이 안전합니다."
        };
      }

      if (risk.risk >= 45 || s.streak >= 3) {
        return {
          label: "⚠️ 조심 구간",
          cls: "warn",
          detail: "흐름은 보이지만 과열 가능성이 있습니다. 금액을 키우는 구간은 조심하세요."
        };
      }

      if (analysis.recentNet > 0 && analysis.recentRate >= 55) {
        return {
          label: "흐름 좋음",
          cls: "good",
          detail: "최근 손익과 승률이 괜찮습니다. 다만 목표 도달 시 정리하는 기준을 유지하세요."
        };
      }

      return {
        label: "⚖️ 균형",
        cls: "",
        detail: "무리 없이 기록을 이어가기 좋은 구간입니다. 다음 판도 기준 금액을 유지하세요."
      };
    }

    function renderMenuFeatures() {
      const overlay = document.getElementById("menuOverlay");
      if (!overlay) return;

      const s = getStats();
      const today = getReportStats(getRecordsForToday());
      const risk = getRiskInfo(s);
      const chance = getNextChance(s);
      const analysis = getRecentAnalysis(s);
      const target = getTargetInfo(s);
      const fortune = getFortuneInfo(s);
      const condition = getConditionInfo(s);
      renderPredictionDice();
      renderExtraFeatures();
      renderAutoDicePanel();

      const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };

      setText("fortuneFlow", fortune.flow);
      setText("fortuneDice", fortune.drawn ? "🎲" + fortune.dice : "🎲");
      setText("fortuneAdvice", fortune.advice);
      setText("fortuneNumber", fortune.drawn ? String(fortune.dice) : "-");
      setText("fortuneScore", fortune.drawn ? fortune.score + "점" : "-");
      setText("fortuneStyle", fortune.style);
      setText("fortuneWarning", fortune.warning);
      setText("fortuneOneLine", fortune.oneLine);

      const fortuneDrawButton = document.getElementById("fortuneDrawButton");
      const fortuneDrawNote = document.getElementById("fortuneDrawNote");
      if (fortuneDrawButton) {
        fortuneDrawButton.disabled = !!fortune.drawn;
        fortuneDrawButton.textContent = fortune.drawn ? "✅ 오늘 운세 뽑기 완료" : "🎲 오늘 운세 뽑기";
      }
      if (fortuneDrawNote) {
        fortuneDrawNote.textContent = fortune.drawn
          ? "오늘 운세는 이미 뽑았습니다. 날짜가 바뀌면 다시 뽑을 수 있습니다."
          : "오늘 운세는 현재 브라우저에 저장되며, 날짜가 바뀌면 다시 뽑을 수 있습니다.";
      }

      const conditionBadge = document.getElementById("conditionBadge");
      if (conditionBadge) {
        conditionBadge.textContent = condition.label;
        conditionBadge.className = "condition-badge" + (condition.cls ? " " + condition.cls : "");
      }
      setText("conditionDetail", condition.detail);
      setText("menuRisk", risk.risk + "%");
      setText("menuNextChance", isVip() && serverNextChanceData ? chance.win.toFixed(1) + "%" : (isVip() ? "서버 대기" : "VIP 전용"));
      const menuNextChanceMetric = document.getElementById("menuNextChanceMetric");
      if (menuNextChanceMetric) menuNextChanceMetric.classList.toggle("vip-locked", !isVip());
      setText("menuSignal", analysis.signal);
      setText("menuStreak", s.streak > 0 ? `${s.streak}연승` : s.streak < 0 ? `${Math.abs(s.streak)}연패` : "균형");

      const inputAmount = parseEok(document.getElementById("amountInput")?.value || "");
      const baseAmount = inputAmount || s.avgBet || 0;
      const targetRemain = Math.max(0, (settings.targetProfitEok || 0) - s.net);
      const lossBuffer = settings.lossWarningEok > 0 ? Math.max(0, Math.abs(settings.lossWarningEok) + s.net) : 0;

      setText("goalRemain", settings.targetProfitEok > 0 ? formatEok(targetRemain) : "목표 미설정");
      setText("goalWinsNeeded", baseAmount > 0 && settings.targetProfitEok > 0 ? Math.ceil(targetRemain / baseAmount) + "승" : "계산 대기");
      setText("lossBuffer", settings.lossWarningEok > 0 ? formatEok(lossBuffer) : "경고선 미설정");
      setText("lossesToWarning", baseAmount > 0 && settings.lossWarningEok > 0 ? Math.ceil(lossBuffer / baseAmount) + "패" : "계산 대기");
      setText("goalCalcNote", baseAmount > 0 ? `계산 기준 베팅금: ${formatEok(baseAmount)} · 목표 진행률 ${target.percent}%` : "베팅 금액을 입력하면 더 정확하게 계산됩니다.");

      setText("menuTodayGames", today.totalGames + "판");
      setText("menuTodayWinLoss", `${today.wins}승 ${today.losses}패`);
      setText("menuTodayNet", formatEok(today.net));
      setText("menuTodayRate", today.totalGames ? today.winRate.toFixed(1) + "%" : "0%");
      setText("menuBestWin", formatEok(today.bestWin));
      setText("menuWorstLoss", formatEok(today.worstLoss));
      setText("menuReportNote", today.totalGames ? `오늘 최대 흐름: ${today.maxWinStreak}연승 / ${today.maxLossStreak}연패` : "오늘 기록이 쌓이면 리포트가 표시됩니다.");
    }

    async function openSideMenu(tab = "fortune") {
      if (!await requireAccess()) return;
      if (tab === "auto" && !requireVipFeature("자동저장")) return;
      renderMenuFeatures();
      const overlay = document.getElementById("menuOverlay");
      if (!overlay) return;
      overlay.classList.remove("hidden");
      showMenuTab(tab);
    }

    function closeSideMenu() {
      const overlay = document.getElementById("menuOverlay");
      if (overlay) overlay.classList.add("hidden");
    }

    function showMenuTab(tab) {
      document.querySelectorAll(".menu-tab").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.menuTab === tab);
      });
      document.querySelectorAll(".menu-panel").forEach(panel => panel.classList.remove("active"));
      const target = document.getElementById("menuPanel" + tab.charAt(0).toUpperCase() + tab.slice(1));
      if (target) target.classList.add("active");
      renderMenuFeatures();
    }


    function loadAutoDiceSettings() {
      try {
        return Object.assign({ userId: "", enabled: false, startedAt: "", lastCheckAt: "", savedCount: 0, lastError: "" }, JSON.parse(localStorage.getItem(AUTO_DICE_KEY) || "{}"));
      } catch {
        return { userId: "", enabled: false, startedAt: "", lastCheckAt: "", savedCount: 0, lastError: "" };
      }
    }

    function saveAutoDiceSettings(value) {
      localStorage.setItem(AUTO_DICE_KEY, JSON.stringify(value || {}));
    }

    function getAutoProcessedKeys() {
      try {
        const arr = JSON.parse(localStorage.getItem(AUTO_DICE_PROCESSED_KEY) || "[]");
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }

    function saveAutoProcessedKeys(keys) {
      const clean = Array.from(new Set((keys || []).filter(Boolean))).slice(-800);
      localStorage.setItem(AUTO_DICE_PROCESSED_KEY, JSON.stringify(clean));
    }

    function markAutoProcessed(log) {
      const keys = getAutoProcessedKeys();
      if (log.externalId) keys.push(log.externalId);
      if (log.fingerprint) keys.push(log.fingerprint);
      saveAutoProcessedKeys(keys);
    }

    function isAutoProcessed(log) {
      const keys = new Set(getAutoProcessedKeys());
      return keys.has(log.externalId) || keys.has(log.fingerprint);
    }

    function getAutoDiceSettings() {
      return loadAutoDiceSettings();
    }

    function getAutoRecords() {
      return records.filter(r => r.source === "api_auto").slice(-8).reverse();
    }

    function renderAutoDicePanel() {
      const cfg = getAutoDiceSettings();
      const input = document.getElementById("autoUserIdInput");
      if (input && document.activeElement !== input) input.value = cfg.userId || "";
      const quickInput = document.getElementById("quickAutoUserIdInput");
      if (quickInput && document.activeElement !== quickInput) quickInput.value = cfg.userId || "";

      const status = document.getElementById("autoModeStatus");
      const lastCheck = document.getElementById("autoLastCheck");
      const savedCount = document.getElementById("autoSavedCount");
      const toggleBtn = document.getElementById("autoDiceToggleBtn");
      const quickToggleBtn = document.getElementById("quickAutoToggleBtn");
      const quickBadge = document.getElementById("quickAutoModeBadge");
      const quickWarningBox = document.getElementById("quickAutoWarningBox");
      const notice = document.getElementById("autoDiceNotice");
      const list = document.getElementById("autoRecentList");

      if (status) status.textContent = cfg.enabled ? "ON" : "OFF";
      if (lastCheck) lastCheck.textContent = cfg.lastCheckAt ? formatDate(cfg.lastCheckAt) : "-";
      if (savedCount) savedCount.textContent = `${Number(cfg.savedCount || 0)}건`;
      if (toggleBtn) {
        toggleBtn.textContent = cfg.enabled ? "주사위 모드 OFF" : "주사위 모드 ON";
        toggleBtn.className = cfg.enabled ? "btn warn" : "btn primary";
      }
      if (quickToggleBtn) {
        quickToggleBtn.innerHTML = cfg.enabled
          ? "<span>⏸ 주사위 모드</span><span>OFF</span>"
          : "<span>주사위 모드</span><span>ON</span>";
        quickToggleBtn.className = cfg.enabled ? "btn warn quick-auto-btn" : "btn primary quick-auto-btn";
      }
      if (quickBadge) {
        quickBadge.textContent = cfg.enabled ? "자동저장 ON" : "자동저장 OFF";
        quickBadge.className = cfg.enabled ? "quick-auto-badge on" : "quick-auto-badge";
      }
      if (quickWarningBox) {
        quickWarningBox.className = cfg.enabled ? "quick-auto-warning good" : "quick-auto-warning";
        quickWarningBox.innerHTML = cfg.enabled
          ? `<div class="quick-auto-warning-title">✅ 주사위 모드가 켜져 있습니다</div>
             <div class="quick-auto-warning-text">
               지금부터는 <b>현금 거래 / 계좌 거래</b> 중 내 유저번호가 포함된 거래가 자동 기록될 수 있습니다.<br/>
               <b>주사위 외 현금/계좌 거래 전에는 반드시 OFF</b>로 바꿔주세요.
             </div>`
          : `<div class="quick-auto-warning-title">사용 전 안내</div>
             <div class="quick-auto-warning-text">
               주사위를 시작할 때만 모드를 켜주세요.<br/>
               모드 ON 상태에서는 <b>현금 거래 / 계좌 거래</b> 중 내 유저번호가 포함된 거래가 자동 기록될 수 있습니다.
             </div>`;
      }
      if (notice) {
        notice.textContent = cfg.lastError
          ? "오류: " + cfg.lastError
          : (cfg.enabled
              ? "주사위 모드 ON 상태입니다. 주사위 외 현금/계좌 거래 전에는 OFF 해주세요."
              : "주사위 모드를 켜면 현금 거래와 계좌 거래가 자동 감지됩니다.");
      }
      if (list) {
        const autoRecords = getAutoRecords();
        if (!autoRecords.length) {
          list.innerHTML = `<div class="auto-empty">아직 자동 기록이 없습니다.</div>`;
        } else {
          list.innerHTML = autoRecords.map(r => {
            const cls = r.result === "win" ? "good" : "bad";
            const title = r.result === "win" ? "승리 자동 저장" : "패배 자동 저장";
            return `<div class="auto-log-item ${cls}">
              <b>${title} · ${formatEok(r.amountEok)}</b>
              <span>${formatDate(r.createdAt)} · ${r.memo || "자동 기록"}</span>
            </div>`;
          }).join("");
        }
      }
      applyAutoVipLockNotice();
    }

    function applyAutoVipLockNotice() {
      const vip = isVip();
      const quick = document.getElementById("quickAutoBox");
      if (quick) quick.classList.toggle("vip-locked", !vip);
      ["quickAutoUserIdInput", "autoUserIdInput", "quickAutoToggleBtn", "autoDiceToggleBtn"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = !vip;
      });
    }

    async function saveAutoUserId() {
      if (!await requireAccess()) return;
      if (!requireVipFeature("자동저장")) return;
      const input = document.getElementById("autoUserIdInput");
      const userId = String(input?.value || "").replace(/[^0-9]/g, "").trim();
      if (!userId) {
        showLudisNotice("유저 번호 확인", "내 유저번호를 입력해주세요.");
        return;
      }
      const cfg = getAutoDiceSettings();
      cfg.userId = userId;
      cfg.lastError = "";
      saveAutoDiceSettings(cfg);
      renderAutoDicePanel();
      showLudisNotice("저장 완료", "내 유저번호를 저장했습니다.");
    }


    async function saveQuickAutoUserId() {
      if (!await requireAccess()) return;
      if (!requireVipFeature("자동저장")) return;
      const input = document.getElementById("quickAutoUserIdInput");
      const userId = String(input?.value || "").replace(/[^0-9]/g, "").trim();
      if (!userId) {
        showLudisNotice("유저 번호 확인", "내 유저번호를 입력해주세요.");
        return;
      }
      const cfg = getAutoDiceSettings();
      cfg.userId = userId;
      cfg.lastError = "";
      saveAutoDiceSettings(cfg);
      renderAutoDicePanel();
      showLudisNotice("저장 완료", "내 유저번호를 저장했습니다.");
    }

    async function toggleAutoDiceMode() {
      if (!await requireAccess()) return;
      if (!requireVipFeature("자동저장")) return;
      const cfg = getAutoDiceSettings();
      const input = document.getElementById("autoUserIdInput");
      const quickInput = document.getElementById("quickAutoUserIdInput");
      const userId = String(input?.value || quickInput?.value || cfg.userId || "").replace(/[^0-9]/g, "").trim();

      if (!cfg.enabled && !userId) {
        showLudisNotice("유저 번호 확인", "주사위 모드를 켜기 전에 내 유저번호를 입력해주세요.");
        return;
      }

      if (cfg.enabled) {
        cfg.enabled = false;
        cfg.lastError = "";
        saveAutoDiceSettings(cfg);
        stopAutoDiceTimer();
        renderAutoDicePanel();
        showLudisNotice("주사위 모드 OFF", "주사위 모드를 OFF 했습니다.\n\n현금/계좌 거래 자동기록이 중지되었습니다.");
        return;
      }

      if (!await showLudisConfirm("주사위 모드 ON", "주사위 모드를 ON 할까요?\n\nON 상태에서는 내 유저번호가 포함된 현금/계좌 거래가 자동으로 기록됩니다.\n\n주사위 외 현금/계좌 거래 전에는 OFF 해주세요.", "ON 하기", "취소")) return;

      cfg.userId = userId;
      cfg.enabled = true;
      cfg.startedAt = new Date().toISOString();
      cfg.lastCheckAt = "";
      cfg.lastError = "";
      saveAutoDiceSettings(cfg);
      startAutoDiceTimer();
      renderAutoDicePanel();
      await checkAutoDiceLogs(true);
    }

    function startAutoDiceTimer() {
      stopAutoDiceTimer();
      if (!isVip()) return;
      const cfg = getAutoDiceSettings();
      if (!cfg.enabled) return;
      autoDiceTimer = setInterval(() => {
        checkAutoDiceLogs(false);
      }, 5000);
    }

    function stopAutoDiceTimer() {
      if (autoDiceTimer) {
        clearInterval(autoDiceTimer);
        autoDiceTimer = null;
      }
    }

    async function checkAutoDiceLogs(manual = false) {
      if (!isVip()) {
        if (manual) requireVipFeature("자동저장");
        return;
      }
      const cfg = getAutoDiceSettings();
      if (!cfg.enabled && !manual) return;
      if (autoDiceBusy) return;
      if (!cfg.userId) {
        if (manual) showLudisNotice("유저 번호 확인", "내 유저번호를 먼저 저장해주세요.");
        return;
      }
      if (!AUTO_DICE_FUNCTION_URL || !AUTO_DICE_FUNCTION_URL.includes("/functions/v1/")) {
        if (manual) showLudisNotice("설정 확인", "자동 기록 함수 URL 설정을 확인해주세요.");
        return;
      }

      autoDiceBusy = true;
      try {
        const processedKeys = getAutoProcessedKeys();
        const res = await fetch(AUTO_DICE_FUNCTION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: Number(cfg.userId),
            modeStartedAt: cfg.startedAt || new Date().toISOString(),
            processedKeys,
            accessId: getSavedAccessId(),
            deviceId: getDeviceId()
          })
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data || !data.ok) {
          throw new Error((data && data.message) || `자동 기록 함수 오류(${res.status})`);
        }

        let saved = 0;
        const logs = Array.isArray(data.logs) ? data.logs : [];
        logs.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

        for (const log of logs) {
          if (!log || isAutoProcessed(log)) continue;
          if (records.some(r => r.externalLogId === log.externalId || r.externalLogFingerprint === log.fingerprint)) {
            markAutoProcessed(log);
            continue;
          }

          const amountEok = Number(log.amountEok || 0);
          if (!amountEok || amountEok <= 0) {
            markAutoProcessed(log);
            continue;
          }

          const result = log.result === "win" ? "win" : "loss";
          const profit = result === "win" ? amountEok : -amountEok;
          const tradeLabel = log.tradeType === "BANK_TRADE" ? "계좌" : "현금";
          const directionLabel = result === "win" ? "받음" : "보냄";
          const counterpart = log.counterpartName
            ? `${log.counterpartName}${log.counterpartId ? "(" + log.counterpartId + ")" : ""}`
            : "상대 미확인";

          records.push({
            id: "auto_" + Date.now().toString(36) + Math.random().toString(16).slice(2),
            createdAt: log.timestamp || new Date().toISOString(),
            result,
            amountEok,
            profitEok: profit,
            memo: `자동기록 · ${tradeLabel} · ${directionLabel} · 상대 ${counterpart}`,
            source: "api_auto",
            externalLogId: log.externalId || "",
            externalLogFingerprint: log.fingerprint || "",
            externalTradeType: log.tradeType || ""
          });

          markAutoProcessed(log);
          saved++;
        }

        cfg.lastCheckAt = new Date().toISOString();
        cfg.savedCount = Number(cfg.savedCount || 0) + saved;
        cfg.lastError = "";
        saveAutoDiceSettings(cfg);

        if (saved > 0) {
          saveRecords();
          render();
        } else {
          renderAutoDicePanel();
        }

        if (manual) {
          if (saved > 0) showLudisNotice("자동저장 완료", `${saved}건 자동 저장했습니다.`);
        }
      } catch (err) {
        console.error("자동 기록 오류:", err);
        cfg.lastError = err?.message || String(err);
        saveAutoDiceSettings(cfg);
        renderAutoDicePanel();
        if (manual) showLudisNotice("자동 기록 오류", "자동 기록 오류: " + cfg.lastError);
      } finally {
        autoDiceBusy = false;
      }
    }

    async function resetAutoDiceProcessed() {
      if (!await showLudisConfirm("자동 감지 기록 초기화", "자동 감지 중복 방지 기록만 초기화합니다. 기존 게임 기록은 삭제되지 않습니다. 계속할까요?", "초기화", "취소")) return;
      localStorage.removeItem(AUTO_DICE_PROCESSED_KEY);
      const cfg = getAutoDiceSettings();
      cfg.savedCount = 0;
      cfg.lastError = "";
      saveAutoDiceSettings(cfg);
      renderAutoDicePanel();
      showLudisNotice("초기화 완료", "자동 감지 기록을 초기화했습니다.");
    }

    function render() {
      const s = getStats();
      document.getElementById("totalBet").textContent = formatEok(s.totalBet);
      document.getElementById("totalProfit").textContent = formatEok(s.totalProfit);
      document.getElementById("totalLoss").textContent = formatEok(s.totalLoss);
      document.getElementById("netProfit").textContent = formatEok(s.net);
      document.getElementById("todayNet").textContent = "오늘 손익 " + formatEok(s.todayNet);
      document.getElementById("gameStats").textContent = `${s.totalGames}판 · 승률 ${s.winRate.toFixed(1)}% · ${s.wins}승 ${s.losses}패`;
      document.getElementById("avgBet").textContent = "평균 베팅 " + formatEok(s.avgBet);
      document.getElementById("streakText").textContent = s.streak > 0 ? `${s.streak}연승 중` : s.streak < 0 ? `${Math.abs(s.streak)}연패 중` : "연승/연패 없음";
      renderNextChance(s);
      renderHeroAndReports(s);
      document.getElementById("currentBalance").textContent = "현재 잔고 " + formatEok((settings.startBalanceEok || 0) + s.net);

      const netCard = document.getElementById("netCard");
      netCard.classList.toggle("good", s.net > 0);
      netCard.classList.toggle("bad", s.net < 0);
      renderNotice(s);
      renderRecords();
      drawChart();
      if (document.getElementById("menuOverlay") && !document.getElementById("menuOverlay").classList.contains("hidden")) {
        renderMenuFeatures();
      } else {
        renderAutoDicePanel();
      }
    }

    function renderNotice(s) {
      const box = document.getElementById("riskNotice");
      box.className = "notice";
      let msg = "무리한 추격 베팅보다 기록 유지가 더 중요합니다.";

      if (settings.targetProfitEok > 0 && s.net >= settings.targetProfitEok) {
        box.classList.add("success");
        msg = `목표 수익 ${formatEok(settings.targetProfitEok)} 달성. 더 욕심내기보다 쉬는 타이밍을 고려하세요.`;
      } else if (settings.lossWarningEok > 0 && s.net <= -Math.abs(settings.lossWarningEok)) {
        box.classList.add("danger");
        msg = `손실 경고선 ${formatEok(settings.lossWarningEok)} 도달. 추격 베팅은 위험합니다.`;
      } else if (s.streak <= -3) {
        box.classList.add("warning");
        msg = `${Math.abs(s.streak)}연패 중입니다. 베팅 금액을 줄이거나 잠깐 쉬는 게 좋습니다.`;
      } else if (s.streak >= 3) {
        box.classList.add("warning");
        msg = `${s.streak}연승 중입니다. 방심해서 금액을 키우는 구간을 조심하세요.`;
      }
      box.textContent = msg;
    }

    function renderRecords() {
      const list = document.getElementById("records");
      const filter = document.getElementById("filterSelect").value;
      const query = document.getElementById("searchInput").value.trim().toLowerCase();
      let items = records.map((r, index) => ({ ...r, __index: index })).reverse();

      if (filter === "win" || filter === "loss") items = items.filter(r => r.result === filter);
      if (filter === "today") items = items.filter(r => isToday(r.createdAt));
      if (query) items = items.filter(r => (r.memo || "").toLowerCase().includes(query));

      if (!items.length) {
        list.innerHTML = `<div class="empty">아직 표시할 기록이 없습니다.</div>`;
        return;
      }

      list.innerHTML = items.map(r => `
        <article class="record">
          <div class="record-head">
            <span class="badge ${r.result === "win" ? "win" : "loss"}">${r.result === "win" ? "승리" : "패배"}</span>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
              <span class="record-meta">${formatDate(r.createdAt)}</span>
              <button type="button" class="btn ghost" style="padding:5px 8px; font-size:12px; color:var(--bad); border-color:rgba(226,59,83,.25);" onclick="deleteRecord(${r.__index})">삭제</button>
            </div>
          </div>
          <div class="record-amount ${r.profitEok >= 0 ? "good-text" : "bad-text"}">
            ${r.profitEok >= 0 ? "+" : ""}${formatEok(r.profitEok)} <span class="mini">/ 베팅 ${formatEok(r.amountEok)}</span>
          </div>
          ${r.memo ? `<div class="record-memo">${escapeHtml(r.memo)}</div>` : `<div class="record-meta">메모 없음</div>`}
        </article>
      `).join("");
    }

    async function deleteRecord(index) {
      if (!await requireAccess()) return;
      const record = records[index];
      if (!record) return;

      const resultText = record.result === "win" ? "승리" : "패배";
      const profitText = `${record.profitEok >= 0 ? "+" : ""}${formatEok(record.profitEok)}`;
      const msg = `${resultText} 기록을 삭제할까요?
${profitText} / 베팅 ${formatEok(record.amountEok)}

삭제 후에는 되돌릴 수 없습니다.`;

      if (!confirm(msg)) return;
      records.splice(index, 1);
      saveRecords();
      render();
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
    }

    function drawChart() {
      const canvas = document.getElementById("chart");
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      const w = rect.width, h = rect.height;
      ctx.clearRect(0,0,w,h);

      const mode = document.getElementById("chartMode").value;
      let points = [];
      if (mode === "amount") {
        points = records.map((r,i) => ({ x: i, y: r.amountEok }));
      } else {
        let acc = 0;
        points = records.map((r,i) => { acc += r.profitEok; return { x: i, y: acc }; });
      }

      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--line");
      ctx.lineWidth = 1;
      for (let i=0;i<5;i++) {
        const y = 20 + (h-40) * i / 4;
        ctx.beginPath(); ctx.moveTo(36,y); ctx.lineTo(w-14,y); ctx.stroke();
      }

      if (!points.length) {
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
        ctx.textAlign = "center";
        ctx.fillText("기록을 저장하면 그래프가 표시됩니다.", w/2, h/2);
        return;
      }

      const ys = points.map(p => p.y);
      let minY = Math.min(...ys, 0), maxY = Math.max(...ys, 0);
      if (minY === maxY) { minY -= 1; maxY += 1; }
      const padL = 42, padR = 18, padT = 18, padB = 28;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;
      const xPos = i => padL + (points.length === 1 ? plotW/2 : (i / (points.length - 1)) * plotW);
      const yPos = y => padT + (maxY - y) / (maxY - minY) * plotH;

      const zeroY = yPos(0);
      ctx.strokeStyle = "rgba(128,128,128,.45)";
      ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(w-padR, zeroY); ctx.stroke();

      const grad = ctx.createLinearGradient(0, padT, 0, h-padB);
      grad.addColorStop(0, "rgba(99,91,255,.32)");
      grad.addColorStop(1, "rgba(0,162,255,.04)");
      ctx.beginPath();
      points.forEach((p,i) => {
        const x = xPos(i), y = yPos(p.y);
        if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.lineTo(xPos(points.length-1), h-padB);
      ctx.lineTo(xPos(0), h-padB);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      points.forEach((p,i) => {
        const x = xPos(i), y = yPos(p.y);
        if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--accent");
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();

      const last = points[points.length-1];
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--accent");
      ctx.beginPath(); ctx.arc(xPos(points.length-1), yPos(last.y), 4.5, 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
      ctx.font = "12px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(formatEok(maxY), 4, padT + 4);
      ctx.fillText(formatEok(minY), 4, h-padB + 4);
    }

    async function undoLast() {
      if (!await requireAccess()) return;
      if (!records.length) return alert("취소할 기록이 없습니다.");
      if (!confirm("마지막 기록 1개를 삭제할까요?")) return;
      records.pop();
      saveRecords();
      render();
    }

    async function clearAll() {
      if (!await requireAccess()) return;
      if (!confirm("모든 기록을 삭제합니다. 백업하지 않았다면 복구할 수 없습니다.\n\n계속하시겠습니까?")) return;
      if (!confirm("정말 전체 기록을 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) return;
      records = [];
      saveRecords();
      render();
      closeSideMenu();
      alert("전체 기록이 초기화되었습니다.");
    }

    async function copySummary() {
      if (!await requireAccess()) return;
      const s = getStats();
      const text = [
        "[루디스 요약]",
        `총 판수: ${s.totalGames}판`,
        `승/패: ${s.wins}승 ${s.losses}패`,
        `승률: ${s.winRate.toFixed(1)}%`,
        `총 베팅액: ${formatEok(s.totalBet)}`,
        `총 수익: ${formatEok(s.totalProfit)}`,
        `총 손실: ${formatEok(s.totalLoss)}`,
        `총 순손익: ${formatEok(s.net)}`,
        `오늘 손익: ${formatEok(s.todayNet)}`,
        `현재 흐름: ${s.streak > 0 ? s.streak + "연승" : s.streak < 0 ? Math.abs(s.streak) + "연패" : "없음"}`
      ].join("\n");
      navigator.clipboard.writeText(text).then(() => alert("요약을 복사했습니다."));
    }

    async function exportJson() {
      if (!await requireAccess()) return;
      const data = { app: "ludis", version: "v3-sales-lock", exportedAt: new Date().toISOString(), settings, records };
      downloadFile("ludis_backup_" + new Date().toISOString().slice(0,10) + ".json", JSON.stringify(data, null, 2), "application/json");
    }

    async function openImportFile() {
      if (!await requireAccess()) return;
      document.getElementById("importFile").click();
    }

    async function importJson(event) {
      if (!await requireAccess()) {
        event.target.value = "";
        return;
      }

      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          if (!await requireAccess()) return;
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data.records)) throw new Error("records 없음");
          if (!confirm("현재 기록을 불러온 백업으로 교체할까요?")) return;
          if (!await requireAccess()) return;
          records = data.records;
          settings = Object.assign(settings, data.settings || {});
          saveRecords(); saveSettings(); initInputs(); render();
          alert("불러오기 완료");
        } catch (e) {
          alert("백업 파일 형식이 올바르지 않습니다.");
        } finally {
          event.target.value = "";
        }
      };
      reader.readAsText(file);
    }

    async function exportCsv() {
      if (!await requireAccess()) return;
      const rows = [["일시","결과","베팅액_억","손익_억","메모"]];
      records.forEach(r => rows.push([formatDate(r.createdAt), r.result === "win" ? "승리" : "패배", r.amountEok, r.profitEok, r.memo || ""]));
      const csv = rows.map(row => row.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(",")).join("\n");
      downloadFile("ludis_records_" + new Date().toISOString().slice(0,10) + ".csv", "\ufeff" + csv, "text/csv;charset=utf-8");
    }

    function downloadFile(filename, content, type) {
      const blob = new Blob([content], { type });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    function toggleDarkMode() {
      document.body.classList.toggle("dark");
      localStorage.setItem(DARK_KEY, document.body.classList.contains("dark") ? "1" : "0");
      drawChart();
    }

    window.addEventListener("resize", () => drawChart());
    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !document.getElementById("lockScreen").classList.contains("hidden")) redeemCode();
      if (e.key === "Escape") closeSideMenu();
    });

    window.addEventListener("focus", () => {
      checkAccessNow(false);
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) checkAccessNow(false);
    });

    async function boot() {
      document.body.classList.toggle("dark", localStorage.getItem(DARK_KEY) === "1");

      // 새 구조: 코드가 없어도 무료 모드로 바로 입장합니다.
      // 기존에 구매/인증된 고객은 인증 상태가 정상일 때 VIP로 표시합니다.
      if (isSupabaseConfigured() && sb && isUnlocked()) {
        const ok = await validateSavedAccess(false);
        setCurrentTier(ok ? "vip" : "free");
      } else {
        setCurrentTier("free");
      }

      showApp();
    }

    boot();

    // LUDIS_READY_TRANSITION_CLEANUP_V6
    // 화면전환용 오버레이는 1초 뒤 자동 제거됩니다.
    window.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        try {
          document.getElementById("ludisReadyTransition")?.remove();
        } catch (err) {}
      }, 1100);
    });
