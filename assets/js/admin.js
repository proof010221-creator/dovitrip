  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.LUDIS_CONFIG;

  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let currentRows = [];
  let selectedCodeIds = new Set();
  let lastIssued = [];
  let currentAdmin = null;
  let adminUsers = [];
  let settlementSummaryRows = [];
  let settlementHistoryRows = [];
  let myProfitData = null;
  let weeklyProfitRowsData = [];
  let eventClaimsData = [];
  let blacklistRows = [];
  let bulkBlacklistPreviewRows = [];
  let adminLoginLogsData = [];
  let adminBlockedIpsData = [];
  let cachedAdminIpInfo = null;
  let currentView = "sales";
  let lastSaleText = "";
  const $ = (id) => document.getElementById(id);


  function syncGatePinToMain() {
    const gatePin = $("adminGatePin")?.value || "";
    if ($("adminPin")) $("adminPin").value = gatePin.trim();
  }

  function syncMainPinToGate() {
    const pin = $("adminPin")?.value || "";
    if ($("adminGatePin")) $("adminGatePin").value = pin;
  }

  async function loginAdminFromGate() {
    syncGatePinToMain();
    await loginAdmin();
  }

  function toggleSideMenu() {
    $("sideMenu")?.classList.toggle("open");
    $("sideBackdrop")?.classList.toggle("show");
  }
  function closeSideMenu() {
    $("sideMenu")?.classList.remove("open");
    $("sideBackdrop")?.classList.remove("show");
  }
  function renderNavigation() {
    const loggedIn = !!currentAdmin;
    document.querySelectorAll(".side-nav .nav-btn").forEach(btn => {
      const superOnly = btn.dataset.superOnly === "true";
      btn.classList.toggle("hidden", !loggedIn || (superOnly && !currentAdmin?.is_super_admin));
      btn.classList.toggle("active", btn.dataset.nav === currentView);
    });
    const info = $("sideAdminInfo");
    if (info) info.textContent = currentAdmin ? `${currentAdmin.display_name} · ${currentAdmin.role_name}${currentAdmin.is_super_admin ? " · 총관리자" : ""}` : "로그인 후 메뉴를 사용할 수 있습니다.";
    ["deleteRevokedCodesBtn", "selectVisibleCodesBtn", "deleteSelectedCodesBtn", "selectedCodeCount"].forEach(id => {
      $(id)?.classList.toggle("hidden", !currentAdmin?.is_super_admin);
    });
    updateCodeSelectionInfo();
  }
  function showView(view) {
    currentView = view || "sales";
    document.querySelectorAll("[data-view]").forEach(el => {
      const shouldShow = el.dataset.view === currentView;
      el.classList.toggle("view-off", !shouldShow);
    });
    renderNavigation();
    closeSideMenu();
    if (currentView === "profit") {
      loadMyProfitStatus(false);
      loadWeeklyProfit(false);
    }
    if (currentView === "event" && currentAdmin) {
      loadCodes(false).then(() => loadEventClaims(false));
    }
    if (currentView === "blacklist" && currentAdmin) {
      loadBlacklistUsers(false);
    }
    if (currentView === "admin" && currentAdmin?.is_super_admin) {
      loadAdminUsers(false);
      loadSettlementSummary(false);
    }
    if (currentView === "loginlog" && currentAdmin?.is_super_admin) {
      loadAdminLoginLogs(false);
      loadAdminBlockedIps(false);
    }
  }


  const ADMIN_PASSWORD_MIN_LENGTH = 10;

  function getPin() {
    const pin = $("adminPin").value.trim();
    if (!pin) throw new Error("관리자 비밀번호를 입력해주세요.");
    return pin;
  }

  // 관리자 비밀번호는 브라우저 저장소에 저장하지 않고 두 입력칸의 현재 값만 동기화한다.
  function syncAdminCredentialFields() {
    syncMainPinToGate();
  }

  function clearLegacySavedAdminPin() {
    try {
      localStorage.removeItem("dobi_admin_pin_v3");
      localStorage.removeItem("dobi_admin_pin");
      sessionStorage.removeItem("dobi_admin_pin_v3");
      sessionStorage.removeItem("dobi_admin_pin");
    } catch (_) {}
  }

  function logoutAdmin() {
    clearLegacySavedAdminPin();
    if ($("adminPin")) $("adminPin").value = "";
    if ($("adminGatePin")) $("adminGatePin").value = "";
    currentAdmin = null;
    currentRows = [];
    selectedCodeIds.clear();
    renderRows([]);
    renderLoginInfo();
    toast("관리자에서 로그아웃했습니다.");
    setTimeout(() => $("adminGatePin")?.focus(), 50);
  }

  // 이전 버전의 버튼/외부 호출과의 호환성을 유지한다.
  function clearSavedPin() {
    logoutAdmin();
  }

  function validateNewAdminPassword(password) {
    const value = String(password || "");
    if (value.length < ADMIN_PASSWORD_MIN_LENGTH) {
      return `비밀번호는 최소 ${ADMIN_PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
    }
    if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
      return "비밀번호는 영문자와 숫자를 각각 1자 이상 포함해주세요.";
    }
    return "";
  }
  function toast(msg) { const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),1900); }
  function fmtDate(value) { if(!value) return "-"; const d=new Date(value); return d.toLocaleString("ko-KR", {year:"2-digit",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}); }
  function escapeHtml(text) { return String(text ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
  function formatDurationHours(hours) {
    hours = Number(hours) || 0;
    if (hours <= 0) return "무제한";
    const days = Math.floor(hours / 24);
    const remain = hours % 24;
    if (days > 0 && remain > 0) return `${days}일 ${remain}시간권`;
    if (days > 0) return `${days}일권`;
    return `${hours}시간권`;
  }
  function periodText(r) {
    const hours = Number(r.duration_hours || 0);
    if (hours > 0) return formatDurationHours(hours);
    const days = Number(r.duration_days || 0);
    return days <= 0 ? "무제한" : `${days}일권`;
  }
  function getStatusClass(r) { if(r.revoked||r.status==="인증해제") return "revoked"; if(r.status==="기간만료") return "expired"; if(r.is_used) return "used"; if(r.sale_registered) return "registered"; return "unused"; }
  function isDeletableCode(r) { return !!(currentAdmin?.is_super_admin && r); }
  function getFilteredCodeItems(rows = currentRows) {
    const statusFilter = $("codeStatusFilter")?.value || "all";
    const query = ($("codeSearchInput")?.value || "").trim().toLowerCase();
    return (rows || []).map((r, i) => ({ r, i })).filter(({ r }) => {
      const statusClass = getStatusClass(r);
      if (statusFilter !== "all" && statusClass !== statusFilter) return false;
      if (!query) return true;
      const searchText = [
        r.issued_code,
        r.status,
        r.buyer_nickname,
        r.sold_by_name,
        r.used_nickname,
        r.price_text,
        r.label,
        r.sale_note,
        periodText(r),
        r.duration_hours,
        remainingText(r)
      ].map(v => String(v || "").toLowerCase()).join(" ");
      return searchText.includes(query);
    });
  }
  function updateCodeSelectionInfo() {
    const countEl = $("selectedCodeCount");
    if (!countEl) return;
    const validIds = new Set((currentRows || []).map(r => r.id).filter(Boolean));
    Array.from(selectedCodeIds).forEach(id => { if (!validIds.has(id)) selectedCodeIds.delete(id); });
    countEl.textContent = `선택 ${selectedCodeIds.size.toLocaleString("ko-KR")}개`;
  }

  function toggleCodeSelection(id, checked) {
    if (!currentAdmin?.is_super_admin) return;
    if (checked) selectedCodeIds.add(id);
    else selectedCodeIds.delete(id);
    updateCodeSelectionInfo();
  }

  function toggleSelectVisibleCodes() {
    if (!currentAdmin?.is_super_admin) return toast("총관리자만 선택 기능을 사용할 수 있습니다.");
    const visible = getFilteredCodeItems(currentRows).map(x => x.r).filter(r => r && r.id);
    if (!visible.length) return toast("현재 보이는 코드가 없습니다.");
    const allSelected = visible.every(r => selectedCodeIds.has(r.id));
    if (allSelected) {
      visible.forEach(r => selectedCodeIds.delete(r.id));
      toast(`보이는 코드 ${visible.length.toLocaleString("ko-KR")}개 선택 해제`);
    } else {
      visible.forEach(r => selectedCodeIds.add(r.id));
      toast(`보이는 코드 ${visible.length.toLocaleString("ko-KR")}개 선택`);
    }
    renderRows(currentRows);
  }

  function remainingText(r) { if(r.revoked||r.status==="인증해제") return "인증해제됨"; if(!r.is_used) return periodText(r); if(!r.expires_at) return "무제한"; const ms=new Date(r.expires_at).getTime()-Date.now(); if(ms<=0) return "기간만료"; const totalMin=Math.floor(ms/60000); const days=Math.floor(totalMin/1440); const hours=Math.floor((totalMin%1440)/60); const mins=totalMin%60; if(days>0) return `남은 ${days}일 ${hours}시간`; if(hours>0) return `남은 ${hours}시간 ${mins}분`; return `남은 ${mins}분`; }
  function nicknameWithRemain(r) { const name=r.used_nickname || (r.is_used ? "닉네임 없음" : "-"); const remain=remainingText(r); if(!r.is_used) return remain; return `${name} · ${remain}`; }
  function saleTextFromRow(r) { if(!r.sale_registered) return "-"; const code=r.issued_code || "기존코드"; return `${code} - ${r.buyer_nickname || "구매자"} - ${r.sold_by_name || "판매자"} < ${periodText(r)} >`; }

  function renderLoginInfo() {
    if (!currentAdmin) {
      document.body.classList.add("admin-locked");
      $("loginInfo").innerHTML = `<strong>현재 관리자</strong><span class="muted">아직 로그인 전입니다.</span>`;
      $("adminManageCard").classList.add("hidden");
      $("adminLoginLogCard")?.classList.add("hidden");
      $("myProfitCard").classList.add("hidden");
      $("changePinCard").classList.add("hidden");
      $("weeklyProfitCard")?.classList.add("hidden");
      renderNavigation();
      showView("sales");
      return;
    }
    document.body.classList.remove("admin-locked");
    $("loginInfo").innerHTML = `<strong>현재 관리자</strong>${escapeHtml(currentAdmin.display_name)} · ${escapeHtml(currentAdmin.role_name)}${currentAdmin.is_super_admin ? " · 총관리자" : ""}`;
    $("adminManageCard").classList.toggle("hidden", !currentAdmin.is_super_admin);
    $("adminLoginLogCard")?.classList.toggle("hidden", !currentAdmin.is_super_admin);
    $("myProfitCard").classList.remove("hidden");
    $("changePinCard").classList.remove("hidden");
    $("weeklyProfitCard")?.classList.remove("hidden");
    renderNavigation();
    renderMyProfitSummary();
  }

  async function loginAdmin() {
    try {
      syncAdminCredentialFields();
      const pin = getPin();
      const loginResult = await verifyAdminLoginWithSecurity(pin);
      if (loginResult.error) throw loginResult.error;
      const data = loginResult.data;

      if (data?.blocked) {
        const msg = data?.message || "이 IP는 관리자 비밀번호 5회 이상 실패로 차단되었습니다.";
        return alert(msg + "\n\n총관리자에게 차단 해제를 요청하세요.");
      }

      if (!data?.ok) {
        const countText = data?.failure_count ? `
현재 실패 횟수: ${data.failure_count}/5` : "";
        return alert((data?.message || "관리자 비밀번호가 올바르지 않습니다.") + countText);
      }

      currentAdmin = data.admin || data;
      renderLoginInfo();
      toast(`${currentAdmin.display_name} 관리자 접속`);
      await loadCodes(false);
      await loadMyProfitStatus(false);
      await loadWeeklyProfit(false);
      if (currentAdmin.is_super_admin) await loadAdminUsers(false);
      showView("sales");
    } catch (err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function loadCodes(show=true) {
    try {
      syncAdminCredentialFields();
      if (!currentAdmin) {
        const { data, error } = await sb.rpc("admin_current_user", { p_admin_pin: getPin() });
        if (error) throw error;
        if (data?.ok) { currentAdmin = data; renderLoginInfo(); }
      }
      const { data, error } = await sb.rpc("admin_list_access_codes", { p_admin_pin: getPin(), p_limit: 700 });
      if (error) throw error;
      currentRows = data || [];
      renderRows(currentRows);
      if (currentAdmin) await loadMyProfitStatus(false);
      if (currentAdmin) await loadWeeklyProfit(false);
      if (currentAdmin?.is_super_admin) await loadSettlementSummary(false);
      if (show) toast("목록을 불러왔습니다.");
    } catch (err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function issueCodes() {
    try {
      syncAdminCredentialFields();
      const count=Math.max(1,Math.min(100,Number($("issueCount").value)||1));
      const durationValue=Math.max(0,Math.min(3650,Number($("durationValue").value)||0));
      const durationUnit=$("durationUnit").value;
      let durationHours = 0;
      if (durationUnit === "hour") durationHours = Math.max(1, Math.min(87600, durationValue));
      if (durationUnit === "day") durationHours = Math.max(24, Math.min(87600, durationValue * 24));
      if (durationUnit === "unlimited") durationHours = 0;
      const { data, error } = await sb.rpc("admin_issue_access_codes", { p_admin_pin:getPin(), p_count:count, p_label:$("labelText").value.trim()||"판매용 코드", p_price_text:$("priceText").value.trim()||"100억", p_duration_hours:durationHours });
      if(error) throw error;
      lastIssued=data||[];
      if(!lastIssued.length) return toast("생성된 코드가 없습니다.");
      await copyText(lastIssued.map(x=>x.issued_code).join("\n"));
      toast(`${lastIssued.length}개 생성, 클립보드에 복사했습니다.`);
      await loadCodes(false);
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function registerSale() {
    try {
      syncAdminCredentialFields();
      const code=$("saleCode").value.trim();
      const buyer=$("buyerNickname").value.trim();
      const note=$("saleNote").value.trim();
      if(!code) return toast("판매할 코드를 입력해주세요.");
      if(!buyer) return toast("구매자 닉네임을 입력해주세요.");
      const { data, error } = await sb.rpc("admin_register_sale", { p_admin_pin:getPin(), p_code:code, p_buyer_nickname:buyer, p_sale_note:note || null });
      if(error) throw error;
      if(!data?.ok) return alert(data?.message || "판매 등록 실패");
      lastSaleText = data.sale_text || "";
      $("saleResult").innerHTML = `<strong>판매등록 완료</strong><span class="code">${escapeHtml(lastSaleText)}</span>`;
      await copyText(lastSaleText);
      toast("판매 등록 완료, 문구를 복사했습니다.");
      await loadCodes(false);
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function registerSaleFromRow(index) {
    const r=currentRows[index]; if(!r || !r.issued_code) return;
    const buyer=prompt("구매자 닉네임을 입력하세요", r.buyer_nickname || "");
    if(!buyer) return;
    $("saleCode").value = r.issued_code;
    $("buyerNickname").value = buyer;
    await registerSale();
  }

  async function unregisterSale(id) {
    try {
      if(!confirm("판매 등록을 취소할까요?")) return;
      const { data, error } = await sb.rpc("admin_unregister_sale", { p_admin_pin:getPin(), p_id:id });
      if(error) throw error;
      toast(data?.message || "처리했습니다.");
      await loadCodes(false);
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function checkOneCode() {
    try {
      const code=$("checkCode").value.trim(); if(!code) return toast("확인할 코드를 입력해주세요.");
      const { data, error } = await sb.rpc("admin_check_access_code", { p_admin_pin:getPin(), p_code:code });
      if(error) throw error;
      if(!data || !data.length) return alert("해당 코드를 찾을 수 없습니다.");
      renderRows(data); toast("해당 코드 결과만 표시했습니다.");
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function revokeRow(id, willRevoke) {
    try {
      if(!confirm(willRevoke ? "이 사용자의 인증을 해제할까요?" : "인증해제를 취소할까요?")) return;
      const { data, error } = await sb.rpc("admin_revoke_access_code", { p_admin_pin:getPin(), p_id:id, p_revoke:willRevoke });
      if(error) throw error;
      toast(data?.message || "처리했습니다."); await loadCodes(false);
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function deleteAccessCode(id, index) {
    try {
      if (!currentAdmin?.is_super_admin) return toast("총관리자만 코드 삭제가 가능합니다.");
      const r = currentRows[index] || currentRows.find(x => x.id === id);
      if (!r) return toast("삭제할 코드를 찾을 수 없습니다.");

      const code = r.issued_code || r.id;
      const label = r.label || "-";
      const ok = confirm(`이 코드를 완전히 삭제할까요?

코드: ${code}
라벨/메모: ${label}
상태: ${r.status || "-"}
판매등록: ${r.sale_registered ? "예" : "아니오"}
사용여부: ${r.is_used ? "예" : "아니오"}

※ 총관리자 강제 삭제입니다.
※ 사용중/판매등록/만료/인증해제 코드도 삭제됩니다.
※ 삭제하면 해당 코드는 복구할 수 없고, 기존 사용자의 인증도 끊길 수 있습니다.
※ 이벤트 지급내역이 연결되어 있으면 지급내역도 함께 삭제됩니다.`);
      if (!ok) return;

      const typed = prompt("정말 완전 삭제하려면 아래 칸에 '삭제'라고 입력하세요.");
      if (typed !== "삭제") return toast("삭제를 취소했습니다.");

      const { data, error } = await sb.rpc("admin_delete_access_code", { p_admin_pin:getPin(), p_id:id });
      if (error) throw error;
      if (!data?.ok) return alert(data?.message || "코드 삭제 실패");
      toast(data.message || "코드를 삭제했습니다.");
      await loadCodes(false);
      if (currentView === "event") await loadEventClaims(false);
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function deleteCodeRows(targets, options = {}) {
    const title = options.title || "선택한 코드";
    const confirmWord = options.confirmWord || "삭제";
    const caution = options.caution || "삭제하면 복구할 수 없습니다.";

    if (!currentAdmin?.is_super_admin) return toast("총관리자만 코드 삭제가 가능합니다.");
    targets = (targets || []).filter(r => r && r.id);
    if (!targets.length) return toast("삭제할 코드가 없습니다.");

    const sample = targets.slice(0, 8).map(r => `${r.issued_code || r.id} · ${r.status || "-"}`).join("\n");
    const ok = confirm(`${title} ${targets.length.toLocaleString("ko-KR")}개를 완전히 삭제할까요?

예시:
${sample}${targets.length > 8 ? "\n..." : ""}

※ 총관리자 강제 삭제입니다.
※ 미사용/판매등록/사용중/기간만료/인증해제 코드도 삭제될 수 있습니다.
※ 이벤트 지급내역이 연결된 코드는 지급내역도 함께 삭제됩니다.
※ ${caution}`);
    if (!ok) return;

    const typed = prompt(`정말 삭제하려면 아래 칸에 '${confirmWord}'라고 입력하세요.`);
    if (typed !== confirmWord) return toast("삭제를 취소했습니다.");

    let success = 0;
    let failed = 0;
    for (const r of targets) {
      const { data, error } = await sb.rpc("admin_delete_access_code", { p_admin_pin:getPin(), p_id:r.id });
      if (error || !data?.ok) {
        console.error("코드 삭제 실패", r, error || data);
        failed++;
      } else {
        success++;
        selectedCodeIds.delete(r.id);
      }
    }

    await loadCodes(false);
    if (currentView === "event") await loadEventClaims(false);
    updateCodeSelectionInfo();
    toast(`삭제 완료: ${success.toLocaleString("ko-KR")}개${failed ? ` · 실패 ${failed.toLocaleString("ko-KR")}개` : ""}`);
  }

  async function deleteRevokedCodes() {
    try {
      const targets = (currentRows || []).filter(r => r && (r.revoked || r.status === "인증해제"));
      await deleteCodeRows(targets, {
        title: "인증해제 코드",
        confirmWord: "인증해제삭제",
        caution: "인증해제 상태의 코드 전체가 삭제됩니다."
      });
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function deleteSelectedCodes() {
    try {
      const targets = (currentRows || []).filter(r => r && selectedCodeIds.has(r.id));
      await deleteCodeRows(targets, {
        title: "선택한 코드",
        confirmWord: "선택삭제",
        caution: "체크박스로 선택한 코드만 삭제됩니다."
      });
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function deleteFilteredSafeCodes() {
    try {
      const targets = getFilteredCodeItems(currentRows).map(x => x.r).filter(r => r && r.id);
      await deleteCodeRows(targets, {
        title: "현재 검색/필터 결과 코드",
        confirmWord: "일괄삭제",
        caution: "현재 검색/필터 결과에 보이는 코드가 삭제됩니다."
      });
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  function getEventLabel() {
    return ($("eventLabel")?.value || "").trim() || "EVENT_FREE_DAYPASS_202606";
  }

  async function issueEventCodes() {
    try {
      syncAdminCredentialFields();
      const label = getEventLabel();
      const eventName = ($("eventName")?.value || "루디스 1일권 무료배포").trim();
      const count = Math.max(1, Math.min(100, Number($("eventCount")?.value || 20)));
      const hours = Math.max(1, Math.min(87600, Number($("eventDurationHours")?.value || 24)));
      const price = ($("eventPriceText")?.value || "무료 이벤트").trim() || "무료 이벤트";
      if (!label) return toast("이벤트 라벨을 입력해주세요.");
      const ok = confirm(`이벤트 코드를 생성할까요?

라벨: ${label}
이름: ${eventName}
개수: ${count}개
기간: ${formatDurationHours(hours)}
메모: ${price}

디스코드 봇 EVENT_LABEL도 같은 라벨이어야 합니다.`);
      if (!ok) return;
      const { data, error } = await sb.rpc("admin_issue_access_codes", {
        p_admin_pin:getPin(),
        p_count:count,
        p_label:label,
        p_price_text:price,
        p_duration_hours:hours
      });
      if (error) throw error;
      lastIssued = data || [];
      if (lastIssued.length) await copyText(lastIssued.map(x => x.issued_code).join("\n"));
      toast(`${lastIssued.length}개 이벤트 코드 생성 완료`);
      await loadCodes(false);
      await loadEventClaims(false);
    } catch(err) { console.error(err); alert("이벤트 코드 생성 오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function loadEventClaims(show=true) {
    try {
      if (!currentAdmin) return;
      const label = getEventLabel();
      const { data, error } = await sb.rpc("admin_list_event_claims", {
        p_admin_pin:getPin(),
        p_event_label:label,
        p_limit:1000
      });
      if (error) throw error;
      eventClaimsData = data || [];
      renderEventClaims(eventClaimsData);
      if (show) toast("이벤트 지급내역을 불러왔습니다.");
    } catch(err) {
      console.error("이벤트 지급내역 오류:", err);
      const body = $("eventClaimRows");
      if (body) body.innerHTML = `<div class="code-empty">이벤트 지급내역 오류: ${escapeHtml(err?.message || JSON.stringify(err))}<br><br>Supabase에 admin_list_event_claims 함수가 설치되어 있는지 확인하세요.</div>`;
    }
  }

  function renderEventClaims(rows) {
    const body = $("eventClaimRows");
    if (!body) return;
    const label = getEventLabel();
    const claims = rows || [];
    const labelCodes = (currentRows || []).filter(r => r.label === label);
    const claimedCodeIds = new Set(claims.map(c => c.code_id));
    const remaining = labelCodes.filter(r => !claimedCodeIds.has(r.id) && !r.is_used && !r.revoked);
    const used = labelCodes.filter(r => r.is_used).length;
    if ($("eventTotalCodes")) $("eventTotalCodes").textContent = labelCodes.length.toLocaleString("ko-KR");
    if ($("eventClaimedCount")) $("eventClaimedCount").textContent = claims.length.toLocaleString("ko-KR");
    if ($("eventRemainingCount")) $("eventRemainingCount").textContent = remaining.length.toLocaleString("ko-KR");
    if ($("eventUsedCount")) $("eventUsedCount").textContent = used.toLocaleString("ko-KR");

    if (!claims.length) {
      body.innerHTML = `<div class="code-empty">아직 지급내역이 없습니다.<br>현재 라벨: <b>${escapeHtml(label)}</b><br>라벨 코드 전체 ${labelCodes.length}개 · 남은 미지급 ${remaining.length}개</div>`;
      return;
    }

    body.innerHTML = claims.map(c => {
      const statusClass = c.code_revoked ? "revoked" : (c.code_status === "기간만료" ? "expired" : (c.code_is_used ? "used" : "unused"));
      return `<article class="code-card ${statusClass}">
        <div class="code-card-top">
          <div>
            <div class="code-title">
              <span class="badge ${statusClass}">${escapeHtml(c.code_status || "-")}</span>
              <span class="code">${escapeHtml(c.issued_code || "-")}</span>
            </div>
            <div class="code-sub">${escapeHtml(c.discord_username || "디스코드 사용자")} · ${escapeHtml(c.discord_id || "-")}</div>
          </div>
          <div class="code-actions">
            <button type="button" class="ghost" onclick="copyText('${escapeHtml(c.issued_code || "")}'); toast('코드를 복사했습니다.')">코드복사</button>
          </div>
        </div>
        <div class="code-info-grid">
          <div class="code-info"><small>디스코드</small><strong>${escapeHtml(c.discord_tag || c.discord_username || "-")}</strong><div class="small">ID: ${escapeHtml(c.discord_id || "-")}</div></div>
          <div class="code-info"><small>지급</small><strong>${escapeHtml(fmtDate(c.claimed_at))}</strong><div class="small">DM: ${c.dm_sent ? "발송완료" : "미확인/실패"} ${c.dm_sent_at ? "· " + escapeHtml(fmtDate(c.dm_sent_at)) : ""}</div></div>
          <div class="code-info"><small>루디스 사용</small><strong>${escapeHtml(c.code_used_nickname || (c.code_is_used ? "닉네임 없음" : "아직 미사용"))}</strong><div class="small">사용 ${escapeHtml(fmtDate(c.code_used_at))}</div></div>
          <div class="code-info"><small>기간</small><strong>${escapeHtml(formatDurationHours(c.code_duration_hours))}</strong><div class="small">만료 ${escapeHtml(fmtDate(c.code_expires_at))}</div></div>
        </div>
      </article>`;
    }).join("");
  }

  function filterCodeListByEvent() {
    const label = getEventLabel();
    showView("sales");
    setTimeout(() => {
      if ($("codeSearchInput")) $("codeSearchInput").value = label;
      if ($("codeStatusFilter")) $("codeStatusFilter").value = "all";
      renderRows(currentRows);
    }, 30);
  }

  function renderRows(rows) {
    currentRows = rows || [];
    const body = $("codeRows");

    if (!currentRows.length) {
      body.innerHTML = `<div class="code-empty">표시할 코드가 없습니다.</div>`;
      selectedCodeIds.clear();
      updateStats([]);
      renderMyProfitSummary();
      updateCodeSelectionInfo();
      return;
    }

    const displayRows = getFilteredCodeItems(currentRows);

    if (!displayRows.length) {
      body.innerHTML = `<div class="code-empty">검색 조건에 맞는 코드가 없습니다.</div>`;
      updateStats(currentRows);
      renderMyProfitSummary();
      updateCodeSelectionInfo();
      if (currentAdmin?.is_super_admin) renderProfitSummary();
      return;
    }

    body.innerHTML = displayRows.map(({ r, i }) => {
      const code = r.issued_code || "기존 생성 코드: 원본 미저장";
      const statusClass = getStatusClass(r);
      const saleTitle = r.sale_registered ? saleTextFromRow(r) : "미등록";
      const saleDetail = r.sale_registered
        ? `등록: ${fmtDate(r.sold_at)}${r.sale_note ? " · " + r.sale_note : ""}`
        : "아직 판매 등록되지 않은 코드입니다.";
      const authTitle = nicknameWithRemain(r);
      const periodTitle = periodText(r);
      const isExpired = r.status === "기간만료";
      const revokeButton = isExpired
        ? `<button type="button" class="warn" disabled>만료됨</button>`
        : (r.revoked
          ? `<button type="button" class="warn" onclick="revokeRow('${r.id}', false)">해제취소</button>`
          : `<button type="button" class="danger" onclick="revokeRow('${r.id}', true)">인증해제</button>`);
      const saleButton = r.issued_code
        ? `<button type="button" class="ok" onclick="registerSaleFromRow(${i})">판매등록</button>`
        : `<button type="button" class="ok" disabled>판매등록</button>`;
      const unSaleButton = r.sale_registered
        ? `<button type="button" class="warn" onclick="unregisterSale('${r.id}')">판매취소</button>`
        : "";
      const deleteButton = currentAdmin?.is_super_admin
        ? `<button type="button" class="danger" onclick="deleteAccessCode('${r.id}', ${i})">코드삭제</button>`
        : "";
      const selectCheckbox = currentAdmin?.is_super_admin
        ? `<label class="code-select-check" onclick="event.stopPropagation()"><input type="checkbox" onchange="toggleCodeSelection('${r.id}', this.checked)" ${selectedCodeIds.has(r.id) ? "checked" : ""} /> 선택</label>`
        : "";

      return `<article class="code-card ${statusClass}">
        <div class="code-card-top">
          <div>
            <div class="code-title">
              ${selectCheckbox}
              <span class="badge ${statusClass}">${escapeHtml(r.status || "-")}</span>
              <span class="code">${escapeHtml(code)}</span>
            </div>
            <div class="code-sub">${escapeHtml(saleTitle)}</div>
          </div>
          <div class="code-actions">
            <button type="button" class="ghost" onclick="copyRowCode(${i})" ${r.issued_code ? "" : "disabled"}>복사</button>
            ${saleButton}
            ${unSaleButton}
            ${revokeButton}
            ${deleteButton}
          </div>
        </div>

        <div class="code-info-grid">
          <div class="code-info">
            <small>판매정보</small>
            <strong>${escapeHtml(saleTitle)}</strong>
            <div class="small">${escapeHtml(saleDetail)}</div>
          </div>
          <div class="code-info">
            <small>인증 / 남은 기간</small>
            <strong>${escapeHtml(authTitle)}</strong>
            <div class="small">기간권: ${escapeHtml(periodTitle)}</div>
          </div>
          <div class="code-info">
            <small>금액 / 메모</small>
            <strong>${escapeHtml(r.price_text || "-")}</strong>
            <div class="small">${escapeHtml(r.label || "-")}</div>
          </div>
          <div class="code-info">
            <small>시간 정보</small>
            <strong>생성 ${escapeHtml(fmtDate(r.created_at))}</strong>
            <div class="small">사용 ${escapeHtml(fmtDate(r.used_at))} · 만료 ${escapeHtml(fmtDate(r.expires_at))}</div>
          </div>
        </div>
      </article>`;
    }).join("");

    updateStats(currentRows);
    renderMyProfitSummary();
    updateCodeSelectionInfo();
    if (currentAdmin?.is_super_admin) renderProfitSummary();
  }

  function updateStats(rows) {
    const total=rows.length;
    const revoked=rows.filter(r=>r.revoked||r.status==="인증해제").length;
    const expired=rows.filter(r=>!r.revoked&&r.status==="기간만료").length;
    const used=rows.filter(r=>!r.revoked&&r.is_used&&r.status!=="기간만료").length;
    const registered=rows.filter(r=>!r.revoked&&r.sale_registered&&!r.is_used).length;
    const unused=rows.filter(r=>!r.revoked&&!r.is_used&&!r.sale_registered).length;
    $("statTotal").textContent=total.toLocaleString("ko-KR"); $("statUnused").textContent=unused.toLocaleString("ko-KR"); $("statRegistered").textContent=registered.toLocaleString("ko-KR"); $("statUsed").textContent=used.toLocaleString("ko-KR"); $("statExpired").textContent=expired.toLocaleString("ko-KR"); $("statRevoked").textContent=revoked.toLocaleString("ko-KR");
  }

  async function loadAdminUsers(show=true) {
    try {
      const { data, error } = await sb.rpc("admin_list_admin_users", { p_admin_pin:getPin() });
      if(error) throw error;
      renderAdminUsers(data||[]);
      if (currentAdmin?.is_super_admin) await loadSettlementSummary(false);
      if(show) toast("관리자 목록을 불러왔습니다.");
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  function renderAdminUsers(rows) {
    adminUsers = rows || [];
    if (currentAdmin) {
      const me = adminUsers.find(u => u.id === currentAdmin.admin_id || u.display_name === currentAdmin.display_name);
      if (me) currentAdmin.profit_share_percent = Number(me.profit_share_percent || 0);
    }
    renderMyProfitSummary();
    const body=$("adminRows");
    if(!adminUsers.length){
      body.innerHTML=`<tr><td colspan="8" class="muted">관리자가 없습니다.</td></tr>`;
      renderProfitSummary();
      return;
    }
    body.innerHTML=adminUsers.map(r=>`
      <tr>
        <td><input class="admin-edit-input" id="admin_name_${r.id}" value="${escapeHtml(r.display_name)}" /></td>
        <td><input class="admin-edit-input" id="admin_role_${r.id}" value="${escapeHtml(r.role_name || "관리자")}" /></td>
        <td>
          <select class="admin-edit-select" id="admin_super_${r.id}">
            <option value="false" ${r.is_super_admin ? "" : "selected"}>일반</option>
            <option value="true" ${r.is_super_admin ? "selected" : ""}>총관리자</option>
          </select>
        </td>
        <td>
          <select class="admin-edit-select" id="admin_active_${r.id}">
            <option value="true" ${r.active ? "selected" : ""}>활성</option>
            <option value="false" ${r.active ? "" : "selected"}>비활성</option>
          </select>
        </td>
        <td>
          <div style="display:flex; gap:6px; align-items:center;">
            <input class="profit-input" id="profit_${r.id}" type="number" min="0" max="100" step="0.1" value="${Number(r.profit_share_percent || 0)}" />
            <span class="muted">%</span>
          </div>
        </td>
        <td><input class="admin-pin-input" id="admin_pin_${r.id}" type="password" placeholder="비우면 유지 · 변경 시 10자 이상" /></td>
        <td>${escapeHtml(fmtDate(r.created_at))}</td>
        <td><button type="button" class="primary" onclick="updateAdminUser('${r.id}')">저장</button> <button type="button" class="danger" onclick="deleteAdminUser('${r.id}')">삭제</button></td>
      </tr>`).join("");
    renderProfitSummary();
  }

  function parseEokAmount(value) {
    const s = String(value || "").trim().replace(/,/g, "").replace(/\s+/g, "");
    if (!s) return 0;
    let total = 0;
    const jo = s.match(/(-?\d+(?:\.\d+)?)조/);
    const eok = s.match(/(-?\d+(?:\.\d+)?)억/);
    if (jo) total += parseFloat(jo[1]) * 10000;
    if (eok) total += parseFloat(eok[1]);
    if (!jo && !eok) {
      const num = parseFloat(s.replace(/[^0-9.\-]/g, ""));
      total = Number.isFinite(num) ? num : 0;
    }
    return Math.round(total * 100) / 100;
  }

  function formatEokAmount(n) {
    n = Number(n) || 0;
    const sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    if (n >= 10000) {
      const jo = Math.floor(n / 10000);
      const eok = Math.round((n % 10000) * 100) / 100;
      return sign + jo.toLocaleString("ko-KR") + "조" + (eok ? " " + eok.toLocaleString("ko-KR") + "억" : "");
    }
    return sign + n.toLocaleString("ko-KR") + "억";
  }

  async function loadMyProfitStatus(show=false) {
    if (!currentAdmin) return;
    try {
      const { data, error } = await sb.rpc("admin_my_profit_status", { p_admin_pin:getPin() });
      if (error) throw error;
      myProfitData = data || null;
      renderMyProfitSummary();
      if (show) toast("내 수익금을 불러왔습니다.");
    } catch(err) {
      console.error("내 수익금 오류:", err);
      renderMyProfitSummary();
    }
  }

  async function loadWeeklyProfit(show=false) {
    if (!currentAdmin) return;
    try {
      const { data, error } = await sb.rpc("admin_weekly_profit_summary", { p_admin_pin:getPin(), p_weeks:12 });
      if (error) throw error;
      weeklyProfitRowsData = data || [];
      renderWeeklyProfit(weeklyProfitRowsData);
      if (show) toast("주차별 수익을 불러왔습니다.");
    } catch(err) {
      console.error("주차별 수익 오류:", err);
      const body = $("weeklyProfitRows");
      if (body) body.innerHTML = `<tr><td colspan="7" class="muted">주차별 수익 오류: ${escapeHtml(err?.message || JSON.stringify(err))}</td></tr>`;
    }
  }

  function renderMyProfitSummary() {
    const card = $("myProfitCard");
    const body = $("myProfitRows");
    if (!card || !body) return;
    if (!currentAdmin) {
      card.classList.add("hidden");
      return;
    }

    card.classList.remove("hidden");
    const d = myProfitData && myProfitData.ok ? myProfitData : null;
    const share = Number(d?.profit_share_percent ?? currentAdmin.profit_share_percent ?? 0);
    const totalSales = Number(d?.total_sales_amount_eok ?? 0);
    const myOwnSales = Number(d?.unsettled_sales_amount_eok ?? 0);
    const payout = Number(d?.payout_amount_eok ?? 0);
    const remain = Number(d?.owner_remainder_eok ?? Math.max(0, myOwnSales - payout));
    const count = Number(d?.unsettled_sale_count ?? 0);

    if ($("myProfitShare")) $("myProfitShare").textContent = `${Math.round(share * 100) / 100}%`;
    if ($("myProfitPayout")) $("myProfitPayout").textContent = formatEokAmount(payout);
    if ($("myProfitTotalSales")) $("myProfitTotalSales").textContent = `${count.toLocaleString("ko-KR")}건`;
    if ($("myProfitOwnSales")) $("myProfitOwnSales").textContent = formatEokAmount(myOwnSales);

    const isWaiting = count > 0;
    const statusBadge = isWaiting
      ? `<span class="badge registered">정산 대기</span>`
      : `<span class="badge unused">정산 완료</span>`;
    const guide = isWaiting
      ? `아직 정산되지 않은 판매건 ${count.toLocaleString("ko-KR")}건이 있습니다. 정산 처리 후 실시간 수익은 0억으로 초기화됩니다.`
      : "현재 정산 대기 중인 판매건이 없습니다. 새 판매등록이 생기면 실시간 수익에 다시 표시됩니다.";
    const notice = $("myProfitStatusNotice");
    if (notice) {
      notice.innerHTML = `<strong>${isWaiting ? "정산 대기 중" : "정산 대기 내역 없음"}</strong><span class="muted">${escapeHtml(guide)}${totalSales ? ` · 전체 판매 누적 ${escapeHtml(formatEokAmount(totalSales))}` : ""}</span>`;
    }

    body.innerHTML = `<tr>
      <td>${escapeHtml(currentAdmin.display_name || "-")}</td>
      <td>${statusBadge}</td>
      <td><b>${Math.round(share * 100) / 100}%</b></td>
      <td>${count.toLocaleString("ko-KR")}건</td>
      <td>${formatEokAmount(myOwnSales)}</td>
      <td><b>${formatEokAmount(payout)}</b><div class="small">운영자 잔여 ${formatEokAmount(remain)}</div></td>
      <td>${escapeHtml(guide)}</td>
    </tr>`;
  }

  function renderWeeklyProfit(rows) {
    const body = $("weeklyProfitRows");
    if (!body) return;
    const list = rows || [];
    const totalSales = list.reduce((sum, r) => sum + Number(r.sales_amount_eok || 0), 0);
    const totalPayout = list.reduce((sum, r) => sum + Number(r.payout_amount_eok || 0), 0);
    const totalRemain = list.reduce((sum, r) => sum + Number(r.owner_remainder_eok || 0), 0);
    if ($("weeklyCount")) $("weeklyCount").textContent = `${new Set(list.map(r => r.week_start)).size.toLocaleString("ko-KR")}주`;
    if ($("weeklySalesTotal")) $("weeklySalesTotal").textContent = formatEokAmount(totalSales);
    if ($("weeklyPayoutTotal")) $("weeklyPayoutTotal").textContent = formatEokAmount(totalPayout);
    if ($("weeklyRemainTotal")) $("weeklyRemainTotal").textContent = formatEokAmount(totalRemain);

    if (!list.length) {
      body.innerHTML = `<tr><td colspan="7" class="muted">주차별 판매 내역이 없습니다.</td></tr>`;
      return;
    }
    body.innerHTML = list.map(r => {
      const start = r.week_start ? String(r.week_start).slice(0,10) : "-";
      const end = r.week_end ? String(r.week_end).slice(0,10) : "-";
      return `<tr>
        <td>${escapeHtml(start)} ~ ${escapeHtml(end)}</td>
        <td>${escapeHtml(r.display_name || "-")}</td>
        <td><b>${Number(r.profit_share_percent || 0).toLocaleString("ko-KR")}%</b></td>
        <td>${Number(r.sale_count || 0).toLocaleString("ko-KR")}건</td>
        <td>${formatEokAmount(r.sales_amount_eok)}</td>
        <td><b>${formatEokAmount(r.payout_amount_eok)}</b></td>
        <td>${formatEokAmount(r.owner_remainder_eok)}</td>
      </tr>`;
    }).join("");
  }

  function renderProfitSummary() {
    const body = $("profitRows");
    if (!body) return;
    const users = adminUsers || [];
    if (!users.length) {
      body.innerHTML = `<tr><td colspan="6" class="muted">총관리자로 로그인하면 표시됩니다.</td></tr>`;
      return;
    }

    const soldRows = (currentRows || []).filter(r => r.sale_registered && !r.profit_settled_at);
    const totalSales = soldRows.reduce((sum, r) => sum + parseEokAmount(r.price_text), 0);
    const payoutByUser = users.map(u => {
      const share = Number(u.profit_share_percent || 0);
      const sellerRows = soldRows.filter(r => (r.sold_by_name || "") === u.display_name);
      const sellerTotal = sellerRows.reduce((sum, r) => sum + parseEokAmount(r.price_text), 0);
      const payout = sellerTotal * share / 100;
      return { ...u, share, sellerRows, sellerTotal, payout };
    });
    const totalPayout = payoutByUser.reduce((sum, u) => sum + u.payout, 0);

    if ($("profitShareTotal")) $("profitShareTotal").textContent = `${users.length.toLocaleString("ko-KR")}명`;
    if ($("profitShareRemain")) $("profitShareRemain").textContent = formatEokAmount(totalPayout);
    if ($("profitTotalSales")) $("profitTotalSales").textContent = formatEokAmount(totalSales);

    const info = $("profitShareInfo");
    if (info) {
      const msg = "공유 배분 방식이 아니라 각 관리자 본인 판매금액에 본인 수익률만 적용합니다.";
      info.innerHTML = `<strong>개별 수익률 안내</strong><span class="muted">${escapeHtml(msg)}</span>`;
    }

    body.innerHTML = payoutByUser.map(u => {
      const share = Number(u.share || 0);
      const sellerRows = u.sellerRows || [];
      const sellerTotal = Number(u.sellerTotal || 0);
      const payout = Number(u.payout || 0);
      return `<tr>
        <td>${escapeHtml(u.display_name)}</td>
        <td><b>${share.toLocaleString("ko-KR")}%</b></td>
        <td>${formatEokAmount(payout)}</td>
        <td>${sellerRows.length.toLocaleString("ko-KR")}건</td>
        <td>${formatEokAmount(sellerTotal)}</td>
        <td>${u.active ? "활성" : "비활성"}${u.is_super_admin ? " · 총관리자" : ""}</td>
      </tr>`;
    }).join("");
  }


  async function loadSettlementSummary(show=true) {
    try {
      if (!currentAdmin?.is_super_admin) return;
      const { data, error } = await sb.rpc("admin_profit_unsettled_summary", { p_admin_pin:getPin() });
      if (error) throw error;
      settlementSummaryRows = data || [];
      renderSettlementRows(settlementSummaryRows);

      const history = await sb.rpc("admin_list_profit_settlements", { p_admin_pin:getPin(), p_limit:30 });
      if (history.error) throw history.error;
      settlementHistoryRows = history.data || [];
      renderSettlementHistory(settlementHistoryRows);

      if (show) toast("정산 정보를 불러왔습니다.");
    } catch(err) { console.error(err); alert("정산 정보 오류: " + (err?.message || JSON.stringify(err))); }
  }

  function renderSettlementRows(rows) {
    const body = $("settlementRows");
    if (!body) return;
    if (!currentAdmin?.is_super_admin) {
      body.innerHTML = `<tr><td colspan="7" class="muted">총관리자로 로그인하면 표시됩니다.</td></tr>`;
      return;
    }
    if (!rows || !rows.length) {
      body.innerHTML = `<tr><td colspan="7" class="muted">미정산 내역이 없습니다.</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(r => {
      const count = Number(r.unsettled_sale_count || 0);
      const sales = Number(r.unsettled_sales_amount_eok || 0);
      const share = Number(r.profit_share_percent || 0);
      const payout = Number(r.payout_amount_eok || 0);
      const remain = Number(r.owner_remainder_eok || 0);
      const disabled = count <= 0 ? "disabled" : "";
      return `<tr>
        <td>${escapeHtml(r.display_name || "-")}</td>
        <td><b>${share.toLocaleString("ko-KR")}%</b></td>
        <td>${count.toLocaleString("ko-KR")}건</td>
        <td>${formatEokAmount(sales)}</td>
        <td><b>${formatEokAmount(payout)}</b></td>
        <td>${formatEokAmount(remain)}</td>
        <td><button type="button" class="primary" onclick="settleProfit('${r.admin_id}', '${escapeHtml(r.display_name || "관리자")}')" ${disabled}>정산처리</button></td>
      </tr>`;
    }).join("");
  }

  function renderSettlementHistory(rows) {
    const body = $("settlementHistoryRows");
    if (!body) return;
    if (!rows || !rows.length) {
      body.innerHTML = `<tr><td colspan="8" class="muted">정산 내역이 없습니다.</td></tr>`;
      return;
    }
    body.innerHTML = rows.map(r => `<tr>
      <td>${escapeHtml(fmtDate(r.created_at))}</td>
      <td>${escapeHtml(r.admin_name || "-")}</td>
      <td>${Number(r.sale_count || 0).toLocaleString("ko-KR")}건</td>
      <td>${formatEokAmount(r.sales_amount_eok)}</td>
      <td>${Number(r.profit_share_percent || 0).toLocaleString("ko-KR")}%</td>
      <td><b>${formatEokAmount(r.payout_amount_eok)}</b></td>
      <td>${formatEokAmount(r.owner_remainder_eok)}</td>
      <td>${escapeHtml(r.memo || "-")}</td>
    </tr>`).join("");
  }

  async function settleProfit(adminId, adminName) {
    try {
      const target = (settlementSummaryRows || []).find(r => r.admin_id === adminId);
      if (!target) return toast("정산 대상을 찾을 수 없습니다.");
      const count = Number(target.unsettled_sale_count || 0);
      if (count <= 0) return toast("미정산 판매건이 없습니다.");

      const sales = formatEokAmount(target.unsettled_sales_amount_eok);
      const payout = formatEokAmount(target.payout_amount_eok);
      const remain = formatEokAmount(target.owner_remainder_eok);
      const ok = confirm(`${adminName} 정산을 처리할까요?\n\n미정산 판매건: ${count.toLocaleString("ko-KR")}건\n미정산 판매금액: ${sales}\n지급할 수익금: ${payout}\n운영자 잔여금: ${remain}\n\n정산 처리 후 해당 판매건은 미정산 목록에서 제외됩니다.`);
      if (!ok) return;

      const memo = prompt("정산 메모를 입력하세요. 비워도 됩니다.", "정산완료") || "";
      const { data, error } = await sb.rpc("admin_settle_profit", { p_admin_pin:getPin(), p_admin_id:adminId, p_memo:memo || null });
      if (error) throw error;
      if (!data?.ok) return alert(data?.message || "정산 실패");

      toast(data.message || "정산 처리했습니다.");
      await loadSettlementSummary(false);
      await loadCodes(false);
      await loadMyProfitStatus(false);
      await loadWeeklyProfit(false);
    } catch(err) { console.error(err); alert("정산 처리 오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function changeMyPin() {
    try {
      const newPin = $("myNewPin").value.trim();
      const confirmPin = $("myNewPinConfirm").value.trim();
      const passwordError = validateNewAdminPassword(newPin);
      if (passwordError) return toast(passwordError);
      if (newPin !== confirmPin) return toast("새 비밀번호 확인이 일치하지 않습니다.");
      if (!confirm("내 관리자 비밀번호를 변경할까요?")) return;

      const { data, error } = await sb.rpc("admin_change_own_pin", { p_admin_pin:getPin(), p_new_pin:newPin });
      if(error) throw error;
      if(!data?.ok) return alert(data?.message || "비밀번호 변경 실패");

      $("adminPin").value = newPin;
      $("myNewPin").value = "";
      $("myNewPinConfirm").value = "";
      toast(data.message || "비밀번호를 변경했습니다.");

      const refreshed = await sb.rpc("admin_current_user", { p_admin_pin: newPin });
      if (!refreshed.error && refreshed.data?.ok) {
        currentAdmin = refreshed.data;
        renderLoginInfo();
        await loadCodes(false);
        if (currentAdmin.is_super_admin) await loadAdminUsers(false);
      }
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function updateAdminUser(id) {
    try {
      const name = $("admin_name_" + id)?.value.trim() || "";
      const role = $("admin_role_" + id)?.value.trim() || "관리자";
      const isSuper = ($("admin_super_" + id)?.value === "true");
      const active = ($("admin_active_" + id)?.value === "true");
      const percent = Number($("profit_" + id)?.value || 0);
      const newPin = $("admin_pin_" + id)?.value.trim() || null;

      if (!name) return toast("관리자 이름을 입력해주세요.");
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) return toast("수익률은 0~100 사이로 입력해주세요.");
      if (newPin) {
        const passwordError = validateNewAdminPassword(newPin);
        if (passwordError) return toast(passwordError);
      }

      const target = adminUsers.find(u => u.id === id);
      const changingSelfPin = currentAdmin && currentAdmin.admin_id === id && !!newPin;
      const msg = newPin ? `${target?.display_name || "관리자"} 정보와 비밀번호를 저장할까요?` : `${target?.display_name || "관리자"} 정보를 저장할까요?`;
      if (!confirm(msg)) return;

      const { data, error } = await sb.rpc("admin_update_admin_user", {
        p_admin_pin:getPin(),
        p_admin_id:id,
        p_display_name:name,
        p_role_name:role,
        p_new_pin:newPin,
        p_is_super_admin:isSuper,
        p_active:active,
        p_profit_share_percent:percent
      });
      if(error) throw error;
      if(!data?.ok) return alert(data?.message || "관리자 저장 실패");

      if (changingSelfPin) {
        $("adminPin").value = newPin;
      }

      toast(data.message || "관리자 정보를 저장했습니다.");
      const refreshed = await sb.rpc("admin_current_user", { p_admin_pin: getPin() });
      if (!refreshed.error && refreshed.data?.ok) { currentAdmin = refreshed.data; renderLoginInfo(); }
      await loadAdminUsers(false);
      await loadCodes(false);
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }


  async function deleteAdminUser(id) {
    try {
      const target = adminUsers.find(u => u.id === id);
      if (!target) return toast("삭제할 관리자를 찾을 수 없습니다.");
      if (currentAdmin && currentAdmin.admin_id === id) return toast("현재 로그인한 본인 계정은 삭제할 수 없습니다.");
      if (!confirm(`${target.display_name || "관리자"} 관리자를 삭제할까요?

삭제하면 해당 비밀번호로 더 이상 로그인할 수 없습니다.`)) return;

      const { data, error } = await sb.rpc("admin_delete_admin_user", {
        p_admin_pin: getPin(),
        p_admin_id: id
      });
      if (error) throw error;
      if (!data?.ok) return alert(data?.message || "관리자 삭제 실패");

      toast(data.message || "관리자를 삭제했습니다.");
      await loadAdminUsers(false);
      await loadCodes(false);
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function setProfitShare(id) {
    try {
      const input = $("profit_" + id);
      const percent = Number(input?.value || 0);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) return toast("수익률은 0~100 사이로 입력해주세요.");
      const { data, error } = await sb.rpc("admin_set_profit_share", { p_admin_pin:getPin(), p_admin_id:id, p_profit_share_percent:percent });
      if(error) throw error;
      if(!data?.ok) return alert(data?.message || "수익률 저장 실패");
      toast(data.message || "수익률을 저장했습니다.");
      await loadAdminUsers(false);
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function addAdminUser() {
    try {
      const name=$("newAdminName").value.trim(); const role=$("newAdminRole").value.trim() || "관리자"; const pin=$("newAdminPin").value.trim(); const isSuper=$("newAdminSuper").value === "true";
      if(!name) return toast("관리자 이름을 입력해주세요.");
      const passwordError = validateNewAdminPassword(pin);
      if (passwordError) return toast(passwordError);
      const { data, error } = await sb.rpc("admin_add_admin_user", { p_admin_pin:getPin(), p_display_name:name, p_role_name:role, p_new_pin:pin, p_is_super_admin:isSuper });
      if(error) throw error; if(!data?.ok) return alert(data?.message || "저장 실패");
      $("newAdminPin").value=""; toast(data.message || "관리자 저장 완료"); await loadAdminUsers(false);
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function setAdminActive(id, active) {
    try {
      if(!confirm(active ? "이 관리자를 활성화할까요?" : "이 관리자를 비활성화할까요?")) return;
      const { data, error } = await sb.rpc("admin_set_admin_active", { p_admin_pin:getPin(), p_admin_id:id, p_active:active });
      if(error) throw error; if(!data?.ok) return alert(data?.message || "처리 실패");
      toast(data.message); await loadAdminUsers(false);
    } catch(err) { console.error(err); alert("오류: " + (err?.message || JSON.stringify(err))); }
  }


  function clearBlacklistForm() {
    ["blackNickname", "blackUserNumber", "blackItemPrice", "blackAdminNote"].forEach(id => { if ($(id)) $(id).value = ""; });
    if ($("blackPublicReason")) $("blackPublicReason").value = "주사위 패배 후 종료";
    if ($("blackWarningLevel")) $("blackWarningLevel").value = "위험";
  }

  function getBlacklistSameUserRows(userNumber) {
    const clean = String(userNumber || "").replace(/[^0-9]/g, "").trim();
    if (!clean) return [];
    return (blacklistRows || []).filter(r => String(r.user_number || "").replace(/[^0-9]/g, "").trim() === clean);
  }

  function getBlacklistSameUserSummary(userNumber) {
    const sameRows = getBlacklistSameUserRows(userNumber);
    const activeRows = sameRows.filter(r => r.is_active);
    return {
      total: sameRows.length,
      active: activeRows.length,
      recent: sameRows
        .slice()
        .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
        .slice(0, 3)
    };
  }

  function cleanBulkLine(line) {
    return String(line || "")
      .replace(/\r/g, "")
      .replace(/[：]/g, ":")
      .replace(/\uFE0F/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();
  }

  function normalizeBulkBlacklistText(raw) {
    let text = String(raw || "").replace(/\r\n?/g, "\n").replace(/[：]/g, ":").replace(/💰/g, "");
    text = text.replace(/\s*(가해자\s*번호|가해자\s*닉네임|피해자\s*번호|피해자\s*닉네임|피해\s*금액|고유번호|닉네임|상태|사유|물품\s*\/\s*가격)\s*[:：]?/g, "\n$1:");
    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  function getBulkKeyValue(line) {
    const original = cleanBulkLine(line).replace(/^[-•*]+\s*/, "");
    const compact = original.replace(/\s+/g, "");
    const rules = [
      ["offenderNumber", /^가해자번호:?(.*)$/],
      ["offenderNickname", /^가해자닉네임:?(.*)$/],
      ["victimNumber", /^피해자번호:?(.*)$/],
      ["victimNickname", /^피해자닉네임:?(.*)$/],
      ["damageAmount", /^피해금액:?(.*)$/],
      ["userNumber", /^고유번호:?(.*)$/],
      ["nickname", /^닉네임:?(.*)$/],
      ["warningLevel", /^상태:?(.*)$/],
      ["publicReason", /^사유:?(.*)$/],
      ["itemPrice", /^물품\/?가격:?(.*)$/]
    ];
    for (const [key, re] of rules) {
      const m = compact.match(re);
      if (m) {
        let value = m[1] || "";
        const colonIndex = original.indexOf(":");
        if (colonIndex >= 0) value = original.slice(colonIndex + 1).trim();
        return { key, value: cleanBulkLine(value) };
      }
    }
    return null;
  }

  function isBulkKeyLine(line) {
    return !!getBulkKeyValue(line);
  }

  function normalizeWarningLevel(value) {
    const v = String(value || "").trim();
    if (v.includes("주의") && !v.includes("위험")) return "주의";
    return "위험";
  }

  function normalizeBulkAmount(value) {
    let v = String(value || "").replace(/^금액\s*[:：]?\s*/, "").trim();
    v = v.replace(/\s+/g, " ");
    return v;
  }

  function buildBulkAdminNote(report) {
    const notes = [];
    if (report.victimNickname || report.victimNumber) {
      notes.push(`피해자: ${report.victimNickname || "닉네임 없음"}${report.victimNumber ? ` (${report.victimNumber}번)` : ""}`);
    }
    notes.push("관리자 일괄 붙여넣기 등록");
    return notes.join(" / ");
  }

  function makeBulkRow(report, sourceType) {
    const nickname = cleanBulkLine(report.nickname || report.offenderNickname || "");
    const userNumber = String(report.userNumber || report.offenderNumber || "").replace(/[^0-9]/g, "").trim();
    const itemPrice = normalizeBulkAmount(report.itemPrice || report.damageAmount || "");
    const publicReason = cleanBulkLine(report.publicReason || "주사위 패배 후 종료") || "주사위 패배 후 종료";
    const warningLevel = normalizeWarningLevel(report.warningLevel || "위험");
    const adminNote = cleanBulkLine(report.adminNote || buildBulkAdminNote(report));
    if (!nickname || !userNumber) return null;
    return { nickname, userNumber, itemPrice, publicReason, warningLevel, adminNote, sourceType };
  }

  function parseKeyedBulkBlacklist(normalizedText) {
    const lines = normalizedText.split("\n").map(cleanBulkLine).filter(Boolean);
    const rows = [];
    let report = null;
    let sourceType = "keyed";

    function pushCurrent() {
      const row = report ? makeBulkRow(report, sourceType) : null;
      if (row) rows.push(row);
      report = null;
      sourceType = "keyed";
    }

    for (let i = 0; i < lines.length; i++) {
      const kv = getBulkKeyValue(lines[i]);
      if (!kv) continue;

      const startsNew = ["userNumber", "offenderNumber"].includes(kv.key);
      if (startsNew && report && (report.userNumber || report.offenderNumber || report.nickname || report.offenderNickname)) {
        pushCurrent();
      }
      if (!report) report = {};
      if (kv.key.startsWith("offender") || kv.key.startsWith("victim") || kv.key === "damageAmount") sourceType = "external-labeled";

      let value = kv.value;
      if (!value && lines[i + 1] && !isBulkKeyLine(lines[i + 1])) {
        value = lines[i + 1];
        i++;
      }
      report[kv.key] = cleanBulkLine(value);
    }
    pushCurrent();
    return rows;
  }

  function parseSimpleBulkBlacklist(rawText) {
    const lines = String(rawText || "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map(cleanBulkLine)
      .filter(Boolean)
      .filter(line => !isBulkKeyLine(line));
    const rows = [];
    let i = 0;
    while (i < lines.length) {
      const nickname = lines[i];
      const numberLine = lines[i + 1] || "";
      const amountLine = lines[i + 2] || "";
      const parenLine = lines[i + 3] || "";
      const userNumber = String(numberLine).replace(/[^0-9]/g, "").trim();

      if (nickname && userNumber && /번|^[0-9]{1,20}$/.test(numberLine)) {
        let itemPrice = amountLine;
        if (/^\(.+\)$/.test(parenLine)) {
          itemPrice = `${amountLine} ${parenLine}`.trim();
          i += 4;
        } else {
          i += 3;
        }
        const row = makeBulkRow({
          nickname,
          userNumber,
          itemPrice,
          publicReason: "주사위 패배 후 종료",
          warningLevel: "위험",
          adminNote: "관리자 일괄 붙여넣기 등록"
        }, "simple-4-line");
        if (row) rows.push(row);
      } else {
        i++;
      }
    }
    return rows;
  }

  function mergeBulkRows(keyedRows, simpleRows) {
    const rows = [];
    const seen = new Set();
    [...keyedRows, ...simpleRows].forEach((row, index) => {
      const key = [row.nickname, row.userNumber, row.itemPrice, row.publicReason, row.warningLevel, row.adminNote].join("|");
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ ...row, previewIndex: rows.length + 1 });
    });
    return rows;
  }

  function parseBulkBlacklistText(rawText) {
    const normalized = normalizeBulkBlacklistText(rawText);
    const keyedRows = parseKeyedBulkBlacklist(normalized);
    const simpleRows = parseSimpleBulkBlacklist(rawText);
    return mergeBulkRows(keyedRows, simpleRows);
  }

  function renderBulkBlacklistPreview(rows, errorMessage="") {
    const box = $("blackBulkPreview");
    const btn = $("blackBulkRegisterBtn");
    if (!box) return;
    if (btn) btn.disabled = !(rows && rows.length);
    if (errorMessage) {
      box.innerHTML = `<strong>미리보기 실패</strong><span class="muted">${escapeHtml(errorMessage)}</span>`;
      return;
    }
    if (!rows || !rows.length) {
      box.innerHTML = `<strong>미리보기</strong><span class="muted">변환된 항목이 없습니다. 닉네임/고유번호 또는 가해자 번호/가해자 닉네임 형식이 포함되어 있는지 확인하세요.</span>`;
      return;
    }

    const duplicateMap = rows.reduce((acc, r) => {
      acc[r.userNumber] = (acc[r.userNumber] || 0) + 1;
      return acc;
    }, {});
    const cards = rows.map((r, idx) => {
      const dup = duplicateMap[r.userNumber] > 1 ? `<div class="small" style="color:#92400e">같은 고유번호가 이번 붙여넣기 안에 ${duplicateMap[r.userNumber]}건 있습니다. 각각 새 사건으로 등록됩니다.</div>` : "";
      return `<article class="code-card" style="box-shadow:none">
        <div class="code-card-top">
          <div>
            <div class="code-title"><span class="badge revoked">${idx + 1}</span><span class="code">${escapeHtml(r.userNumber)}번</span><b>${escapeHtml(r.nickname)}</b></div>
            <div class="code-sub">${escapeHtml(r.publicReason)} · ${escapeHtml(r.warningLevel)}</div>
          </div>
        </div>
        <div class="code-info-grid">
          <div class="code-info"><small>고유번호</small><strong>${escapeHtml(r.userNumber)}</strong></div>
          <div class="code-info"><small>닉네임</small><strong>${escapeHtml(r.nickname)}</strong></div>
          <div class="code-info"><small>물품/가격</small><strong>${escapeHtml(r.itemPrice || "-")}</strong></div>
          <div class="code-info"><small>관리자 메모</small><strong>${escapeHtml(r.adminNote || "-")}</strong></div>
        </div>
        ${dup}
      </article>`;
    }).join("");

    box.innerHTML = `<strong>미리보기 완료 · ${rows.length.toLocaleString("ko-KR")}건</strong>
      <span class="muted">아래 형식으로 루디스 거래주의 DB에 저장됩니다. 문제가 없으면 [미리보기 항목 일괄 등록]을 누르세요.</span>
      <div class="code-card-list" style="max-height:420px; margin-top:12px">${cards}</div>`;
  }

  function previewBulkBlacklist() {
    try {
      const raw = $("blackBulkInput")?.value || "";
      if (!raw.trim()) {
        bulkBlacklistPreviewRows = [];
        renderBulkBlacklistPreview([], "붙여넣을 내용을 입력해주세요.");
        return;
      }
      bulkBlacklistPreviewRows = parseBulkBlacklistText(raw);
      renderBulkBlacklistPreview(bulkBlacklistPreviewRows);
      if (bulkBlacklistPreviewRows.length) toast(`${bulkBlacklistPreviewRows.length}건을 변환했습니다.`);
    } catch (err) {
      console.error("거래주의 일괄 변환 오류", err);
      bulkBlacklistPreviewRows = [];
      renderBulkBlacklistPreview([], err?.message || String(err));
    }
  }

  function clearBulkBlacklist() {
    if ($("blackBulkInput")) $("blackBulkInput").value = "";
    bulkBlacklistPreviewRows = [];
    renderBulkBlacklistPreview([]);
    toast("붙여넣기 내용을 초기화했습니다.");
  }

  async function registerBulkBlacklist() {
    try {
      syncAdminCredentialFields();
      if (!currentAdmin) return toast("관리자 로그인 후 사용할 수 있습니다.");
      if (!bulkBlacklistPreviewRows.length) previewBulkBlacklist();
      const rows = bulkBlacklistPreviewRows || [];
      if (!rows.length) return toast("먼저 미리보기 변환을 해주세요.");

      const sample = rows.slice(0, 8).map(r => `${r.nickname} / ${r.userNumber}번 / ${r.itemPrice || "-"}`).join("\n");
      const ok = confirm(`거래주의 ${rows.length.toLocaleString("ko-KR")}건을 일괄 등록할까요?\n\n${sample}${rows.length > 8 ? "\n..." : ""}\n\n※ 같은 고유번호가 있어도 각각 새 사건으로 등록됩니다.\n※ 기존 데이터는 삭제하지 않습니다.`);
      if (!ok) return;

      const btn = $("blackBulkRegisterBtn");
      if (btn) btn.disabled = true;
      let success = 0;
      let failed = 0;
      const failedRows = [];

      for (const r of rows) {
        const { data, error } = await sb.rpc("admin_add_blacklist_user", {
          p_admin_pin: getPin(),
          p_nickname: r.nickname,
          p_user_number: r.userNumber,
          p_public_reason: r.publicReason || "주사위 패배 후 종료",
          p_warning_level: r.warningLevel || "위험",
          p_admin_note: r.adminNote || "관리자 일괄 붙여넣기 등록",
          p_item_price_text: r.itemPrice || null
        });
        if (error || !data?.ok) {
          console.error("거래주의 일괄 등록 실패", r, error || data);
          failed++;
          failedRows.push(`${r.nickname} / ${r.userNumber}번`);
        } else {
          success++;
        }
      }

      await loadBlacklistUsers(false);
      if (success && !failed) {
        toast(`일괄 등록 완료: ${success.toLocaleString("ko-KR")}건`);
        clearBulkBlacklist();
      } else {
        renderBulkBlacklistPreview(rows, `등록 완료 ${success}건 / 실패 ${failed}건${failedRows.length ? " · 실패: " + failedRows.slice(0, 5).join(", ") : ""}`);
        toast(`등록 완료 ${success}건 · 실패 ${failed}건`);
      }
    } catch(err) {
      console.error(err);
      alert("거래주의 일괄 등록 오류: " + (err?.message || JSON.stringify(err)) + "\n\nSQL 함수가 아직 설치되지 않았으면 기존 거래주의 등록 함수가 정상 설치되어 있는지 확인해주세요.");
      renderBulkBlacklistPreview(bulkBlacklistPreviewRows || []);
    }
  }

  async function addBlacklistUser() {
    try {
      syncAdminCredentialFields();
      if (!currentAdmin) return toast("관리자 로그인 후 사용할 수 있습니다.");
      const nickname = ($("blackNickname")?.value || "").trim();
      const userNumber = ($("blackUserNumber")?.value || "").replace(/[^0-9]/g, "").trim();
      const itemPrice = ($("blackItemPrice")?.value || "").trim();
      const publicReason = ($("blackPublicReason")?.value || "").trim() || "주사위 패배 후 종료";
      const warningLevel = ($("blackWarningLevel")?.value || "위험").trim() || "위험";
      const adminNote = ($("blackAdminNote")?.value || "").trim();

      if (!nickname) return toast("닉네임을 입력해주세요.");
      if (!userNumber) return toast("고유번호를 입력해주세요.");

      try {
        if (!blacklistRows.length) await loadBlacklistUsers(false);
      } catch (e) {
        console.warn("동일 고유번호 이력 확인 실패. 등록은 계속 진행합니다.", e);
      }

      const sameInfo = getBlacklistSameUserSummary(userNumber);
      const recentLines = sameInfo.recent.map((r, idx) => {
        const price = r.item_price_text ? ` / ${r.item_price_text}` : "";
        return `${idx + 1}. ${r.nickname || "닉네임 없음"}${price} / ${r.warning_level || "위험"} / ${r.public_reason || "주사위 패배 후 종료"}`;
      }).join("\n");
      const duplicateNotice = sameInfo.total > 0
        ? `

⚠️ 같은 고유번호 등록 이력: 전체 ${sameInfo.total}건 / 활성 ${sameInfo.active}건
${recentLines}

확인을 누르면 기존 내용 수정이 아니라 '새 사건'으로 추가 등록됩니다.
기존 사건을 고치려면 목록에서 [내용수정] 버튼을 사용하세요.`
        : "";

      const ok = confirm(`거래주의 사건으로 추가 등록할까요?${duplicateNotice}

닉네임: ${nickname}
고유번호: ${userNumber}
물품/가격: ${itemPrice || "-"}
주의 단계: ${warningLevel}
메인 사유: ${publicReason}

등록 후 VIP 유저 조회 화면에 표시될 수 있습니다.`);
      if (!ok) return;

      const { data, error } = await sb.rpc("admin_add_blacklist_user", {
        p_admin_pin: getPin(),
        p_nickname: nickname,
        p_user_number: userNumber,
        p_public_reason: publicReason,
        p_warning_level: warningLevel,
        p_admin_note: adminNote || null,
        p_item_price_text: itemPrice || null
      });
      if (error) throw error;
      if (!data?.ok) return alert(data?.message || "거래주의 등록 실패");
      toast(data.message || "거래주의 대상을 등록했습니다.");
      clearBlacklistForm();
      await loadBlacklistUsers(false);
    } catch(err) {
      console.error(err);
      alert("거래주의 등록 오류: " + (err?.message || JSON.stringify(err)) + "\n\nSQL 함수가 아직 설치되지 않았으면 README의 SQL을 먼저 적용해야 합니다.");
    }
  }

  async function loadBlacklistUsers(show=true) {
    try {
      if (!currentAdmin) return;
      const { data, error } = await sb.rpc("admin_list_blacklist_users", { p_admin_pin:getPin(), p_limit:500 });
      if (error) throw error;
      blacklistRows = data || [];
      renderBlacklistRows(blacklistRows);
      if (show) toast("거래주의 목록을 불러왔습니다.");
    } catch(err) {
      console.error(err);
      const body = $("blacklistRows");
      if (body) body.innerHTML = `<div class="code-empty">거래주의 목록 오류: ${escapeHtml(err?.message || JSON.stringify(err))}<br><br>Supabase에 거래주의 SQL 함수가 설치되어 있는지 확인하세요.</div>`;
    }
  }

  function renderBlacklistRows(rows) {
    const body = $("blacklistRows");
    if (!body) return;
    const query = ($("blackSearchInput")?.value || "").trim().toLowerCase();
    const status = ($("blackStatusFilter")?.value || "all");
    const list = (rows || []).filter(r => {
      if (status === "active" && !r.is_active) return false;
      if (status === "inactive" && r.is_active) return false;
      if (!query) return true;
      return [r.nickname, r.user_number, r.item_price_text, r.public_reason, r.warning_level, r.admin_note, r.created_by_name].map(v => String(v || "").toLowerCase()).join(" ").includes(query);
    });

    if (!list.length) {
      body.innerHTML = `<div class="code-empty">표시할 거래주의 대상이 없습니다.</div>`;
      return;
    }

    body.innerHTML = list.map(r => {
      const cls = r.is_active ? "revoked" : "expired";
      const statusText = r.is_active ? "활성" : "비활성";
      const actionBtn = r.is_active
        ? `<button type="button" class="warn" onclick="setBlacklistActive('${r.id}', false)">비활성</button>`
        : `<button type="button" class="ok" onclick="setBlacklistActive('${r.id}', true)">활성</button>`;
      return `<article class="code-card ${cls}">
        <div class="code-card-top">
          <div>
            <div class="code-title">
              <span class="badge ${cls}">${escapeHtml(statusText)}</span>
              <span class="code">${escapeHtml(r.user_number || "-")}</span>
              <span class="badge used">${escapeHtml(r.warning_level || "위험")}</span>
              ${getBlacklistSameUserSummary(r.user_number).total > 1 ? `<span class="badge expired">누적 ${getBlacklistSameUserSummary(r.user_number).total}건</span>` : ""}
            </div>
            <div class="code-sub">${escapeHtml(r.nickname || "닉네임 없음")} · 등록 ${escapeHtml(fmtDate(r.created_at))} · 등록 관리자 ${escapeHtml(r.created_by_name || "관리자")}${getBlacklistSameUserSummary(r.user_number).total > 1 ? ` · 동일 고유번호 활성 ${getBlacklistSameUserSummary(r.user_number).active}건 / 전체 ${getBlacklistSameUserSummary(r.user_number).total}건` : ""}</div>
          </div>
          <div class="code-actions">
            ${actionBtn}
            <button type="button" class="primary" onclick="editBlacklistUser('${r.id}')">내용수정</button>
            <button type="button" class="danger" onclick="deleteBlacklistUser('${r.id}')">삭제</button>
            <button type="button" class="ghost" onclick="copyText('${escapeHtml(r.user_number || "")}'); toast('고유번호를 복사했습니다.')">고유번호 복사</button>
          </div>
        </div>
        <div class="code-info-grid">
          <div class="code-info"><small>닉네임 / 고유번호</small><strong>${escapeHtml(r.nickname || "-")}</strong><div class="small">${escapeHtml(r.user_number || "-")}</div></div>
          <div class="code-info"><small>물품 / 가격</small><strong>${escapeHtml(r.item_price_text || "-")}</strong><div class="small">VIP 메인 조회에 표시</div></div>
          <div class="code-info"><small>메인 사유</small><strong>${escapeHtml(r.public_reason || "주사위 패배 후 종료")}</strong><div class="small">주의단계: ${escapeHtml(r.warning_level || "위험")}</div></div>
          <div class="code-info"><small>등록 관리자</small><strong>${escapeHtml(r.created_by_name || "관리자")}</strong><div class="small">등록 ${escapeHtml(fmtDate(r.created_at))}</div></div>
          <div class="code-info"><small>관리자 메모</small><strong>${escapeHtml(r.admin_note || "-")}</strong><div class="small">관리자 전용 · 수정 ${escapeHtml(fmtDate(r.updated_at))}</div></div>
        </div>
      </article>`;
    }).join("");
  }

  async function editBlacklistUser(id) {
    try {
      if (!currentAdmin) return toast("관리자 로그인 후 사용할 수 있습니다.");
      const r = (blacklistRows || []).find(x => String(x.id) === String(id));
      if (!r) return toast("수정할 거래주의 대상을 찾을 수 없습니다.");

      const nickname = prompt("닉네임을 수정하세요.", r.nickname || "");
      if (nickname === null) return;
      const userNumberRaw = prompt("고유번호를 수정하세요. 숫자만 입력됩니다.", r.user_number || "");
      if (userNumberRaw === null) return;
      const userNumber = String(userNumberRaw || "").replace(/[^0-9]/g, "").trim();
      if (!nickname.trim()) return toast("닉네임은 비워둘 수 없습니다.");
      if (!userNumber) return toast("고유번호는 비워둘 수 없습니다.");

      const itemPrice = prompt("물품/가격을 수정하세요. 예: 200억, 100억", r.item_price_text || "");
      if (itemPrice === null) return;
      const publicReason = prompt("메인에 표시될 사유를 수정하세요.", r.public_reason || "주사위 패배 후 종료");
      if (publicReason === null) return;
      const warningLevelRaw = prompt("주의 단계를 입력하세요. '위험' 또는 '주의'만 가능합니다.", r.warning_level || "위험");
      if (warningLevelRaw === null) return;
      const warningLevel = String(warningLevelRaw || "위험").trim();
      if (!["위험", "주의"].includes(warningLevel)) return toast("주의 단계는 '위험' 또는 '주의'만 입력할 수 있습니다.");
      const adminNote = prompt("관리자 메모를 수정하세요. 유저 메인에는 표시되지 않습니다.", r.admin_note || "");
      if (adminNote === null) return;

      const ok = confirm(`거래주의 내용을 수정할까요?\n\n닉네임: ${nickname.trim()}\n고유번호: ${userNumber}\n물품/가격: ${itemPrice.trim() || "-"}\n주의 단계: ${warningLevel}\n메인 사유: ${publicReason.trim() || "주사위 패배 후 종료"}\n\n수정 후 VIP 메인 조회 결과에 반영됩니다.`);
      if (!ok) return;

      const { data, error } = await sb.rpc("admin_update_blacklist_user", {
        p_admin_pin: getPin(),
        p_id: id,
        p_nickname: nickname.trim(),
        p_user_number: userNumber,
        p_item_price_text: itemPrice.trim() || null,
        p_public_reason: publicReason.trim() || "주사위 패배 후 종료",
        p_warning_level: warningLevel,
        p_admin_note: adminNote.trim() || null
      });
      if (error) throw error;
      if (!data?.ok) return alert(data?.message || "수정 실패");
      toast(data.message || "거래주의 내용을 수정했습니다.");
      await loadBlacklistUsers(false);
    } catch(err) { console.error(err); alert("거래주의 수정 오류: " + (err?.message || JSON.stringify(err)) + "\n\nREADME의 Supabase SQL을 먼저 적용했는지 확인하세요."); }
  }

  async function setBlacklistActive(id, active) {
    try {
      if (!currentAdmin) return toast("관리자 로그인 후 사용할 수 있습니다.");
      const ok = confirm(active ? "이 거래주의 대상을 다시 활성화할까요?" : "이 거래주의 대상을 비활성 처리할까요?\n\n비활성 처리하면 VIP 조회 결과에 표시되지 않습니다.");
      if (!ok) return;
      const { data, error } = await sb.rpc("admin_set_blacklist_active", { p_admin_pin:getPin(), p_id:id, p_is_active:active });
      if (error) throw error;
      if (!data?.ok) return alert(data?.message || "처리 실패");
      toast(data.message || "처리했습니다.");
      await loadBlacklistUsers(false);
    } catch(err) { console.error(err); alert("거래주의 상태 변경 오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function deleteBlacklistUser(id) {
    try {
      if (!currentAdmin) return toast("관리자 로그인 후 사용할 수 있습니다.");
      const ok = confirm("이 거래주의 대상을 완전히 삭제할까요?\n\n삭제하면 VIP 조회 결과에서 정상 유저로 표시됩니다.\n이 작업은 되돌릴 수 없습니다.");
      if (!ok) return;
      const typed = prompt("정말 삭제하려면 '삭제'라고 입력하세요.");
      if (typed !== "삭제") return toast("삭제를 취소했습니다.");
      const { data, error } = await sb.rpc("admin_delete_blacklist_user", { p_admin_pin:getPin(), p_id:id });
      if (error) throw error;
      if (!data?.ok) return alert(data?.message || "삭제 실패");
      toast(data.message || "거래주의 대상을 삭제했습니다.");
      await loadBlacklistUsers(false);
    } catch(err) { console.error(err); alert("거래주의 삭제 오류: " + (err?.message || JSON.stringify(err))); }
  }

  function withTimeout(ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, done: () => clearTimeout(timer) };
  }

  async function resolveAdminClientIp() {
    try {
      const cached = sessionStorage.getItem("ludis_admin_ip_cache_v1");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.ip && parsed?.savedAt && Date.now() - parsed.savedAt < 10 * 60 * 1000) return parsed;
      }
    } catch (_) {}

    const endpoints = [
      { url: "https://api.ipify.org?format=json", source: "api.ipify.org" },
      { url: "https://api64.ipify.org?format=json", source: "api64.ipify.org" }
    ];

    for (const ep of endpoints) {
      const t = withTimeout(2600);
      try {
        const res = await fetch(ep.url, { signal: t.signal, cache: "no-store" });
        t.done();
        if (!res.ok) continue;
        const data = await res.json();
        const ip = String(data?.ip || "").trim();
        if (ip) {
          const payload = { ip, source: ep.source, savedAt: Date.now() };
          try { sessionStorage.setItem("ludis_admin_ip_cache_v1", JSON.stringify(payload)); } catch (_) {}
          return payload;
        }
      } catch (_) {
        t.done();
      }
    }
    return { ip: "", source: "ip_lookup_failed", savedAt: Date.now() };
  }

  async function getAdminClientInfo() {
    const ua = navigator.userAgent || "";
    let device = "PC/기타";
    if (/Android/i.test(ua)) device = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) device = "iPhone/iPad";
    else if (/Windows/i.test(ua)) device = "Windows";
    else if (/Macintosh|Mac OS X/i.test(ua)) device = "Mac";

    if (!cachedAdminIpInfo) cachedAdminIpInfo = await resolveAdminClientIp();

    return {
      userAgent: ua.slice(0, 500),
      pageUrl: location.href.slice(0, 500),
      device,
      clientIp: cachedAdminIpInfo?.ip || "",
      ipSource: cachedAdminIpInfo?.source || "unknown"
    };
  }

  async function verifyAdminLoginWithSecurity(pin) {
    const info = await getAdminClientInfo();
    try {
      // p_client_ip는 브라우저가 조회한 참고값이다. 실제 IP 보안 경계는 서버/Edge Function에서 검증해야 한다.
      const { data, error } = await sb.rpc("admin_verify_login_with_block", {
        p_admin_pin: pin,
        p_client_ip: info.clientIp || null,
        p_ip_source: info.ipSource || null,
        p_user_agent: `${info.device} · ${info.userAgent}`.slice(0, 500),
        p_page_url: info.pageUrl
      });
      if (error) throw error;
      return { data, securityRpc: true };
    } catch (err) {
      console.error("관리자 보안 로그인 검증 실패:", err);
      return {
        data: null,
        error: new Error("관리자 보안 로그인 서비스를 확인할 수 없습니다. 잠시 후 다시 시도해주세요."),
        securityRpc: true
      };
    }
  }

  async function writeAdminLoginLog(success, reason) {
    try {
      const pin = ($("adminPin")?.value || $("adminGatePin")?.value || "").trim();
      if (!pin) return;
      const info = await getAdminClientInfo();
      await sb.rpc("admin_log_login_event", {
        p_admin_pin: pin,
        p_login_success: !!success,
        p_failure_reason: reason || null,
        p_user_agent: `${info.device} · ${info.userAgent}`.slice(0, 500),
        p_page_url: info.pageUrl
      });
    } catch (err) {
      console.warn("관리자 접속 이력 기록 실패:", err);
    }
  }

  async function loadAdminLoginLogs(show=true) {
    try {
      if (!currentAdmin?.is_super_admin) return toast("총관리자만 접속 이력을 볼 수 있습니다.");
      const limit = Math.max(10, Math.min(500, Number($("adminLoginLogLimit")?.value || 100)));
      const { data, error } = await sb.rpc("admin_list_login_logs", { p_admin_pin:getPin(), p_limit:limit });
      if (error) throw error;
      if (!data?.ok) {
        const body = $("adminLoginLogRows");
        if (body) body.innerHTML = `<div class="code-empty">접속 이력을 불러오지 못했습니다.<br>${escapeHtml(data?.message || "SQL 함수가 설치되어 있는지 확인하세요.")}</div>`;
        return;
      }
      adminLoginLogsData = data.logs || [];
      renderAdminLoginLogs(adminLoginLogsData);
      if (show) toast("관리자 접속 이력을 불러왔습니다.");
    } catch(err) {
      console.error("관리자 접속 이력 오류:", err);
      const body = $("adminLoginLogRows");
      if (body) body.innerHTML = `<div class="code-empty">관리자 접속 이력 오류: ${escapeHtml(err?.message || JSON.stringify(err))}<br><br>ZIP 안의 SQL 파일을 Supabase SQL Editor에 먼저 적용했는지 확인하세요.</div>`;
    }
  }

  function renderAdminLoginLogs(rows) {
    const body = $("adminLoginLogRows");
    if (!body) return;
    const items = rows || [];
    if (!items.length) {
      body.innerHTML = `<div class="code-empty">표시할 관리자 접속 이력이 없습니다.</div>`;
      return;
    }
    body.innerHTML = items.map(r => {
      const ok = !!r.login_success;
      const blocked = !!r.blocked_ip;
      const badgeClass = blocked ? "warn" : (ok ? "used" : "revoked");
      const statusText = blocked ? "IP 차단" : (ok ? "로그인 성공" : "로그인 실패");
      const adminName = r.admin_name || (ok ? "관리자" : "확인 불가");
      const role = r.role_name || "-";
      const reason = r.failure_reason || (ok ? "정상 접속" : "비밀번호 불일치 또는 인증 실패");
      const ua = r.user_agent || "-";
      const ip = r.client_ip || "IP 확인 실패";
      const failCount = r.failure_count_after ? `${r.failure_count_after}/5` : "-";
      return `<article class="code-card ${badgeClass}">
        <div class="code-card-top">
          <div>
            <div class="code-title">
              <span class="badge ${badgeClass}">${escapeHtml(statusText)}</span>
              <span class="code">${escapeHtml(adminName)}</span>
            </div>
            <div class="code-sub">${escapeHtml(fmtDate(r.created_at))} · ${escapeHtml(role)}${r.is_super_admin ? " · 총관리자" : ""}</div>
          </div>
        </div>
        <div class="code-info-grid">
          <div class="code-info"><small>관리자</small><strong>${escapeHtml(adminName)}</strong><div class="small">ID: ${escapeHtml(r.admin_id || "-")}</div></div>
          <div class="code-info"><small>결과</small><strong>${escapeHtml(statusText)}</strong><div class="small">${escapeHtml(reason)} · 실패 ${escapeHtml(failCount)}</div></div>
          <div class="code-info"><small>IP</small><strong>${escapeHtml(ip)}</strong><div class="small">수집: ${escapeHtml(r.ip_source || "-")}</div></div>
          <div class="code-info"><small>접속 환경</small><strong>${escapeHtml(ua.slice(0, 90))}${ua.length > 90 ? "..." : ""}</strong><div class="small">${escapeHtml(r.page_url || "-")}</div></div>
        </div>
      </article>`;
    }).join("");
  }

  async function deleteOldAdminLoginLogs() {
    try {
      if (!currentAdmin?.is_super_admin) return toast("총관리자만 접속 이력을 삭제할 수 있습니다.");
      const days = Math.max(1, Math.min(365, Number($("adminLoginLogDeleteDays")?.value || 30)));
      const ok = confirm(`${days}일보다 오래된 관리자 접속 이력을 삭제할까요?\n\n최근 이력은 유지되고, 오래된 이력만 삭제됩니다.`);
      if (!ok) return;
      const typed = prompt("정말 삭제하려면 '이력삭제'라고 입력하세요.");
      if (typed !== "이력삭제") return toast("삭제를 취소했습니다.");
      const { data, error } = await sb.rpc("admin_delete_old_login_logs", { p_admin_pin:getPin(), p_days:days });
      if (error) throw error;
      if (!data?.ok) return alert(data?.message || "접속 이력 삭제 실패");
      toast(data.message || "오래된 접속 이력을 삭제했습니다.");
      await loadAdminLoginLogs(false);
    } catch(err) { console.error(err); alert("접속 이력 삭제 오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function loadAdminBlockedIps(show=true) {
    try {
      if (!currentAdmin?.is_super_admin) return toast("총관리자만 차단 IP를 볼 수 있습니다.");
      const { data, error } = await sb.rpc("admin_list_blocked_login_ips", { p_admin_pin:getPin(), p_limit:200 });
      if (error) throw error;
      if (!data?.ok) {
        const body = $("adminBlockedIpRows");
        if (body) body.innerHTML = `<div class="code-empty">차단 IP를 불러오지 못했습니다.<br>${escapeHtml(data?.message || "SQL 함수가 설치되어 있는지 확인하세요.")}</div>`;
        return;
      }
      adminBlockedIpsData = data.rows || [];
      renderAdminBlockedIps(adminBlockedIpsData);
      if (show) toast("차단 IP 목록을 불러왔습니다.");
    } catch(err) {
      console.error("차단 IP 목록 오류:", err);
      const body = $("adminBlockedIpRows");
      if (body) body.innerHTML = `<div class="code-empty">차단 IP 목록 오류: ${escapeHtml(err?.message || JSON.stringify(err))}<br><br>ZIP 안의 SQL 파일을 Supabase SQL Editor에 먼저 적용했는지 확인하세요.</div>`;
    }
  }

  function renderAdminBlockedIps(rows) {
    const body = $("adminBlockedIpRows");
    if (!body) return;
    const items = rows || [];
    if (!items.length) {
      body.innerHTML = `<div class="code-empty">현재 차단된 관리자 로그인 IP가 없습니다.</div>`;
      return;
    }
    body.innerHTML = items.map(r => {
      const ip = r.client_ip || "-";
      const failCount = r.fail_count || 0;
      return `<article class="code-card revoked">
        <div class="code-card-top">
          <div>
            <div class="code-title"><span class="badge revoked">차단중</span><span class="code">${escapeHtml(ip)}</span></div>
            <div class="code-sub">차단일 ${escapeHtml(fmtDate(r.blocked_at))} · 최근 실패 ${escapeHtml(fmtDate(r.last_failed_at))}</div>
          </div>
          <div class="code-actions">
            <button type="button" class="warn" onclick="unblockAdminLoginIp('${escapeHtml(ip)}')">차단 해제</button>
          </div>
        </div>
        <div class="code-info-grid">
          <div class="code-info"><small>IP</small><strong>${escapeHtml(ip)}</strong><div class="small">수집: ${escapeHtml(r.ip_source || "-")}</div></div>
          <div class="code-info"><small>실패 횟수</small><strong>${escapeHtml(failCount)}회</strong><div class="small">5회 이상이면 영구 차단</div></div>
          <div class="code-info"><small>차단 사유</small><strong>${escapeHtml(r.blocked_reason || "관리자 비밀번호 5회 이상 실패")}</strong></div>
          <div class="code-info"><small>최근 환경</small><strong>${escapeHtml((r.last_user_agent || "-").slice(0, 90))}${(r.last_user_agent || "").length > 90 ? "..." : ""}</strong></div>
        </div>
      </article>`;
    }).join("");
  }

  async function unblockAdminLoginIp(ip) {
    try {
      if (!currentAdmin?.is_super_admin) return toast("총관리자만 차단 해제가 가능합니다.");
      const cleanIp = String(ip || "").trim();
      if (!cleanIp) return toast("해제할 IP가 없습니다.");
      const ok = confirm(`${cleanIp} IP의 관리자 로그인 차단을 해제할까요?`);
      if (!ok) return;
      const typed = prompt("정말 해제하려면 '차단해제'라고 입력하세요.");
      if (typed !== "차단해제") return toast("차단 해제를 취소했습니다.");
      const { data, error } = await sb.rpc("admin_unblock_login_ip", { p_admin_pin:getPin(), p_client_ip:cleanIp });
      if (error) throw error;
      if (!data?.ok) return alert(data?.message || "차단 해제 실패");
      toast(data.message || "차단을 해제했습니다.");
      await loadAdminBlockedIps(false);
      await loadAdminLoginLogs(false);
    } catch(err) { console.error(err); alert("차단 해제 오류: " + (err?.message || JSON.stringify(err))); }
  }

  async function copyText(text) { if(!text) return; try{ await navigator.clipboard.writeText(text); } catch { const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); } }
  async function copyRowCode(index) { const code=currentRows[index]?.issued_code; if(!code) return; await copyText(code); toast("코드를 복사했습니다."); }
  async function copyIssuedCodes() { if(!lastIssued.length) return toast("방금 생성한 코드가 없습니다."); await copyText(lastIssued.map(x=>x.issued_code).join("\n")); toast("방금 생성한 코드를 복사했습니다."); }
  async function copyUnusedCodes() { const unused=currentRows.filter(r=>!r.is_used&&!r.revoked&&r.issued_code).map(r=>r.issued_code); if(!unused.length) return toast("복사할 미사용 코드가 없습니다."); await copyText(unused.join("\n")); toast(`미사용 코드 ${unused.length}개를 복사했습니다.`); }
  async function copyLastSaleText() { if(!lastSaleText) return toast("복사할 판매 문구가 없습니다."); await copyText(lastSaleText); toast("판매 문구를 복사했습니다."); }

  window.addEventListener("DOMContentLoaded", () => {
    clearLegacySavedAdminPin();
    renderLoginInfo();
    showView("sales");
    setTimeout(() => { if ($("adminGatePin")) $("adminGatePin").focus(); }, 50);
  });
