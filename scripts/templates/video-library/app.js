(() => {
  const { videos, prompt, generatedAt, icons, localTools } = JSON.parse(
    document.getElementById("library-data").textContent,
  );
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
  const filled = (url) =>
    url.trim() ? promptText.replaceAll("[URL]", url.trim()) : promptText;
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

  function showView(name) {
    const view = name === "prompt" ? "prompt" : "videos";
    $("view-videos").hidden = view !== "videos";
    $("view-prompt").hidden = view !== "prompt";
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      const current = tab.dataset.view === view;
      tab.classList.toggle("is-current", current);
      if (current) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    document.title =
      view === "prompt" ? "제작 프롬프트 · 한겨레" : "제작 영상 · 한겨레";
    if (view === "prompt") {
      closeDownloads();
      closeDates();
      if ($("player-dialog").open) $("player-dialog").close();
    }
  }
  const viewFromHash = () =>
    location.hash === "#prompt" ? "prompt" : "videos";
  window.addEventListener("hashchange", () => showView(viewFromHash()));
  showView(viewFromHash());
  fillPrompt();
  render();
})();
