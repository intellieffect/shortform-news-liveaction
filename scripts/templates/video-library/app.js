(() => {
  const { videos, prompt, generatedAt, icons, localTools, referenceLibrary } =
    JSON.parse(document.getElementById("library-data").textContent);
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const icon = (name) => icons[name] || "";
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
  const duration = (seconds) => {
    if (seconds == null) return "미등록";
    const n = Math.round(seconds);
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  };
  const day = (date) => (date ? date.replaceAll("-", ".") : "날짜 미등록");
  const normalize = (s) =>
    s.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  const articleIdFromHaniUrl = (value) => {
    try {
      const url = new URL(value);
      if (!["hani.co.kr", "www.hani.co.kr"].includes(url.hostname)) return "";
      return url.pathname.match(/\/(\d+)(?:\.html)?\/?$/)?.[1] ?? "";
    } catch {
      return "";
    }
  };
  const downloadUrl = (src) =>
    /^https?:$/.test(location.protocol) ? src + "?download=1" : src;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(generatedAt));
  let period = { from: "", to: "" },
    visible = [],
    selectedId = null,
    opener = null;
  $("total").textContent = videos.length;
  $("total").setAttribute("aria-label", `${videos.length}편`);
  $("updated").textContent = `${day(today)} 업데이트`;
  function render() {
    closeDownloads();
    const query = normalize($("query").value);
    const articleIdQuery = articleIdFromHaniUrl($("query").value);
    const searchQueries = [query, articleIdQuery].filter(Boolean);
    visible = videos.filter((v) => {
      const searchText = normalize(
        v.searchText ??
          `${v.title} ${v.articleTitle} ${v.author} ${v.articleUrl ?? ""}`,
      );
      return (
        (searchQueries.length === 0 ||
          searchQueries.some((value) => searchText.includes(value))) &&
        (!period.from || (v.completed && v.completed >= period.from)) &&
        (!period.to || (v.completed && v.completed <= period.to))
      );
    });
    visible.sort((a, b) => {
      if ($("sort").value === "title")
        return a.title.localeCompare(b.title, "ko");
      if (!a.completed || !b.completed)
        return a.completed
          ? -1
          : b.completed
            ? 1
            : a.title.localeCompare(b.title, "ko");
      return (
        ($("sort").value === "oldest" ? 1 : -1) *
          a.completed.localeCompare(b.completed) ||
        a.title.localeCompare(b.title, "ko")
      );
    });
    const filtered = Boolean(query || period.from || period.to);
    $("results").textContent = filtered
      ? `검색 결과 ${visible.length}편 · 전체 ${videos.length}편`
      : `전체 ${videos.length}편`;
    $("active-period").hidden = !(period.from || period.to);
    $("period-text").textContent =
      `${period.from ? day(period.from) : "시작일 전체"} — ${period.to ? day(period.to) : "종료일 전체"}`;
    $("date-toggle").classList.toggle(
      "is-active",
      Boolean(period.from || period.to),
    );
    $("date-label").textContent =
      period.from || period.to ? "기간 선택됨" : "제작일";
    const groups = new Map();
    for (const v of visible) {
      const key = $("sort").value === "title" ? "제목순" : day(v.completed);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(v);
    }
    $("list").innerHTML = [...groups]
      .map(
        ([label, items], index) =>
          `<section class="date-group" aria-labelledby="group-${index}"><h2 class="group-date" id="group-${index}">${esc(label)}</h2>${items
            .map(
              (
                v,
              ) => `<article class="video-row${v.id === selectedId ? " is-selected" : ""}" data-id="${esc(v.id)}">
      <button class="thumb" data-play="${esc(v.id)}" aria-label="${esc(v.title)} 재생">${v.poster ? `<img src="${esc(v.poster)}" alt="" loading="lazy">` : `<video class="thumb-preview" src="${esc(v.src)}#t=0.1" muted playsinline preload="metadata" aria-hidden="true"></video>`}<span class="thumb-play">${icon("play-fill")}</span>${v.seconds != null ? `<span class="duration">${duration(v.seconds)}</span>` : ""}</button>
      <div class="video-copy"><h3><button class="video-title" data-play="${esc(v.id)}">${esc(v.title)}</button></h3><div class="article-line"><span class="article-link"><span class="article-label">편</span><span>${esc(v.episodeTitle ?? v.title)}</span></span>${v.articleUrl ? `<a class="article-link" href="${esc(v.articleUrl)}" target="_blank" rel="noopener noreferrer"><span class="article-label">원문</span><span>한겨레 기사 열기</span>${icon("arrow-square-out")}</a>` : ""}</div><p class="article-byline">${esc([v.author && `${v.author} 기자`, v.articleDate && `기사 발행 ${day(v.articleDate)}`].filter(Boolean).join(" · ") || "원문 정보 미등록")}</p></div>
      <p class="completed"><span class="mobile-label">제작 완료 </span>${v.completed ? `<time datetime="${esc(v.completed)}">${day(v.completed)}</time>` : "날짜 미등록"}</p>
      <div class="actions"><button class="icon-button play-action" data-play="${esc(v.id)}" aria-label="${esc(v.title)} 재생" title="영상 재생">${icon("play-fill")}</button><button class="icon-button download-action" data-download="${esc(v.id)}" aria-expanded="false" aria-controls="download-menu" aria-label="${esc(v.title)} 다운로드 옵션" title="다운로드">${icon("download-simple")}</button></div>
    </article>`,
            )
            .join("")}</section>`,
      )
      .join("");
    $("empty").hidden = Boolean(visible.length);
    $("empty-title").textContent = videos.length
      ? "검색 결과가 없습니다"
      : "아직 완성된 영상이 없습니다";
    $("empty-copy").textContent = videos.length
      ? "검색어를 바꾸거나 제작일 범위를 넓혀보세요."
      : "영상 제작이 완료되면 이곳에서 확인할 수 있습니다.";
    $("empty-reset").hidden = !videos.length;
    $("list")
      .querySelectorAll("img")
      .forEach((img) =>
        img.addEventListener(
          "error",
          () => {
            img.hidden = true;
          },
          { once: true },
        ),
      );
  }
  function dateError(show) {
    $("date-error").hidden = !show;
    ["from", "to"].forEach((id) =>
      $(id).setAttribute("aria-invalid", String(show)),
    );
  }
  function closeDates(restoreFocus = false) {
    $("date-panel").hidden = true;
    $("date-toggle").setAttribute("aria-expanded", "false");
    if (restoreFocus) $("date-toggle").focus();
  }
  function applyDates() {
    const from = $("from").value,
      to = $("to").value;
    if (from && to && from > to) {
      dateError(true);
      $("from").focus();
      return;
    }
    period = { from, to };
    dateError(false);
    closeDates(true);
    render();
  }
  $("date-toggle").addEventListener("click", () => {
    if (!$("date-panel").hidden) {
      closeDates();
      return;
    }
    $("from").value = period.from;
    $("to").value = period.to;
    dateError(false);
    $("date-panel").hidden = false;
    $("date-toggle").setAttribute("aria-expanded", "true");
    $("date-panel").querySelector('[data-period="all"]').focus();
  });
  $("date-close").addEventListener("click", () => closeDates(true));
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".date-control")) closeDates();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("date-panel").hidden) {
      e.preventDefault();
      closeDates(true);
    }
  });
  $("date-panel").addEventListener("submit", (e) => {
    e.preventDefault();
    applyDates();
  });
  $("date-panel").addEventListener("input", () => dateError(false));
  $("date-panel")
    .querySelectorAll("[data-period]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const count = button.dataset.period;
        if (count === "all") {
          $("from").value = "";
          $("to").value = "";
        } else {
          const start = new Date(today + "T12:00:00Z");
          start.setUTCDate(start.getUTCDate() - Number(count) + 1);
          $("from").value = start.toISOString().slice(0, 10);
          $("to").value = today;
        }
        applyDates();
      }),
    );
  const clearPeriod = () => {
    period = { from: "", to: "" };
    $("from").value = "";
    $("to").value = "";
    dateError(false);
    render();
  };
  $("date-reset").addEventListener("click", () => {
    clearPeriod();
    closeDates(true);
  });
  $("active-period").addEventListener("click", () => {
    clearPeriod();
    $("date-toggle").focus();
  });
  $("empty-reset").addEventListener("click", () => {
    clearPeriod();
    $("query").value = "";
    $("sort").value = "newest";
    render();
    $("query").focus();
  });
  $("search-form").addEventListener("submit", (e) => e.preventDefault());
  $("query").addEventListener("input", render);
  $("sort").addEventListener("change", render);
  function openPlayer(id, trigger) {
    const video = visible.find((v) => v.id === id);
    if (!video) return;
    if (trigger) opener = trigger;
    selectedId = id;
    $("list")
      .querySelectorAll(".video-row")
      .forEach((row) =>
        row.classList.toggle("is-selected", row.dataset.id === id),
      );
    const position = visible.findIndex((v) => v.id === id);
    $("player-position").textContent = `${position + 1} / ${visible.length}`;
    $("previous").disabled = position === 0;
    $("next").disabled = position === visible.length - 1;
    $("player-title").textContent = video.title;
    $("player-date").textContent = day(video.completed);
    $("player-duration").textContent = duration(video.seconds);
    $("player-size").textContent = `MP4 · ${video.sizeMB} MB`;
    $("player-article").innerHTML =
      esc(video.articleUrl ? "한겨레 원문 열기" : video.articleTitle) +
      (video.articleUrl ? icon("arrow-square-out") : "");
    if (video.articleUrl) $("player-article").href = video.articleUrl;
    else $("player-article").removeAttribute("href");
    $("player-author").textContent = [
      (video.episodeTitle ?? video.title) &&
        `편 · ${video.episodeTitle ?? video.title}`,
      video.author && `${video.author} 기자`,
      video.articleDate && `기사 발행 ${day(video.articleDate)}`,
    ]
      .filter(Boolean)
      .join(" · ");
    closeDownloads();
    $("player-download").dataset.download = video.id;
    $("file-tools").open = false;
    $("file-tools").hidden = !localTools;
    $("file-status").textContent = "";
    $("location-fallback").hidden = true;
    $("thumbnail-section").innerHTML = video.thumbnails.length
      ? `<div class="thumbnail-heading"><span class="field-label">썸네일 ${video.thumbnails.length}개</span><span>눌러서 크게 보기</span></div><div class="thumbnail-grid">${video.thumbnails.map((t, i) => `<button type="button" data-thumbnail="${i}" aria-label="썸네일 ${esc(t.filename)} 크게 보기"><img src="${esc(t.src)}" alt="" loading="lazy"><span>${esc(t.filename)}</span></button>`).join("")}</div>`
      : '<p class="thumbnail-missing">썸네일 미등록 <span>현재는 영상만 다운로드할 수 있습니다.</span></p>';
    $("play-error").hidden = true;
    pauseReferences();
    $("player").src = video.src;
    if (video.poster) $("player").poster = video.poster;
    else $("player").removeAttribute("poster");
    if (!$("player-dialog").open) $("player-dialog").showModal();
    $("player")
      .play()
      .catch(() => {});
  }
  $("list").addEventListener("click", (e) => {
    const button = e.target.closest("[data-play]");
    if (button) openPlayer(button.dataset.play, button);
  });
  ["previous", "next"].forEach((id) =>
    $(id).addEventListener("click", () => {
      const at =
        visible.findIndex((v) => v.id === selectedId) +
        (id === "next" ? 1 : -1);
      if (visible[at]) openPlayer(visible[at].id);
    }),
  );
  $("close").addEventListener("click", () => $("player-dialog").close());
  $("player-dialog").addEventListener("close", () => {
    $("player").pause();
    $("player").removeAttribute("src");
    $("player").load();
    if (opener?.isConnected) opener.focus();
  });
  $("player-dialog").addEventListener("click", (e) => {
    if (e.target !== $("player-dialog")) return;
    const b = e.target.getBoundingClientRect();
    if (
      e.clientX < b.left ||
      e.clientX > b.right ||
      e.clientY < b.top ||
      e.clientY > b.bottom
    )
      e.target.close();
  });
  $("player").addEventListener("error", () => {
    if ($("player").hasAttribute("src")) $("play-error").hidden = false;
  });
  const menu = $("download-menu");
  let downloadTrigger = null,
    thumbnailTrigger = null;
  const endpoint = (v, action) =>
    `/api/videos/${encodeURIComponent(v.id)}/${action}`;
  function closeDownloads() {
    const panel = $("download-menu");
    if (panel.matches(":popover-open")) panel.hidePopover();
  }
  function openDownloads(video, trigger) {
    if (menu.matches(":popover-open") && downloadTrigger === trigger) {
      closeDownloads();
      return;
    }
    closeDownloads();
    downloadTrigger = trigger;
    const thumbs = video.thumbnails;
    const link = (href, filename, title, note) =>
      `<a href="${esc(href)}" download="${esc(filename)}"><span>${title}</span><small>${note}</small></a>`;
    menu.innerHTML =
      `<p class="download-heading">다운로드</p>` +
      (thumbs.length && localTools
        ? link(
            endpoint(video, "bundle"),
            "",
            "영상 + 썸네일 받기",
            `MP4 + 이미지 ${thumbs.length}개 · ZIP`,
          )
        : `<div class="download-unavailable">영상 + 썸네일 받기<small>${thumbs.length ? "묶음 다운로드는 로컬 서버에서 이용할 수 있습니다." : "썸네일 미등록"}</small></div>`) +
      link(
        downloadUrl(video.src),
        video.filename,
        "영상만 받기",
        `MP4 · ${video.sizeMB} MB`,
      ) +
      (thumbs.length === 1
        ? link(
            downloadUrl(thumbs[0].src),
            thumbs[0].filename,
            "썸네일만 받기",
            `${esc(thumbs[0].filename)} · ${thumbs[0].sizeMB} MB`,
          )
        : thumbs.length && localTools
          ? link(
              endpoint(video, "thumbnails"),
              "",
              "썸네일만 받기",
              `이미지 ${thumbs.length}개 · ZIP`,
            )
          : thumbs.length
            ? thumbs
                .map((t) =>
                  link(
                    downloadUrl(t.src),
                    t.filename,
                    `썸네일 ${esc(t.filename)}`,
                    `${t.sizeMB} MB`,
                  ),
                )
                .join("")
            : '<div class="download-unavailable">썸네일만 받기<small>등록된 이미지가 없습니다.</small></div>');
    (trigger.closest("dialog") || document.body).append(menu);
    menu.showPopover();
    const r = trigger.getBoundingClientRect(),
      width = menu.offsetWidth,
      height = menu.offsetHeight;
    menu.style.left = `${Math.max(12, Math.min(r.right - width, innerWidth - width - 12))}px`;
    menu.style.top = `${Math.max(12, Math.min(r.bottom + 8, innerHeight - height - 12))}px`;
    trigger.setAttribute("aria-expanded", "true");
    menu.querySelector("a")?.focus();
  }
  menu.addEventListener("toggle", (e) => {
    if (e.newState === "closed")
      downloadTrigger?.setAttribute("aria-expanded", "false");
  });
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      closeDownloads();
      downloadTrigger?.focus();
    }
  });
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeDownloads();
      downloadTrigger?.focus();
    }
  });
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-download]");
    if (trigger) {
      const v = videos.find((v) => v.id === trigger.dataset.download);
      if (v) openDownloads(v, trigger);
    }
  });
  window.addEventListener("resize", closeDownloads);
  $("player-dialog").addEventListener("close", closeDownloads);
  $("thumbnail-section").addEventListener("click", (e) => {
    const button = e.target.closest("[data-thumbnail]");
    if (!button) return;
    const v = videos.find((v) => v.id === selectedId),
      t = v?.thumbnails[Number(button.dataset.thumbnail)];
    if (!t) return;
    thumbnailTrigger = button;
    $("player").pause();
    $("thumbnail-title").textContent = `썸네일 · ${t.filename}`;
    $("thumbnail-image").src = t.src;
    $("thumbnail-image").alt = `${v.title} 썸네일 ${t.filename}`;
    $("thumbnail-save").href = downloadUrl(t.src);
    $("thumbnail-save").download = t.filename;
    $("thumbnail-dialog").showModal();
  });
  $("thumbnail-close").addEventListener("click", () =>
    $("thumbnail-dialog").close(),
  );
  $("thumbnail-dialog").addEventListener("close", () =>
    thumbnailTrigger?.focus(),
  );
  async function fileAction(kind) {
    const v = videos.find((v) => v.id === selectedId);
    if (!v) return;
    const button = $(kind === "location" ? "copy-location" : "open-folder");
    button.disabled = true;
    $("file-status").textContent =
      kind === "location" ? "파일 위치 확인 중…" : "폴더를 여는 중…";
    try {
      const response = await fetch(endpoint(v, kind), {
        method: kind === "open-folder" ? "POST" : "GET",
        headers: { "X-Library-Action": "1" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (kind === "location") {
        try {
          await navigator.clipboard.writeText(data.path);
          $("file-status").textContent = "파일 위치를 복사했습니다.";
        } catch {
          $("location-fallback").hidden = false;
          $("file-path").value = data.path;
          $("file-path").focus();
          $("file-path").select();
          $("file-status").textContent = "선택된 파일 위치를 복사해 주세요.";
          return;
        }
      } else $("file-status").textContent = "저장 폴더를 열었습니다.";
      $("file-tools").open = false;
    } catch (error) {
      $("file-status").textContent =
        error.message || "파일 작업을 완료하지 못했습니다.";
    } finally {
      button.disabled = false;
    }
  }
  $("open-folder").addEventListener("click", () => fileAction("open-folder"));
  $("copy-location").addEventListener("click", () => fileAction("location"));
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#file-tools")) $("file-tools").open = false;
  });

  // 제작 프롬프트 탭: docs/PRODUCTION_PROMPT.md 본문을 그대로 싣고, [URL] 자리만 채워 복사한다.
  const promptText = prompt?.text ?? "";
  let referenceRequest = "";
  const filled = (url) => {
    const base = url.trim()
      ? promptText
          .replaceAll("[URL]", url.trim())
          .replaceAll("[기사 URL]", url.trim())
      : promptText;
    return referenceRequest
      ? `${base.trimEnd()}\n\n${referenceRequest}\n`
      : base;
  };
  let promptEdited = false;
  $("prompt-source").textContent = `원본 · ${prompt?.source ?? "미등록"}`;
  $("prompt-note").textContent = prompt?.note ?? "";
  $("prompt-note").hidden = !prompt?.note;
  $("prompt-body").hidden = !promptText;
  $("prompt-empty").hidden = Boolean(promptText);
  $("prompt-error").textContent =
    prompt?.error || "프롬프트 본문이 비어 있습니다.";
  function fillPrompt() {
    if (promptEdited) return;
    $("prompt-text").value = filled($("prompt-url").value);
  }
  let copyReset = null;
  function promptStatus(message) {
    $("prompt-status").textContent = message;
  }
  $("prompt-url").addEventListener("input", () => {
    fillPrompt();
    promptStatus(
      promptEdited && $("prompt-url").value.trim()
        ? "프롬프트를 직접 고쳐서 기사 주소가 자동으로 들어가지 않습니다. 「원래대로」를 누르면 다시 채웁니다."
        : "",
    );
  });
  $("prompt-form").addEventListener("submit", (e) => e.preventDefault());
  $("prompt-text").addEventListener("input", () => {
    promptEdited = $("prompt-text").value !== filled($("prompt-url").value);
  });
  $("prompt-reset").addEventListener("click", () => {
    promptEdited = false;
    referenceRequest = "";
    fillPrompt();
    promptStatus("원본 프롬프트로 되돌렸습니다.");
    $("prompt-text").focus();
    $("prompt-text").scrollTop = 0;
  });
  $("prompt-copy").addEventListener("click", async () => {
    const text = $("prompt-text").value;
    let copied = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // file:// 등 클립보드가 막힌 환경에서는 선택 상태로 돌려준다.
      $("prompt-text").focus();
      $("prompt-text").select();
      copied = document.execCommand?.("copy") ?? false;
    }
    promptStatus(
      copied
        ? $("prompt-url").value.trim()
          ? "기사 주소를 넣은 프롬프트를 복사했습니다."
          : "프롬프트를 복사했습니다. 마지막 줄 [URL] 을 기사 주소로 바꿔 주세요."
        : "복사하지 못했습니다. 선택된 프롬프트를 ⌘C 로 복사해 주세요.",
    );
    if (!copied) return;
    $("prompt-copy-text").textContent = "복사됨";
    $("prompt-copy").querySelector("[data-icon]").innerHTML = icon("check");
    clearTimeout(copyReset);
    copyReset = setTimeout(() => {
      $("prompt-copy-text").textContent = "프롬프트 복사";
      $("prompt-copy").querySelector("[data-icon]").innerHTML = icon("copy");
    }, 2000);
  });

  // 표현 레퍼런스 탭: 승인된 세 편을 새 영상 제작의 공통 기준으로 보여준다.
  // 카테고리를 고르는 화면이 아니라, 모든 새 편이 함께 읽는 기준이다.
  const library = referenceLibrary ?? null;
  const cases = Array.isArray(library?.cases) ? library.cases : [];
  const requestText =
    typeof library?.requestText === "string" ? library.requestText.trim() : "";
  const stamp = (seconds) => {
    const n = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  };
  const bullets = (items) =>
    (Array.isArray(items) ? items : [])
      .filter((s) => typeof s === "string" && s.trim())
      .map((s) => `<li>${esc(s)}</li>`)
      .join("");
  // Backend returns registered, project-relative URLs only.
  const resource = (value, label, download = false) => {
    if (typeof value !== "string" || !/^(?:\.\.\/)?references\//.test(value))
      return "";
    return `<a class="reference-link" href="${esc(value)}${download && localTools ? "?download=1" : ""}" ${download ? "download" : 'target="_blank" rel="noopener noreferrer"'}>${esc(label)}${icon(download ? "download-simple" : "arrow-square-out")}</a>`;
  };
  const referenceVideos = () =>
    $("reference-cases").querySelectorAll("video[data-reference-video]");
  const pauseReferences = () =>
    referenceVideos().forEach((video) => video.pause());
  function renderCases() {
    $("reference-cases").innerHTML = cases
      .map((item, index) => {
        const id = String(item.id ?? `case-${index + 1}`);
        const beats = (Array.isArray(item.beats) ? item.beats : []).filter(
          (beat) => beat && Number.isFinite(Number(beat.time)),
        );
        const transfer = bullets(item.transfer);
        const specific = bullets(item.specific);
        const links = [
          resource(item.src, "MP4 다운로드", true),
          resource(item.walkthrough, "장면 관찰 안내"),
          resource(item.sourceGuide, "수정·재렌더 안내"),
          resource(item.credits, "크레딧"),
        ]
          .filter(Boolean)
          .join("");
        const meta =
          [
            item.version && `버전 ${esc(item.version)}`,
            item.seconds != null && duration(item.seconds),
          ]
            .filter(Boolean)
            .join(" · ") || "정보 미등록";
        return `<article class="reference-card" data-case="${esc(id)}">
      <header class="reference-card-head"><h2>${esc(item.title ?? "제목 미등록")}</h2><p class="reference-meta">${meta}</p></header>
      <div class="reference-media">${
        item.src
          ? `<video data-reference-video="${esc(id)}" src="${esc(item.src)}"${item.poster ? ` poster="${esc(item.poster)}"` : ""} controls playsinline preload="metadata" aria-label="${esc(item.title ?? "표현 레퍼런스")} 영상"></video>`
          : `<p class="reference-missing">영상 파일을 찾지 못했습니다.</p>`
      }</div>
      ${item.goal ? `<p class="reference-goal">${esc(item.goal)}</p>` : ""}
      ${
        beats.length
          ? `<details class="reference-beats"><summary><span>관찰 포인트 ${beats.length}개</span>${icon("caret-down")}</summary><ul>${beats
              .map(
                (beat) =>
                  `<li><button type="button" class="beat-seek" data-case="${esc(id)}" data-time="${esc(Number(beat.time))}"${item.src ? "" : " disabled"}><span class="beat-time">${stamp(beat.time)}</span><span>${esc(beat.note ?? "")}</span></button></li>`,
              )
              .join("")}</ul></details>`
          : ""
      }
      ${transfer ? `<div class="reference-block"><span class="field-label">다른 기사에도 적용할 판단</span><ul class="reference-list is-transfer">${transfer}</ul></div>` : ""}
      ${specific ? `<div class="reference-block"><span class="field-label">이 장면의 선택과 범위</span><ul class="reference-list is-specific">${specific}</ul></div>` : ""}
      ${links ? `<div class="reference-links">${links}</div>` : ""}
    </article>`;
      })
      .join("");
  }
  // 재생은 한 번에 하나만. play 이벤트는 버블링하지 않으므로 캡처 단계에서 받는다.
  $("reference-cases").addEventListener(
    "play",
    (e) => {
      referenceVideos().forEach((video) => {
        if (video !== e.target) video.pause();
      });
      if ($("player-dialog").open) $("player-dialog").close();
    },
    true,
  );
  $("reference-cases").addEventListener("click", (e) => {
    const button = e.target.closest(".beat-seek");
    if (!button) return;
    const video = $("reference-cases").querySelector(
      `video[data-reference-video="${CSS.escape(button.dataset.case)}"]`,
    );
    if (!video) return;
    const time = Number(button.dataset.time);
    const seek = () => {
      if (Number.isFinite(time))
        video.currentTime = video.duration
          ? Math.min(time, Math.max(0, video.duration - 0.05))
          : time;
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
    video.play().catch(() => {});
  });
  const referenceStatus = (message) => {
    $("reference-status").textContent = message;
  };
  let referenceCopyReset = null;
  $("reference-copy").addEventListener("click", async () => {
    let copied = true;
    try {
      await navigator.clipboard.writeText($("reference-request-text").value);
    } catch {
      // file:// 등 클립보드가 막힌 환경에서는 선택 상태로 돌려준다.
      $("reference-request-text").focus();
      $("reference-request-text").select();
      copied = document.execCommand?.("copy") ?? false;
    }
    referenceStatus(
      copied
        ? "공통 요청을 복사했습니다."
        : "복사하지 못했습니다. 선택된 요청문을 ⌘C 로 복사해 주세요.",
    );
    if (!copied) return;
    $("reference-copy-text").textContent = "복사됨";
    $("reference-copy").querySelector("[data-icon]").innerHTML = icon("check");
    clearTimeout(referenceCopyReset);
    referenceCopyReset = setTimeout(() => {
      $("reference-copy-text").textContent = "공통 요청 복사";
      $("reference-copy").querySelector("[data-icon]").innerHTML = icon("copy");
    }, 2000);
  });
  // 프롬프트 탭에서 고친 내용을 지우지 않고 뒤에만 덧붙인다.
  $("reference-append").addEventListener("click", () => {
    if (!promptText) {
      referenceStatus("제작 프롬프트를 불러오지 못해 붙일 수 없습니다.");
      return;
    }
    const current = $("prompt-text").value;
    if (current.includes(requestText)) {
      referenceStatus("이미 제작 프롬프트에 들어 있습니다.");
    } else {
      if (!promptEdited) {
        referenceRequest = requestText;
        fillPrompt();
      } else {
        $("prompt-text").value =
          `${current.replace(/\s+$/, "")}\n\n${requestText}\n`;
      }
      promptStatus(
        "표현 레퍼런스 공통 요청을 프롬프트 끝에 붙였습니다. 「원래대로」를 누르면 원본으로 돌아갑니다.",
      );
      referenceStatus("제작 프롬프트에 붙였습니다.");
    }
    location.hash = "#prompt";
    showView("prompt");
    $("prompt-text").focus();
    $("prompt-text").scrollTop = $("prompt-text").scrollHeight;
  });
  function initReferences() {
    $("tab-references").hidden = !library;
    if (!library) return;
    if (library.title) $("reference-title").textContent = library.title;
    $("reference-version").textContent = library.version
      ? `기준 ${library.version}`
      : "";
    const warnings = bullets(library.warnings);
    const ready = library.status === "ready" && cases.length > 0;
    $("reference-body").hidden = !ready;
    $("reference-empty").hidden = ready;
    if (!ready) {
      const invalid = library.status === "invalid";
      $("reference-empty-title").textContent = invalid
        ? "표현 레퍼런스 구성이 올바르지 않습니다"
        : "표현 레퍼런스가 아직 없습니다";
      $("reference-empty-copy").textContent = invalid
        ? "아래 항목을 해결한 뒤 목록을 다시 만들어 주세요."
        : "승인된 레퍼런스가 등록되면 이곳에서 볼 수 있습니다.";
      $("reference-empty-warnings").innerHTML = warnings;
      $("reference-empty-warnings").hidden = !warnings;
      return;
    }
    $("reference-purpose").textContent = library.purpose ?? "";
    $("reference-purpose").hidden = !library.purpose;
    const criteria = bullets(library.criteria);
    $("reference-criteria").innerHTML = criteria;
    $("reference-criteria-block").hidden = !criteria;
    $("reference-request").hidden = !requestText;
    $("reference-request-text").value = requestText;
    $("reference-append").disabled = !promptText;
    $("reference-append").title = promptText
      ? ""
      : "제작 프롬프트를 불러오지 못했습니다.";
    $("reference-warnings").innerHTML = warnings;
    $("reference-warnings-block").hidden = !warnings;
    renderCases();
  }

  function showView(name) {
    const view = ["prompt", "references"].includes(name) ? name : "videos";
    $("view-videos").hidden = view !== "videos";
    $("view-prompt").hidden = view !== "prompt";
    $("view-references").hidden = view !== "references";
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      const current = tab.dataset.view === view;
      tab.classList.toggle("is-current", current);
      if (current) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    document.title = `${{ prompt: "제작 프롬프트", references: "표현 레퍼런스" }[view] ?? "제작 영상"} · 한겨레`;
    if (view !== "references") pauseReferences();
    if (view !== "videos") {
      closeDownloads();
      closeDates();
      if ($("player-dialog").open) $("player-dialog").close();
    }
  }
  const viewFromHash = () =>
    location.hash === "#prompt"
      ? "prompt"
      : location.hash === "#references" && library
        ? "references"
        : "videos";
  window.addEventListener("hashchange", () => showView(viewFromHash()));
  initReferences();
  showView(viewFromHash());
  fillPrompt();
  render();
})();
