import { el, icon, clear, toast } from "../utils/dom.js";
import { pageHeader, backLink, noticeBox, loadDisclaimer, formatDate } from "./shared.js";
import { grantOnce, isAdmin } from "../wallet.js";
import { getReviews, hasWrittenReview, submitReview, deleteReview } from "../state.js";
export function renderAbout({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("ABOUT", "이용 안내 · 도움말", "사용 방법, 자주 묻는 질문, 결과를 읽는 법과 면책 안내예요."));

  const body = el("div", { class: "wrap section-gap" });
  root.append(body);

  body.append(
    card("이 서비스는 무엇인가요?", [
      "사주와 타로를 통해 당신의 성격·인간관계·연애·결혼·직업·금전 습관을 현실적으로 돌아보는 자기이해형 콘텐츠입니다.",
      "막연한 길흉 판단이 아니라, 반복되는 행동 패턴과 선택 방식을 점검하는 데 초점을 둡니다.",
    ]),
    card("결과를 읽을 때 기억해 주세요", [
      "좋은 말만 반복하지 않습니다. 장점의 부작용과 조심할 지점도 함께 다룹니다.",
      "부정적으로 보이는 해석에는 반드시 현실적인 대응 방법을 함께 제시합니다.",
      "누구에게나 적용되는 일반적인 문장보다, 구체적인 상황과 행동을 이야기하려 합니다.",
    ]),
  );

  // 도움말 — 자주 묻는 질문 (사용성 10원칙: 도움말과 문서화)
  const FAQ = [
    ["코인은 어떻게 쓰이나요?", "풀이를 처음 열 때만 코인이 빠지고, 한 번 연 풀이는 다시 볼 때 무료예요. 오른쪽 위 동그란 숫자가 지금 남은 코인이에요. 코인 5개 이상 쓰는 버튼은 실수 방지를 위해 한 번 더 눌러야 진행돼요."],
    ["코인은 어디서 받나요?", "충전소에서 매일 출석하면 무료 코인을 받고, 후기를 남기거나 쿠폰·코드를 입력해도 받을 수 있어요."],
    ["날짜를 누르면 나오는 하루 운세는?", "만세력 일진 달력에서 날짜를 누르면 그날의 운세가 떠요. 오늘은 무료, 다른 날은 코인 1개예요. 운세 캘린더에서 이미 연 날은 추가 코인 없이 볼 수 있어요."],
    ["다른 사람 기준으로 보고 싶어요", "홈·운세·마이의 ‘누구로 볼까?’ 줄에서 내 사람을 누르면 그 사람 시점으로 모든 운세를 볼 수 있어요. 위쪽 띠의 ‘내 시점으로’를 누르면 돌아와요."],
    ["친구는 어떻게 추가하나요?", "내 사람 › ‘+ 친구 추가’에서 초대 링크(무료) 또는 직접 입력(코인)으로 추가해요. 궁합 등에서 새 사람을 직접 입력하면 코인 10개가 들고, 그 사람은 내 사람에 바로 저장돼요. 이미 저장한 사람을 고르면 무료예요."],
    ["친구를 잘못 지웠어요", "삭제 직후 아래에 뜨는 ‘되돌리기’를 누르면 바로 되살릴 수 있어요. 정보가 틀렸다면 카드의 ‘정보 수정’으로 고치면 돼요."],
    ["태어난 시간을 몰라요", "‘시간 모름’을 체크하면 시주(時柱)를 빼고 봐요. 자시(子時)·축시(丑時)처럼 시진만 알면 시진 버튼을 눌러도 돼요."],
    ["내 정보는 어디에 저장되나요?", "로그인하면 내 정보·내 사람·코인·저장한 풀이가 내 계정(Google Firebase 클라우드)에 저장돼서 다른 기기에서도 이어서 볼 수 있어요. 내 계정 데이터는 나만 읽을 수 있고, 마이 › 회원 탈퇴로 언제든 모두 지울 수 있어요. 로그인 전 정보는 이 브라우저에만 있어요."],
  ];
  body.append(el("div", { class: "panel section-gap" }, [
    el("h3", { text: "자주 묻는 질문" }),
    ...FAQ.map(([q, a]) => el("details", { class: "faq-item" }, [el("summary", { text: q }), el("p", { class: "muted", style: "font-size:var(--fs-sm); margin-top:6px;", text: a })])),
  ]));

  loadDisclaimer().then((d) => {
    body.append(
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "면책 안내" }),
        el("p", { text: d.full }),
      ]),
      noticeBox("warn", d.demoNotice),
    );
    body.append(
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "이번 버전에서 제공하지 않는 것" }),
        el("ul", {}, ["코인 충전 결제", "커뮤니티·채팅 상담", "푸시 알림"].map((t) => el("li", { text: t }))),
        el("p", { class: "tiny muted", text: "타로·무료 운세는 로그인 없이, 사주·궁합처럼 내 정보를 저장하는 풀이는 Google·이메일 로그인 후 이용할 수 있어요." }),
      ]),
      el("div", { class: "btn-row", style: "margin-top: var(--sp-4);" }, [
        el("a", { href: "#/privacy", class: "btn btn-ghost btn-sm", text: "개인정보 처리 안내" }),
        el("a", { href: "#/", class: "btn btn-quiet btn-sm", text: "홈으로" }),
      ]),
    );
  });

  return root;
}

function card(title, paras) {
  return el("div", { class: "panel section-gap" }, [
    el("h3", { text: title }),
    ...paras.map((p) => el("p", { class: "muted", text: p })),
  ]);
}

/* ---- 개인정보 (합침) ---- */

export function renderPrivacy({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("PRIVACY", "개인정보 처리 안내", "무엇을, 어디에, 왜 저장하는지 투명하게 안내합니다."));

  const body = el("div", { class: "wrap section-gap" });
  root.append(body);

  loadDisclaimer().then((d) => {
    body.append(
      el("div", { class: "panel section-gap" }, [
        el("div", { style: "display:flex; gap:10px; align-items:center; color:var(--c-gold);" }, [icon("shield"), el("h3", { style: "color:var(--c-text);", text: "핵심 원칙" })]),
        el("ul", { style: "display:grid; gap:10px;" }, d.privacy.map((t) => el("li", { text: t }))),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "어떤 정보를 다루나요?" }),
        kv("생년월일 · 출생 시간", "성향 계산에만 사용해요. 로그인한 경우 기기 간 이어보기를 위해 내 계정(Firebase 클라우드)에 저장되며, 본인만 읽을 수 있어요."),
        kv("이름/닉네임 · 이메일", "닉네임은 결과 표시와 공유 이미지에, 이메일은 로그인에만 사용해요. 닉네임은 실명이 아니어도 돼요."),
        kv("저장한 결과", "이 브라우저와(로그인 시) 내 계정에 보관돼요. 보관함에서 지우거나, 마이 › 회원 탈퇴로 계정과 함께 모두 삭제할 수 있어요."),
        kv("입력 임시값", "편의를 위해 현재 세션에만 임시 저장(sessionStorage)되며, 탭을 닫으면 사라집니다."),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "공유 이미지와 개인정보" }),
        el("p", { class: "muted", text: "공유용 이미지에는 생년월일 전체가 기본적으로 표시되지 않습니다. 예: ‘1994년생 · 출생 시간 미공개 · 닉네임만 표시’ 형태로 노출됩니다." }),
      ]),
      el("div", { class: "panel section-gap" }, [
        el("h3", { text: "데이터 삭제" }),
        el("p", { class: "muted", text: "보관함에서 개별 결과 또는 전체 결과를 즉시 삭제할 수 있어요. 계정까지 지우려면 마이 › 계정 관리 › 회원 탈퇴를 누르면 클라우드에 저장된 내 정보도 모두 삭제돼요." }),
        el("a", { href: "#/saved", class: "btn btn-ghost btn-sm", style: "margin-top: var(--sp-2);", text: "보관함으로 이동" }),
      ]),
    );
  });

  return root;
}

function kv(k, v) {
  return el("div", {}, [
    el("p", { style: "font-weight:600;", text: k }),
    el("p", { class: "muted", style: "font-size:var(--fs-sm);", text: v }),
  ]);
}

/* ---- 404 (합침) ---- */

export function renderNotFound({ navigate }) {
  return el("div", { class: "wrap center", style: "padding-top: var(--sp-7);" }, [
    el("div", { class: "loader-orbit", style: "margin: 0 auto var(--sp-5);" }, [el("span", { class: "loader-dot" })]),
    el("h1", { class: "serif", style: "font-size: var(--fs-hero);", text: "404" }),
    el("p", { class: "muted", style: "margin-top: var(--sp-2);", text: "요청하신 화면을 찾을 수 없어요. 주소가 바뀌었거나 사라진 페이지일 수 있습니다." }),
    el("div", { class: "btn-row", style: "justify-content:center; margin-top: var(--sp-5);" }, [
      el("button", { class: "btn btn-primary", onclick: () => navigate("/") }, [icon("home"), el("span", { text: "홈으로" })]),
    ]),
  ]);
}

/* ===== (합침) reviews.js ===== */
const REWARD = 10;

export function renderReviews({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("해묘 후기", "후기 남기고 코인 받기", "서비스를 이용한 느낌을 들려주세요. 첫 후기 작성 시 코인 10개를 드려요."));

  const composeHost = el("section", { class: "wrap" });
  const listHost = el("section", { class: "wrap section-gap", style: "margin-top: var(--sp-5);" });
  root.append(composeHost, listHost);

  function paint() {
    clear(composeHost); clear(listHost);
    composeHost.append(reviewForm(paint));
    listHost.append(reviewList(paint));
  }
  paint();
  return root;
}

function reviewForm(repaint) {
  const alreadyWritten = hasWrittenReview();
  const box = el("div", { class: "panel panel-gold" });
  const ratingLabel = el("p", { class: "muted tiny", style: "margin-top:6px;", text: "별점을 선택해 주세요." });
  let rating = 0;
  const stars = Array.from({ length: 5 }, (_, i) => el("button", {
    class: "review-star", type: "button", "aria-label": `${i + 1}점`, "aria-pressed": "false",
    onclick: () => {
      rating = i + 1;
      stars.forEach((star, n) => { star.classList.toggle("on", n < rating); star.setAttribute("aria-pressed", n < rating ? "true" : "false"); });
      ratingLabel.textContent = `${rating}점 · 고마워요!`;
    },
  }, [el("span", { text: "★" })]));
  const nickname = el("input", { class: "input", type: "text", maxlength: "16", placeholder: "닉네임 (선택)", autocomplete: "nickname" });
  const content = el("textarea", { class: "input", maxlength: "500", rows: "5", placeholder: "해묘를 이용해 본 느낌을 20자 이상 남겨 주세요.", "aria-label": "후기 내용" });
  const counter = el("p", { class: "muted tiny", style: "text-align:right; margin-top:5px;", text: "0 / 500" });
  const error = el("p", { class: "field-error", "aria-live": "polite", style: "margin-top:8px;" });
  content.addEventListener("input", () => { counter.textContent = `${content.value.length} / 500`; });
  const submit = el("button", { class: "btn btn-primary btn-block", type: "button", style: "margin-top: var(--sp-3);" }, [
    el("span", { text: alreadyWritten ? "후기 등록하기" : `후기 등록하고 코인 +${REWARD} 받기` }),
  ]);
  submit.addEventListener("click", () => {
    const result = submitReview({ rating, nickname: nickname.value, content: content.value });
    if (!result.ok) { error.textContent = result.message; return; }
    const reward = grantOnce("review:write", REWARD, { kind: "review" });
    toast(reward.ok ? `후기 등록 완료 · 코인 +${REWARD}` : "후기가 등록됐어요. 후기 보상은 이미 받으셨어요.");
    repaint();
  });

  box.append(
    el("div", { style: "display:flex; justify-content:space-between; gap:12px; align-items:flex-start;" }, [
      el("div", {}, [
        el("p", { style: "font-weight:700;", text: "이용 후기를 들려주세요" }),
        el("p", { class: "muted tiny", style: "margin-top:4px;", text: alreadyWritten ? "후기는 더 남길 수 있어요. 보상은 이 프로필(로그인 전에는 이 브라우저) 기준 1회예요." : "첫 후기 등록을 완료하면 코인 10개가 즉시 지급돼요." }),
      ]),
      el("span", { class: "review-reward", text: `+${REWARD} 코인` }),
    ]),
    el("div", { class: "review-stars", role: "group", "aria-label": "별점", style: "margin-top: var(--sp-4);" }, stars),
    ratingLabel,
    el("label", { class: "sr-only", for: "review-nickname", text: "닉네임" }), nickname,
    content, counter, error, submit,
  );
  nickname.id = "review-nickname";
  return box;
}

function reviewList(repaint) {
  const reviews = getReviews();
  const host = el("div", {});
  host.append(
    el("div", { style: "display:flex; justify-content:space-between; align-items:baseline; margin-bottom: var(--sp-3);" }, [
      el("h2", { style: "font-size:1.1rem;", text: "후기 보기" }),
      el("span", { class: "muted tiny", text: `${reviews.length}개` }),
    ]),
    noticeBox("info", "현재 정적 버전에서는 이 기기에 작성된 후기만 보입니다. 모든 이용자의 후기를 함께 보이게 하려면 클라우드 저장 기능을 연결해야 해요."),
  );
  if (!reviews.length) {
    host.append(el("div", { class: "panel", style: "margin-top: var(--sp-3); text-align:center;" }, [
      el("p", { style: "font-weight:700;", text: "아직 작성된 후기가 없어요" }),
      el("p", { class: "muted tiny", style: "margin-top:6px;", text: "첫 번째 후기를 남겨 해묘에게 힘을 주세요." }),
    ]));
    return host;
  }
  host.append(el("div", { class: "review-list", style: "margin-top: var(--sp-3);" }, reviews.map((r) => reviewCard(r, repaint))));
  return host;
}

function reviewCard(review, repaint) {
  // 확인 창(confirm)은 일부 환경(미리보기·앱 안 웹뷰)에서 막혀 있어서, 버튼을 두 번 누르는 방식으로 확인한다
  let adminBar = null;
  if (isAdmin()) {
    const label = el("span", { text: "관리자 · 삭제" });
    const btn = el("button", { class: "btn btn-quiet btn-sm", type: "button" }, [label]);
    let armed = false, timer = null;
    btn.addEventListener("click", () => {
      if (!armed) {
        armed = true; label.textContent = "한 번 더 누르면 삭제"; btn.style.color = "var(--c-danger)";
        timer = setTimeout(() => { armed = false; label.textContent = "관리자 · 삭제"; btn.style.color = ""; }, 4000);
        return;
      }
      clearTimeout(timer);
      deleteReview(review.id); toast("후기를 삭제했어요."); repaint();
    });
    adminBar = el("div", { style: "display:flex; justify-content:flex-end; margin-top:10px;" }, [btn]);
  }
  return el("article", { class: "panel review-card" }, [
    el("div", { style: "display:flex; justify-content:space-between; gap:12px; align-items:baseline;" }, [
      el("p", { style: "font-weight:700;", text: review.nickname }),
      el("span", { class: "muted tiny", text: formatDate(review.createdAt) }),
    ]),
    el("p", { class: "review-rating", "aria-label": `별점 ${review.rating}점`, text: "★".repeat(review.rating) + "☆".repeat(5 - review.rating) }),
    el("p", { style: "white-space:pre-wrap; margin-top:8px; line-height:1.65;", text: review.content }),
    adminBar,
  ].filter(Boolean));
}
