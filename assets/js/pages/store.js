import { el, clear, toast } from "../utils/dom.js";
import { adminListUsers, adminUserResults, adminGiftCoins, adminDeleteUser } from "../cloud.js";
import { pageHeader, backLink, noticeBox } from "./shared.js";
import { openLabel } from "../openLog.js";
import { openModal as _openModal } from "./shared.js";
import { getPaymentConfig, isPaymentReady } from "../config.js";
import { getCoins, checkInStatus, claimCheckIn, redeemLicense, creditPaidReturn, COIN_PRICE_KRW, PRICE_TABLE, redeemCode, isAdmin, setAdmin, isFamily, setFamily, monthlyCodes, MONTHLY_CODES, isDayPass, dayPassStatus, DAYPASS_MAX, applyDayPass, dayPassScopeName, logGift, getGiftLog } from "../wallet.js";

export function renderStore({ navigate }) {
  const root = el("div", {});

  // 결제 성공 후 리다이렉트로 돌아온 경우 → 코인 자동 충전 (키 입력 없이)
  handlePaidReturn();
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("코인 충전소", "코인으로 더 깊게 보기",
    "깊이 있는 해석은 코인으로 열어요. 매일 출석하면 무료 코인도 받을 수 있어요."));

  // 코인 잔액
  root.append(el("section", { class: "wrap" }, [
    el("div", { class: "panel panel-gold", style: "display:flex; align-items:center; gap:14px;" }, [
      coinMark("lg"),
      el("div", { style: "flex:1;" }, [
        el("p", { class: "muted tiny", text: "내 코인" }),
        el("p", { id: "coin-balance", class: "serif", style: "font-size:2rem; font-weight:800; color:var(--c-gold-soft); line-height:1;", text: String(getCoins()) }),
      ]),
      el("span", { class: "muted tiny", text: `코인 1개 = 해석 1회` }),
    ]),
  ]));

  // 출석체크
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [checkInCard()]));

  // 충전 패키지
  root.append(el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-5);" }, [
    el("h2", { style: "font-size:1.1rem;", text: "코인 충전" }),
    chargeArea(),
  ]));

  // 결제=자동 충전 안내 (+ 안 들어왔을 때만 쓰는 수동 키 입력)
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [topupInfoCard()]));

  // 쿠폰 · 관리자 코드
  root.append(el("section", { class: "wrap", style: "margin-top: var(--sp-4);" }, [codeBox()]));

  // 코인 사용 안내 + 정직한 고지
  root.append(el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-4);" }, [
    el("div", { class: "panel" }, [
      el("p", { style: "font-weight:700; margin-bottom:10px;", text: "가격표" }),
      ...PRICE_TABLE.map((g) => el("div", { style: "margin-bottom: var(--sp-3);" }, [
        el("p", { class: "eyebrow", style: "margin-bottom:6px;", text: g.group }),
        el("div", { class: "price-rows" }, g.items.map(([name, cost]) => el("div", { class: "price-row" }, [
          el("span", { text: name }),
          cost ? el("span", { class: "price-coin" }, [el("span", { class: "coin-mark sm", "aria-hidden": "true" }), el("span", { text: String(cost) })]) : el("span", { class: "price-coin free", text: "무료" }),
        ]))),
      ])),
      el("p", { class: "muted tiny", style: "margin-top:6px;", text: "기본 운세(오늘·이달·올해·연애·재물·직업 등)와 운세 캘린더는 모두 무료예요. 코인은 프리미엄 특집에만 들어가고, 한 번 연 프리미엄은 다시 볼 때 무료!" }),
    ]),
    noticeBox("info", "코인은 로그인하면 내 계정에 저장돼서 다른 기기에서도 그대로 쓸 수 있어요. 회원 탈퇴 시 남은 코인과 열어 둔 풀이는 모두 사라지며, 복구·환불되지 않고 해묘는 이에 대해 책임지지 않아요."),
  ]));

  return root;
}

function refreshBalance() {
  const n = document.getElementById("coin-balance");
  if (n) n.textContent = String(getCoins());
}

/* 결제 성공 리다이렉트 처리 — URL의 pack·order 파라미터로 코인 자동 지급 후 파라미터 제거 */
function handlePaidReturn() {
  let params = {};
  try {
    const hash = location.hash || "";
    const qi = hash.indexOf("?");
    if (qi >= 0) params = Object.fromEntries(new URLSearchParams(hash.slice(qi + 1)));
    // 일부 결제사는 해시가 아닌 실제 쿼리스트링으로 되돌려줌
    if (!params.order && !params.order_id && location.search) {
      params = Object.assign(Object.fromEntries(new URLSearchParams(location.search)), params);
    }
  } catch { /* ignore */ }
  if (!(params.pack || params.coins || params.paid)) return;
  const res = creditPaidReturn(params);
  // 파라미터 정리(새로고침 중복 방지 표시)
  try { history.replaceState(null, "", location.pathname + location.search + "#/store"); } catch { /* ignore */ }
  if (res.ok) {
    setTimeout(() => showPopup(`코인 ${res.added}개가 충전됐어요!`, "결제 완료 · 바로 사용 가능"), 60);
  } else if (res.reason === "dup") {
    setTimeout(() => toast("이미 충전된 결제예요."), 60);
  }
}

function checkInCard() {
  const wrap = el("div", { class: "panel" });
  function render() {
    clear(wrap);
    const s = checkInStatus();
    wrap.append(
      el("div", { style: "display:flex; align-items:center; gap:10px;" }, [
        coinMark(),
        el("div", { style: "flex:1;" }, [
          el("p", { style: "font-weight:700;", text: "매일 출석 체크" }),
          el("p", { class: "muted tiny", text: s.streak ? `연속 ${s.streak}일째 · 7일마다 보너스 +${3}` : "출석하면 무료 코인을 드려요 · 7일 연속 보너스" }),
        ]),
      ]),
      el("div", { class: "streak-dots", style: "display:flex; gap:6px; margin:12px 0;" },
        (() => {
          const cyc = s.streak % 7;
          const filled = (s.streak > 0 && cyc === 0) ? 7 : cyc;
          return Array.from({ length: 7 }, (_, i) => el("span", { class: "streak-dot" + (i < filled ? " on" : "") + (i === 6 ? " bonus" : "") }));
        })()),
      s.claimedToday
        ? el("button", { class: "btn btn-ghost btn-block", disabled: true }, [el("span", { text: "오늘 출석 완료" })])
        : el("button", { class: "btn btn-primary btn-block", onclick: () => {
            const r = claimCheckIn();
            if (r.ok) {
              toast(`출석 완료 · 코인 +${r.reward}${r.bonus ? " (연속 보너스 포함)" : ""}`);
              refreshBalance(); render();
            }
          } }, [el("span", { text: `출석하고 코인 받기 · +${s.reward}` })]),
    );
  }
  render();
  return wrap;
}

function chargeArea() {
  const cfg = getPaymentConfig();
  if (!isPaymentReady()) {
    return el("div", { class: "panel", style: "text-align:center;" }, [
      el("p", { style: "font-weight:700;", text: "충전 준비 중" }),
      el("p", { class: "muted tiny", style: "margin-top:6px;", text: "코인 충전은 곧 열려요. 지금은 매일 출석 코인으로 이용해 보세요." }),
    ]);
  }
  const grid = el("div", { class: "coin-packs" });
  cfg.packages.filter((p) => p && p.checkoutUrl).forEach((p) => {
    grid.append(el("button", { class: "panel coin-pack", onclick: () => { window.open(p.checkoutUrl, "_blank", "noopener"); toast("결제 페이지를 새 탭에서 열었어요. 결제 후 받은 키를 입력해 충전하세요."); } }, [
      p.badge ? el("span", { class: "pack-badge", text: p.badge }) : null,
      el("span", { class: "pack-coins" }, [coinMark(), el("span", { text: String(p.coins) })]),
      el("span", { class: "pack-price", text: p.priceLabel || "" }),
    ].filter(Boolean)));
  });
  return grid;
}

/* 결제=자동충전 안내 카드 (수동 키 입력 창은 제거) */
function topupInfoCard() {
  return el("div", { class: "panel" }, [
    el("div", { style: "display:flex; align-items:center; gap:10px;" }, [
      coinMark(),
      el("div", { style: "flex:1;" }, [
        el("p", { style: "font-weight:700;", text: "결제하면 코인이 자동 충전돼요" }),
        el("p", { class: "muted tiny", style: "margin-top:4px;", text: "충전 패키지를 결제하면 완료 후 자동으로 코인이 쌓여요. 따로 키를 입력할 필요가 없어요." }),
      ]),
    ]),
  ]);
}

function redeemBox(bare) {
  const input = el("input", { class: "input", type: "text", placeholder: "결제 후 받은 충전 키", autocomplete: "off", spellcheck: "false" });
  const msg = el("p", { class: "field-error", "aria-live": "polite", style: "margin-top:6px;" });
  const btn = el("button", { class: "btn btn-ghost btn-block", style: "margin-top:10px;" }, [el("span", { text: "충전 키로 코인 받기" })]);
  btn.addEventListener("click", async () => {
    msg.style.color = ""; msg.textContent = "";
    btn.disabled = true; clear(btn); btn.append(el("span", { text: "확인 중…" }));
    const res = await redeemLicense(input.value);
    if (res.ok) {
      toast(`코인 ${res.added}개 충전 완료`);
      refreshBalance(); input.value = "";
      btn.disabled = false; clear(btn); btn.append(el("span", { text: "충전 키로 코인 받기" }));
    } else {
      msg.style.color = "var(--c-danger)"; msg.textContent = res.message;
      btn.disabled = false; clear(btn); btn.append(el("span", { text: "충전 키로 코인 받기" }));
    }
  });
  return el("div", { class: "panel" }, [
    el("p", { style: "font-weight:700; margin-bottom:8px;", text: "이미 결제하셨나요?" }),
    el("p", { class: "muted tiny", style: "margin-bottom:8px;", text: "결제 후 이메일로 받은 키를 입력하면 코인이 충전돼요." }),
    input, btn, msg,
  ]);
}

function codeBox() {
  const wrap = el("div", { class: "panel" });
  function render() {
    clear(wrap);
    if (isAdmin()) {
      wrap.append(
        el("p", { style: "font-weight:700; color:var(--c-gold-soft);", text: "관리자 모드 · 무제한 이용 중" }),
        el("p", { class: "muted tiny", style: "margin:6px 0 10px;", text: "모든 해석이 코인 없이 열려요. (내 코인 ∞)" }),
        el("div", { class: "btn-row" }, [
          el("button", { class: "btn btn-primary btn-sm", onclick: () => { location.hash = "/admin-users"; } }, [el("span", { text: "👥 회원 정보 보기" })]),
          el("button", { class: "btn btn-quiet btn-sm", onclick: () => { setAdmin(false); toast("관리자 모드를 껐어요."); render(); } }, [el("span", { text: "관리자 모드 끄기" })]),
        ]),
      );
      return;
    }
    if (isFamily()) {
      wrap.append(
        el("p", { style: "font-weight:700; color:var(--c-gold-soft);", text: "엄마 모드 · 무제한 이용 중 💗" }),
        el("p", { class: "muted tiny", style: "margin:6px 0 10px;", text: "모든 해석을 코인 없이 볼 수 있어요. (내 코인 ∞)" }),
        el("button", { class: "btn btn-quiet btn-sm", onclick: () => { setFamily(false); toast("엄마 모드를 껐어요."); render(); } }, [el("span", { text: "엄마 모드 끄기" })]),
      );
      return;
    }
    const input = el("input", { class: "input", type: "text", placeholder: "쿠폰 또는 코드 입력 (대·소문자 상관없음)", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false" });
    const msg = el("p", { class: "field-error", "aria-live": "polite", style: "margin-top:6px;" });
    const btn = el("button", { class: "btn btn-ghost btn-block", style: "margin-top:10px;" }, [el("span", { text: "코드 적용" })]);
    btn.addEventListener("click", () => {
      const res = redeemCode(input.value);
      if (res.ok && res.kind === "daypass-choose") {
        const m = _openModal([
          el("p", { class: "muted", style: "margin-bottom:10px;", text: "오늘 하루 무엇을 무제한으로 볼까요? 하나를 골라 주세요. (이 코드는 한 사람당 3번까지)" }),
          el("div", { class: "dp-opts" }, res.options.map((o) => el("button", { class: "dp-opt", type: "button", onclick: () => {
            const r2 = applyDayPass(res.id, o.id); m.close();
            if (r2.ok) { showPopup(r2.popup, r2.popupSub, r2.emoji); refreshBalance(); input.value = ""; render(); }
            else { msg.style.color = "var(--c-danger)"; msg.textContent = r2.message; }
          } }, [el("b", { text: o.name }), el("span", { class: "tiny muted", text: o.desc })]))),
        ], { title: `${res.emoji} ${res.name}` });
        return;
      }
      if (res.ok) {
        if (res.popup) showPopup(res.popup, res.popupSub || `코인 +${res.coins} 🎁`, res.emoji || "☀️");
        else toast(res.message);
        if (res.kind === "coupon" || res.kind === "daypass") refreshBalance();
        input.value = ""; render();
      } else { msg.style.color = "var(--c-danger)"; msg.textContent = res.message; }
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") btn.click(); });
    wrap.append(
      el("p", { style: "font-weight:700; margin-bottom:4px;", text: "쿠폰 · 코드" }),
      el("p", { class: "muted tiny", style: "margin-bottom:8px;", text: "이벤트 쿠폰이나 관리자 코드를 입력하세요. 하루 무제한 코드는 코드마다 한 사람당 3번까지 쓸 수 있어요." }),
      input, btn, msg,
    );
    if (isDayPass()) wrap.append(el("p", { class: "tiny", style: "margin-top:8px; color:#c6f0d8; font-weight:800;", text: `🌈 오늘 하루 ${dayPassScopeName()} 무제한 이용 중 · 자정까지 열려요` }));
    const usedDP = dayPassStatus().filter((c) => c.used > 0);
    if (usedDP.length) wrap.append(el("p", { class: "tiny muted", style: "margin-top:6px;", text: "하루 무제한 코드 남은 횟수 · " + usedDP.map((c) => `${c.emoji} ${c.name} ${c.left}/${DAYPASS_MAX}`).join(" · ") }));
    const d = new Date(); const nm = d.getMonth() === 11 ? 1 : d.getMonth() + 2;
    monthlyCodes().forEach((id) => {
      const mc = MONTHLY_CODES.find((m) => m.id === id); if (!mc) return;
      wrap.append(el("p", { class: "tiny", style: "margin-top:8px; color:var(--c-gold-soft); font-weight:700;", text: `${mc.emoji} ${mc.name} 등록됨 · 다음 코인 ${mc.coins}개는 ${nm}월 1일에 들어와요` }));
    });
  }
  render();
  return wrap;
}

function bullet(text) {
  return el("p", { style: "display:flex; gap:8px; align-items:flex-start; font-size:var(--fs-sm);" }, [
    el("span", { style: "color:var(--c-gold);", text: "•" }), el("span", { class: "muted", text }),
  ]);
}

/* 코인 마크 — 이모지 대신 CSS 골드 디스크 */
function coinMark(size) {
  return el("span", { class: "coin-mark" + (size === "lg" ? " lg" : size === "sm" ? " sm" : ""), "aria-hidden": "true" });
}

/* 특별 쿠폰 팝업 */
function showPopup(title, sub, emoji = "☀️") {
  const ov = el("div", { class: "popup-ov", onclick: (e) => { if (e.target === ov) ov.remove(); } }, [
    el("div", { class: "popup-card" }, [
      el("div", { class: "popup-sun", "aria-hidden": "true", text: emoji }),
      el("p", { class: "serif", style: "font-size:1.35rem; font-weight:700; line-height:1.4;", text: title }),
      sub ? el("p", { style: "margin-top:8px; font-weight:800; color:var(--c-gold-soft);", text: sub }) : null,
      el("button", { class: "btn btn-primary btn-block", style: "margin-top: var(--sp-4);", onclick: () => ov.remove() }, [el("span", { text: "고마워, 해묘 🐈" })]),
    ].filter(Boolean)),
  ]);
  document.body.appendChild(ov);
}

/* =========================================================
   관리자 — 회원 정보 보기 (HAE) · #/admin-users
   Firestore 규칙에서 관리자 이메일로 로그인한 경우만 읽을 수 있음
   ========================================================= */
export function renderAdminUsers({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/store", "코인 · 코드")]));
  root.append(pageHeader("ADMIN", "회원 정보 보기", "가입한 회원의 내 정보·내 사람·코인·저장한 풀이를 볼 수 있어요. 관리자만 보이는 화면이에요."));
  const host = el("section", { class: "wrap section-gap" });
  root.append(host);
  if (!isAdmin()) { host.append(noticeBox("info", "관리자 코드를 먼저 입력해 주세요.")); return root; }
  root.insertBefore(siteAddrCard(), host);
  const glHost = el("div", {});
  const paintGl = () => { clear(glHost); glHost.append(giftLogCard()); };
  paintGl(); window.addEventListener("hae-giftlog", paintGl);
  root.insertBefore(glHost, host);
  host.append(el("p", { class: "muted", text: "불러오는 중…" }));
  const fmt = (t) => (t ? new Date(t).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "-");
  const birthTxt = (b) => (b && b.birthDate ? `${b.birthDate}${b.calendarType === "lunar" ? "(음력)" : ""} ${b.timeUnknown ? "시간 모름" : b.birthTime || ""} · ${b.gender === "male" ? "남" : b.gender === "female" ? "여" : ""}` : "미입력");
  adminListUsers().then((r) => {
    clear(host);
    if (r.error) { host.append(noticeBox("info", r.error)); return; }
    const list = r.users.sort((a, b) => b.updatedAt - a.updatedAt);
    let q = "";
    const listHost = el("div", { class: "adm-list" });
    const search = el("input", { class: "input", type: "search", placeholder: "이름·이메일로 찾기", oninput: () => { q = search.value.trim().toLowerCase(); paint(); } });
    const paint = () => {
      clear(listHost);
      const shown = list.filter((u) => !q || (u.name + " " + u.email).toLowerCase().includes(q));
      if (!shown.length) { listHost.append(el("p", { class: "muted", text: "회원이 없어요." })); return; }
      shown.forEach((u) => {
        const st = u.state || {}, me = st["str.mybirth.v1"], ppl = st["str.people.v1"] || [], w = st["str.wallet.v1"] || {};
        const detail = el("div", { class: "adm-detail" });
        const card = el("details", { class: "panel adm-u" }, [
          el("summary", {}, [
            el("span", { class: "au-av au-av0 adm-av", text: (u.name || u.email || "?").slice(0, 1) }),
            el("div", { class: "adm-s" }, [el("b", { text: u.name || "(이름 없음)" }), el("small", { text: u.email || u.uid })]),
            el("span", { class: "adm-c", text: `🪙 ${w.coins ?? "-"}` }),
          ]),
          detail,
        ]);
        card.addEventListener("toggle", async () => {
          if (!card.open || detail.dataset.done) return;
          detail.dataset.done = "1";
          const res = await adminUserResults(u.uid);
          detail.append(
            el("div", { class: "adm-row" }, [el("span", { text: "최근 저장" }), el("b", { text: fmt(u.updatedAt) })]),
            el("div", { class: "adm-row" }, [el("span", { text: "내 정보" }), el("b", { text: `${(me && me.name) || ""} ${birthTxt(me)}` })]),
            el("div", { class: "adm-row" }, [el("span", { text: "코인 · 열어 본 풀이" }), el("b", { text: `${w.coins ?? 0}개 · ${(w.unlocked || []).length}건 · 쓴 코인 ${w.spent || 0}개` })]),
            openedList(w),
            el("div", { class: "adm-row" }, [el("span", { text: `내 사람 ${ppl.length}명` }), el("b", { text: ppl.map((p) => `${p.name}(${p.input && p.input.birthDate ? p.input.birthDate : "-"})`).join(", ") || "-" })]),
            (() => { const g = getGiftLog().filter((x) => x.uid === u.uid); const sum = g.reduce((a, x) => a + (x.coins || 0), 0);
              return el("div", { class: "adm-row" }, [el("span", { text: "받은 코인 선물" }), el("b", { text: g.length ? `총 ${sum}개 · ${g.length}번 (최근 ${fmt(g[0].t)})` : "아직 없어요" })]); })(),
            el("div", { class: "adm-row" }, [el("span", { text: `저장한 풀이 ${res.length}건` }), el("b", { text: res.slice(0, 8).map((x) => x.title || x.type || x.id).join(" · ") || "-" })]),
            giftBox(u),
            delBox(u, card),
            el("p", { class: "tiny muted", text: `UID ${u.uid}` }),
          );
        });
        listHost.append(card);
      });
    };
    host.append(el("div", { class: "adm-top" }, [el("p", { class: "eyebrow", text: `회원 ${list.length}명` }), search]), listHost);
    paint();
  });
  return root;
}

/* 관리자 — 회원에게 코인 선물 */
function giftBox(u) {
  const amt = el("input", { class: "input", type: "number", min: "1", max: "1000", inputmode: "numeric", placeholder: "코인 개수", "aria-label": "선물할 코인 개수" });
  const memo = el("input", { class: "input", type: "text", maxlength: "60", placeholder: "한마디 (선택) · 예: 가입 축하해요!", "aria-label": "선물 메시지" });
  const quick = el("div", { class: "adm-gq" }, [5, 10, 30, 50].map((n) => el("button", { type: "button", class: "chip", onclick: () => { amt.value = String(n); } }, [el("span", { text: `${n}개` })])));
  let armed = false;
  const label = el("span", { text: "🎁 코인 선물하기" });
  const btn = el("button", { type: "button", class: "btn btn-primary btn-block" }, [label]);
  const done = el("p", { class: "tiny", style: "color:#c6f0d8; font-weight:700;" });
  btn.addEventListener("click", async () => {
    const n = Math.floor(Number(amt.value));
    if (!n || n < 1 || n > 1000) { toast("코인은 1~1000개 사이로 넣어 주세요."); amt.focus(); return; }
    if (!armed) { armed = true; label.textContent = `${u.name || "이 회원"}에게 ${n}개 — 한 번 더 누르면 보내요`; setTimeout(() => { armed = false; label.textContent = "🎁 코인 선물하기"; }, 4000); return; }
    armed = false; btn.disabled = true; label.textContent = "보내는 중…";
    const r = await adminGiftCoins(u.uid, n, memo.value.trim());
    btn.disabled = false; label.textContent = "🎁 코인 선물하기";
    if (r.error) { toast(r.error); return; }
    logGift({ uid: u.uid, name: u.name || "", email: u.email || "", coins: n, memo: memo.value.trim() });
    toast(`${u.name || "회원"}에게 코인 ${n}개를 보냈어요 🎁`);
    window.dispatchEvent(new Event("hae-giftlog"));
    done.textContent = `✓ ${n}개 보냄 · 상대가 다음에 앱을 열면 받아요`; amt.value = ""; memo.value = "";
  });
  return el("div", { class: "adm-gift" }, [
    el("p", { class: "eyebrow", text: "코인 선물" }),
    quick, el("div", { class: "adm-grow" }, [amt, memo]), btn, done,
  ]);
}

function openedList(w) {
  const un = w.unlocked || [];
  const log = (w.openLog || []).slice().sort((a, b) => b.t - a.t);
  const seen = new Set(log.map((x) => x.id));
  const old = un.filter((id) => !seen.has(id)).map((id) => ({ id, t: 0, c: null, via: "coin" }));
  const rows = [...log, ...old];
  if (!rows.length) return el("div", { class: "adm-row" }, [el("span", { text: "열어 본 풀이" }), el("b", { text: "아직 없어요" })]);
  const fmtT = (t) => (t ? new Date(t).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "예전 기록");
  const VIA = { admin: "관리자 무제한", family: "가족 코드", daypass: "하루 무제한 코드", view: "무료" };
  const tag = (r) => (r.via && VIA[r.via]) ? VIA[r.via] : (r.c ? `🪙 ${r.c}` : "코인");
  const name = (r) => (r.via === "view" ? (r.title || r.id.replace(/^view:/, "")) : openLabel(r.id));
  const nCoin = rows.filter((r) => r.c > 0 || (r.c == null && r.via === "coin")).length, nFree = rows.length - nCoin;
  return el("details", { class: "adm-open" }, [
    el("summary", {}, [el("span", { text: `열어 본 풀이 ${rows.length}건 보기 (코인 ${nCoin} · 무료·코드 ${nFree})` })]),
    el("div", { class: "adm-ol" }, rows.map((r) => el("div", { class: "adm-oi" + (r.via && r.via !== "coin" ? " free" : "") }, [
      el("b", { text: name(r) }),
      el("small", { text: `${tag(r)} · ${fmtT(r.t)}` }),
    ]))),
  ]);
}

/* 관리자 — 회원 삭제 (두 번 확인) */
function delBox(u, card) {
  const label = el("span", { text: "회원 삭제" });
  const btn = el("button", { type: "button", class: "adm-del" }, [label]);
  let armed = false, t = null;
  btn.addEventListener("click", async () => {
    if (!armed) {
      armed = true; label.textContent = `${u.name || u.email || "이 회원"}의 정보를 모두 지워요 — 한 번 더 누르면 삭제`; btn.classList.add("armed");
      t = setTimeout(() => { armed = false; label.textContent = "회원 삭제"; btn.classList.remove("armed"); }, 5000);
      return;
    }
    clearTimeout(t); btn.disabled = true; label.textContent = "삭제하는 중…";
    const r = await adminDeleteUser(u.uid, u.email);
    if (r.error) { btn.disabled = false; armed = false; btn.classList.remove("armed"); label.textContent = "회원 삭제"; toast(r.error); return; }
    toast(`${u.name || "회원"}을(를) 삭제했어요.`);
    card.replaceWith(el("div", { class: "panel adm-gone" }, [
      el("b", { text: `🗑 ${u.name || "(이름 없음)"} · ${u.email || u.uid} — 삭제됨` }),
      el("p", { class: "tiny muted", text: "이 계정으로 로그인하면 바로 로그아웃되고 '탈퇴 처리된 계정' 안내가 떠요. 로그인 기록까지 완전히 지우려면 Firebase 콘솔 › Authentication › 사용자에서 이 이메일을 삭제해 주세요." }),
    ]));
  });
  return el("div", { class: "adm-delw" }, [btn]);
}

/* 관리자 — Firebase 콘솔에 넣을 이 사이트 주소 (복사 버튼) */
/* 관리자 — 코인 선물 내역 (누구에게 · 몇 개 · 언제 · 한마디) */
function giftLogCard() {
  const log = getGiftLog();
  const sum = log.reduce((a, x) => a + (x.coins || 0), 0);
  const people = new Set(log.map((x) => x.uid)).size;
  const when = (t) => new Date(t).toLocaleString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return el("section", { class: "wrap", style: "margin-bottom: var(--sp-4);" }, [
    el("details", { class: "panel adm-gl" }, [
      el("summary", {}, [el("span", { class: "adm-gl-ic", text: "🎁" }), el("div", { class: "adm-s" }, [el("b", { text: "코인 선물 내역" }), el("small", { text: log.length ? `${people}명에게 ${log.length}번 · 총 ${sum}개` : "아직 보낸 선물이 없어요" })])]),
      log.length ? el("div", { class: "adm-gl-list" }, log.map((x) => el("div", { class: "adm-gl-row" }, [
        el("div", { class: "adm-gl-who" }, [el("b", { text: x.name || "(이름 없음)" }), el("small", { text: [x.email, x.memo ? `“${x.memo}”` : ""].filter(Boolean).join(" · ") })]),
        el("div", { class: "adm-gl-amt" }, [el("b", { text: `🪙 ${x.coins}` }), el("small", { text: when(x.t) })]),
      ]))) : el("p", { class: "tiny muted", style: "margin-top:10px;", text: "회원 카드를 열어 ‘코인 선물하기’로 보내면 여기에 쌓여요. (이 기능이 생긴 뒤 보낸 것부터 기록돼요)" }),
    ]),
  ]);
}
function siteAddrCard() {
  const url = location.origin + location.pathname, host = location.hostname;
  const row = (label, val, hint) => el("div", { class: "adm-addr" }, [
    el("small", { text: label }),
    el("div", { class: "adm-addr-v" }, [el("code", { text: val }), el("button", { type: "button", class: "chip", onclick: async () => { try { await navigator.clipboard.writeText(val); toast("복사했어요"); } catch { toast("길게 눌러 직접 복사해 주세요"); } } }, [el("span", { text: "복사" })])]),
    el("p", { class: "tiny muted", text: hint }),
  ]);
  return el("section", { class: "wrap", style: "margin-bottom: var(--sp-4);" }, [el("div", { class: "panel adm-site" }, [
    el("p", { class: "eyebrow", text: "Firebase 콘솔에 넣을 이 사이트 주소" }),
    row("① 작업 URL 맞춤설정 (비밀번호 재설정 메일 링크)", url, "Authentication › 템플릿 › 비밀번호 재설정 › 연필 › '작업 URL 맞춤설정'에 붙여 넣고 저장"),
    row("② 승인된 도메인 (Google 로그인)", host, "Authentication › 설정 › 승인된 도메인 › 도메인 추가에 붙여 넣기 (이미 있으면 그대로)"),
  ])]);
}
