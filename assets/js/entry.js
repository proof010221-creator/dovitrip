    const {
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      WINDOWS_APP_DOWNLOAD_URL: LUDIS_WINDOWS_APP_DOWNLOAD_URL,
      CUSTOMER_CENTER_URL: LUDIS_CUSTOMER_CENTER_URL
    } = window.LUDIS_CONFIG;

    const ACCESS_KEY = "dobi_access_ok_v1";
    const ACCESS_ID_KEY = "dobi_access_id_v1";
    const ACCESS_EXPIRES_KEY = "dobi_access_expires_at_v1";
    const ACCESS_TIER_KEY = "ludis_access_tier_v1";
    const DEVICE_KEY = "dobi_device_id_v1";
    const FREE_STARTED_KEY = "ludis_free_started_v1";

    let authMode = "auth";
    let sb = null;

    function isSupabaseConfigured() {
      return SUPABASE_URL.startsWith("https://") &&
        !SUPABASE_URL.includes("YOUR-PROJECT") &&
        SUPABASE_ANON_KEY &&
        !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
    }

    if (isSupabaseConfigured() && window.supabase) {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    function getDeviceId() {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    }

    function hasStoredVipAccess() {
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

    function goApp(mode) {
      const screen = document.getElementById("entryScreen");
      const transition = document.getElementById("pageTransition");

      if (screen) screen.classList.add("leaving");

      // mode 값은 URL에 표시하지 않습니다.
      // 무료/VIP 상태는 URL이 아니라 localStorage와 Supabase 인증값으로 판단합니다.
      try {
        sessionStorage.setItem("ludis_last_entry_mode_v1", mode || "free");
      } catch (err) {}

      if (transition) {
        transition.classList.add("show");
        transition.setAttribute("aria-hidden", "false");
      }

      setTimeout(() => {
        location.href = "ludis/";
      }, 720);
    }

    function startFreeMode() {
      try {
        localStorage.setItem(FREE_STARTED_KEY, "true");
        localStorage.setItem(ACCESS_TIER_KEY, "free");
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(ACCESS_ID_KEY);
        localStorage.removeItem(ACCESS_EXPIRES_KEY);
      } catch (err) {}
      goApp("free");
    }

    function openAuthModal(mode) {
      authMode = mode === "restore" ? "restore" : "auth";
      setMessage("");
      document.getElementById("authTitle").textContent = authMode === "restore" ? "사용 이전" : "VIP 인증하기";
      document.getElementById("authDesc").textContent = authMode === "restore"
        ? "기존에 사용하던 이용권 코드를 새 브라우저/앱으로 이전합니다."
        : "닉네임과 이용권 코드를 입력해 VIP 기능을 활성화합니다.";
      document.getElementById("authSubmit").textContent = authMode === "restore" ? "사용 이전" : "VIP 인증";

      try {
        const nick = localStorage.getItem("dobi_last_nickname_v1") || localStorage.getItem("ludis_last_nickname_v1") || "";
        if (nick && !document.getElementById("nicknameInput").value) document.getElementById("nicknameInput").value = nick;
      } catch (err) {}

      document.getElementById("authModal").classList.remove("hidden");
      setTimeout(() => document.getElementById("nicknameInput")?.focus(), 40);
    }

    function closeAuthModal() {
      document.getElementById("authModal").classList.add("hidden");
    }

    function setMessage(message, ok = false) {
      const box = document.getElementById("authMessage");
      box.textContent = message || "";
      box.classList.toggle("hidden", !message);
      box.classList.toggle("ok", Boolean(ok));
    }

    function saveAccess(data) {
      localStorage.setItem(ACCESS_KEY, "1");
      localStorage.setItem(ACCESS_TIER_KEY, "vip");
      if (data.access_id) localStorage.setItem(ACCESS_ID_KEY, data.access_id);
      if (data.expires_at) localStorage.setItem(ACCESS_EXPIRES_KEY, data.expires_at);
      else localStorage.removeItem(ACCESS_EXPIRES_KEY);
      localStorage.setItem(FREE_STARTED_KEY, "true");
    }

    async function submitAuth() {
      const nickname = document.getElementById("nicknameInput").value.trim();
      const code = document.getElementById("codeInput").value.trim();
      const submit = document.getElementById("authSubmit");

      if (!nickname) {
        setMessage("닉네임을 입력해 주세요.");
        document.getElementById("nicknameInput").focus();
        return;
      }

      if (!code) {
        setMessage("이용권 코드를 입력해 주세요.");
        document.getElementById("codeInput").focus();
        return;
      }

      if (!sb) {
        setMessage("인증 서버 설정을 확인할 수 없습니다. 고객센터로 문의해 주세요.");
        return;
      }

      try {
        localStorage.setItem("dobi_last_nickname_v1", nickname);
        localStorage.setItem("ludis_last_nickname_v1", nickname);
      } catch (err) {}

      submit.disabled = true;
      submit.textContent = authMode === "restore" ? "이전 중..." : "인증 중...";
      setMessage("");

      try {
        const fn = authMode === "restore" ? "restore_access_code" : "redeem_access_code";
        const { data, error } = await sb.rpc(fn, {
          p_code: code,
          p_device: getDeviceId(),
          p_nickname: nickname,
          p_user_agent: navigator.userAgent
        });

        if (error) throw error;

        if (data && data.ok) {
          saveAccess(data);
          setMessage(authMode === "restore" ? "사용 이전이 완료되었습니다. 메인 화면으로 이동합니다." : "인증이 완료되었습니다. 메인 화면으로 이동합니다.", true);
          setTimeout(() => goApp("vip"), 650);
        } else {
          setMessage((data && data.message) || "처리에 실패했습니다. 닉네임과 이용권 코드를 다시 확인해 주세요.");
        }
      } catch (err) {
        console.error("루디스 인증 오류:", err);
        setMessage("처리 중 오류가 발생했습니다. 코드를 다시 확인하거나 고객센터로 문의해 주세요.");
      } finally {
        submit.disabled = false;
        submit.textContent = authMode === "restore" ? "사용 이전" : "VIP 인증";
      }
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
      const a = document.createElement("a");
      a.href = url;
      a.download = "LudisSetup.exe";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    window.addEventListener("DOMContentLoaded", () => {
      if (hasStoredVipAccess() || localStorage.getItem(FREE_STARTED_KEY) === "true") {
        location.replace("ludis/");
        return;
      }

      document.getElementById("codeInput")?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") submitAuth();
      });
      document.getElementById("nicknameInput")?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") document.getElementById("codeInput")?.focus();
      });
    });
