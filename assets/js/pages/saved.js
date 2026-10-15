import { el, clear, toast, icon } from "../utils/dom.js";
import { getResults, deleteResult, clearAllResults, getResult } from "../state.js";
import { pageHeader, backLink, formatDate, TYPE_META } from "./shared.js";
import { buildSajuReportNode } from "./sajuResult.js";
import { buildTarotReadingNode } from "./tarotResult.js";
import { buildCompatNode } from "./compatResult.js";
import { buildZiweiNode } from "./ziweiResult.js";
import { loadTarotData } from "../tarot/cardArt.js";
import { keptPanel } from "./profile.js";
export function renderSaved({ navigate }) {
  const root = el("div", {});
  root.append(el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/", "홈")]));
  root.append(pageHeader("보관함", "📌 보관함",
    "보관한 풀이와 저장한 결과를 한곳에 모았어요. 로그인하면 계정에 남아서 다른 기기에서도 볼 수 있어요."));

  const keptHost = el("div", {});
  const drawKept = () => { clear(keptHost); const k = keptPanel(navigate, drawKept); if (k) keptHost.append(k); };
  drawKept();
  root.append(keptHost);
  const list = el("div", { class: "wrap section-gap" });
  root.append(list);
  refresh();

  function refresh() {
    const results = getResults().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    clear(list);
    if (!results.length) {
      list.append(el("div", { class: "panel center", style: "padding: var(--sp-7) var(--sp-5);" }, [
        el("p", { class: "muted", text: "아직 저장된 결과가 없어요." }),
        el("div", { class: "btn-row", style: "justify-content:center; margin-top: var(--sp-4);" }, [
          el("button", { class: "btn btn-primary", onclick: () => navigate("/saju") }, [icon("saju"), el("span", { text: "사주 분석" })]),
          el("button", { class: "btn btn-ghost", onclick: () => navigate("/tarot") }, [icon("cards"), el("span", { text: "타로 뽑기" })]),
        ]),
      ]));
      return;
    }

    results.forEach((r) => list.append(savedItem(r)));

    list.append(el("div", { style: "margin-top: var(--sp-4);" }, [
      el("button", { class: "btn btn-quiet btn-sm", onclick: onClearAll }, [icon("trash"), el("span", { text: "전체 삭제" })]),
    ]));
  }

  function savedItem(r) {
    const meta = TYPE_META[r.type] || TYPE_META.saju;
    const open = () => navigate("/result/" + r.id);
    const del = el("button", { class: "btn btn-ghost btn-sm", "aria-label": "이 결과 삭제" }, [icon("trash")]);
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      if (r._confirm) { deleteResult(r.id); toast("삭제했어요."); refresh(); }
      else { r._confirm = true; clear(del); del.append(icon("trash"), el("span", { text: "삭제 확인" })); del.classList.add("notice-warn");
        setTimeout(() => { r._confirm = false; clear(del); del.append(icon("trash")); del.classList.remove("notice-warn"); }, 2600); }
    });

    return el("div", { class: "panel", style: "display:flex; gap:14px; align-items:center;" }, [
      el("span", { style: "color:var(--c-gold); display:inline-flex;" }, [icon(meta.icon)]),
      el("button", {
        style: "flex:1; min-width:0; text-align:left; background:none; border:0; cursor:pointer; color:inherit;",
        onclick: open, "aria-label": `${r.title} 열기`,
      }, [
        el("p", { style: "font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", text: r.title }),
        el("p", { class: "muted tiny", text: `${meta.label} · ${formatDate(r.createdAt)}` }),
      ]),
      del,
    ]);
  }

  function onClearAll(e) {
    const btn = e.currentTarget;
    if (btn._confirm) { clearAllResults(); toast("모든 결과를 삭제했어요."); refresh(); }
    else { btn._confirm = true; clear(btn); btn.append(icon("trash"), el("span", { text: "정말 전체 삭제할까요? 다시 누르기" }));
      setTimeout(() => { if (btn.isConnected) { btn._confirm = false; clear(btn); btn.append(icon("trash"), el("span", { text: "전체 삭제" })); } }, 3000); }
  }

  return root;
}

/* ===== (합침) resultView.js ===== */
/* 저장된 결과 열기 — 타입에 따라 사주/타로 렌더로 분기 */

export function renderResultById({ navigate, id }) {
  const r = getResult(id);
  if (!r) {
    return el("div", {}, [
      el("div", { class: "wrap", style: "margin-bottom: var(--sp-3);" }, [backLink(navigate, "/saved", "보관함")]),
      pageHeader("", "결과를 찾을 수 없어요", "이미 삭제되었거나 다른 기기에서 저장된 결과일 수 있습니다."),
    ]);
  }

  if (r.type === "saju") {
    return buildSajuReportNode(
      { input: r.input, profile: r.profile, report: r.report },
      { navigate, saved: true, savedId: r.id }
    );
  }

  if (r.type === "compat") {
    return buildCompatNode(
      { result: r.result, nameA: r.nameA, nameB: r.nameB, pa: r.pa, pb: r.pb, genderA: r.genderA, genderB: r.genderB },
      { navigate, saved: true, savedId: r.id }
    );
  }

  if (r.type === "ziwei") {
    return buildZiweiNode(
      { z: r.z, input: r.input },
      { navigate, saved: true, savedId: r.id }
    );
  }

  // tarot — 저장된 reading 사용. 카드 아트 렌더에 필요한 데이터가 self-contained.
  const root = el("div", {});
  root.append(el("div", { class: "wrap" }, [el("h1", { class: "sr-only", text: "타로 리딩" })]));
  loadTarotData().then(() => {
    root.replaceChildren(buildTarotReadingNode(r.reading, { navigate, saved: true, savedId: r.id }));
  });
  return root;
}
