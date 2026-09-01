(function () {
  const KEY = "xstation-project-transition";
  const HOP_COOKIE = "xs-hop";
  const LAST_COOKIE = "xs-last";
  const BOOT_COOKIE = "xs-booted";
  const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
  const EASE_MOVE = "cubic-bezier(0.16, 1, 0.3, 1)";
  const ENTER_MS = 920;
  const EXIT_MS = 740;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let didRestoreScroll = false;
  let revealTimer = 0;
  let namedByClick = false;

  function projectIdFromURL(url) {
    try {
      const parsed = new URL(url, window.location.href);
      const match = /\/projects\/([a-z]+)\.html$/i.exec(parsed.pathname);
      if (match) return match[1];
      return parsed.searchParams.get("project");
    } catch (err) {
      return null;
    }
  }

  function isProjectPath(url) {
    try {
      return /\/projects\/[a-z]+\.html$/i.test(new URL(url, window.location.href).pathname);
    } catch (err) {
      return false;
    }
  }

  function isHomePath(url) {
    try {
      const path = new URL(url, window.location.href).pathname;
      return /(?:^|\/)index\.html$/i.test(path) || /\/$/.test(path);
    } catch (err) {
      return false;
    }
  }

  function homeChapter(id) {
    if (!id) return null;
    return document.querySelector('.launch[data-project="' + id + '"]');
  }

  function homeCard(id) {
    if (!id) return null;
    const cards = document.querySelectorAll('.project[data-project="' + id + '"]');
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      if (card.getClientRects().length) return card;
    }
    return cards[0] || homeChapter(id);
  }

  function stageFor(id) {
    const chapter = homeChapter(id);
    return chapter ? chapter.querySelector(".launch-stage") : null;
  }

  function frameFor(id) {
    if (document.body && document.body.dataset.page === "project") {
      return document.querySelector(".detail-hero");
    }
    const stage = stageFor(id);
    if (stage && stage.getClientRects().length) return stage;
    const card = homeCard(id);
    return card ? card.querySelector(".project-frame") : null;
  }

  function clearHeroNames() {
    namedByClick = false;
    document.querySelectorAll(".is-transitioning").forEach(function (node) {
      node.classList.remove("is-transitioning");
    });
    if (document.body) {
      document.body.classList.remove("is-hero-named");
      document.body.classList.remove("is-hero-suppressed");
    }
  }

  function writeCookie(name, value, maxAge) {
    try {
      document.cookie =
        name +
        "=" +
        encodeURIComponent(value) +
        "; Path=/; Max-Age=" +
        maxAge +
        "; SameSite=Lax";
    } catch (err) {
      /* Cookies are optional. */
    }
  }

  function readCookie(name) {
    try {
      const prefix = name + "=";
      const parts = document.cookie.split("; ");
      for (let i = 0; i < parts.length; i += 1) {
        if (parts[i].indexOf(prefix) === 0) {
          return decodeURIComponent(parts[i].slice(prefix.length));
        }
      }
    } catch (err) {
      return null;
    }
    return null;
  }

  function clearCookie(name) {
    writeCookie(name, "", 0);
  }

  function writeHop(kind, id) {
    if (!kind) return;
    writeCookie(HOP_COOKIE, kind + (id ? "." + id : ""), 12);
  }

  function readHop() {
    const raw = readCookie(HOP_COOKIE);
    if (!raw) return null;
    const parts = raw.split(".");
    return { kind: parts[0] || null, id: parts[1] || null };
  }

  function clearHop() {
    clearCookie(HOP_COOKIE);
    document.documentElement.removeAttribute("data-hop");
  }

  function clearReturnMarker() {
    document.documentElement.removeAttribute("data-return-project");
    clearHop();
  }

  function nameHomeSource(id, clickEl) {
    document.querySelectorAll(".is-transitioning").forEach(function (node) {
      node.classList.remove("is-transitioning");
    });
    namedByClick = Boolean(clickEl);
    if (clickEl) {
      const still = clickEl.closest(".launch-still");
      if (still) {
        still.classList.add("is-transitioning");
        return still.querySelector(".project-frame");
      }
    }
    const chapter = homeChapter(id);
    if (chapter) {
      const stage = chapter.querySelector(".launch-stage");
      if (stage) {
        chapter.classList.add("is-transitioning");
        return stage;
      }
    }
    const card = homeCard(id);
    if (!card) return null;
    card.classList.add("is-transitioning");
    return card.querySelector(".project-frame");
  }

  function nameDetailHero() {
    if (!document.body) return null;
    document.body.classList.remove("is-hero-suppressed");
    document.body.classList.add("is-hero-named");
    return document.querySelector(".detail-hero");
  }

  function suppressHeroName() {
    clearHeroNames();
    if (document.body) document.body.classList.add("is-hero-suppressed");
  }

  function armDetailReveal() {
    if (!document.body || document.body.dataset.page !== "project") return;
    document.body.classList.add("is-detail-pending");
    document.body.classList.remove("is-detail-live");
  }

  function revealDetail() {
    if (!document.body) return;
    document.documentElement.removeAttribute("data-hop");
    document.body.classList.remove("is-detail-pending");
    void document.body.offsetWidth;
    document.body.classList.add("is-detail-live");
  }

  function scheduleReveal(delay) {
    if (revealTimer) window.clearTimeout(revealTimer);
    revealTimer = window.setTimeout(function () {
      revealTimer = 0;
      revealDetail();
    }, delay || 0);
  }

  function ensureReveal() {
    if (!document.body || document.body.dataset.page !== "project") return;
    if (document.body.classList.contains("is-detail-live")) return;
    const hop = document.documentElement.getAttribute("data-hop");
    if (hop === "fwd" || hop === "cross" || document.body.classList.contains("is-detail-pending")) {
      if (!revealTimer) scheduleReveal(ENTER_MS + 80);
      return;
    }
    document.body.classList.add("is-detail-live");
  }

  function rememberProject(id) {
    if (!id) return;
    try {
      sessionStorage.setItem("xstation-last-project", id);
    } catch (err) {
      /* Storage is optional. */
    }
    writeCookie(LAST_COOKIE, id, 1800);
    writeCookie(BOOT_COOKIE, "1", 1800);
  }

  (function applyHopEarly() {
    const hop = readHop();
    if (!hop || !hop.kind) return;
    document.documentElement.setAttribute("data-hop", hop.kind);
    if (hop.kind === "back" && hop.id && !document.documentElement.getAttribute("data-return-project")) {
      document.documentElement.setAttribute("data-return-project", hop.id);
      document.documentElement.classList.add("is-returning");
    }
  })();

  function capture(el, id, direction) {
    if (!el || !id) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    try {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({
          id: id,
          direction: direction,
          rect: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          },
          time: Date.now()
        })
      );
    } catch (err) {
      /* Storage is optional. */
    }
  }

  function readCapture() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      sessionStorage.removeItem(KEY);
      const state = JSON.parse(raw);
      if (!state || !state.rect || Date.now() - state.time > 5000) return null;
      return state;
    } catch (err) {
      return null;
    }
  }

  function playFlip(el, fromRect, duration, easing) {
    if (!el || !fromRect || reduced) return null;
    const to = el.getBoundingClientRect();
    if (to.width < 8 || to.height < 8) return null;
    const dx = fromRect.left - to.left;
    const dy = fromRect.top - to.top;
    const sx = fromRect.width / to.width;
    const sy = fromRect.height / to.height;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) {
      return null;
    }

    el.style.transformOrigin = "top left";
    const anim = el.animate(
      [
        {
          transform: "translate(" + dx + "px, " + dy + "px) scale(" + sx + ", " + sy + ")",
          filter: "brightness(1.38) saturate(0.5) contrast(1.1)",
          clipPath: "inset(10% 0 10% 0)"
        },
        {
          transform: "translate(0, 0) scale(1, 1)",
          filter: "brightness(1) saturate(1) contrast(1)",
          clipPath: "inset(0 0 0 0)"
        }
      ],
      {
        duration: duration,
        easing: easing || EASE_MOVE,
        fill: "forwards"
      }
    );

    function cleanup() {
      try {
        anim.commitStyles();
        anim.cancel();
      } catch (err) {
        /* Animation may already be gone. */
      }
      el.style.transform = "";
      el.style.transformOrigin = "";
      el.style.filter = "";
      el.style.clipPath = "";
    }

    anim.finished.then(cleanup).catch(cleanup);
    return anim;
  }

  function restoreReturnScroll(id) {
    if (!id || didRestoreScroll) return;
    const card = homeChapter(id) || homeCard(id);
    if (!card) return;
    didRestoreScroll = true;
    const work = document.getElementById("work");
    if (work) work.classList.add("is-in");
    ["doctrine", "work", "method", "engage", "site-footer"].forEach(function (sectionId) {
      const el = document.getElementById(sectionId);
      if (el) el.classList.add("is-in");
    });
    const nav = document.getElementById("nav");
    const navHeight = nav ? nav.getBoundingClientRect().height : 56;
    const top = card.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo(0, Math.max(0, top));
    window.xstationDidRestoreReturn = true;
  }

  function focusReturnCard(id) {
    const card = homeCard(id);
    if (!card || typeof card.focus !== "function") return;
    try {
      card.focus({ preventScroll: true });
    } catch (err) {
      card.focus();
    }
  }

  function bindPrefetch(link) {
    link.addEventListener(
      "pointerenter",
      function () {
        const href = link.getAttribute("href");
        if (!href || href.charAt(0) === "#") return;
        const existing = document.querySelector('link[rel="prefetch"][href="' + href + '"]');
        if (existing) return;
        const prefetch = document.createElement("link");
        prefetch.rel = "prefetch";
        prefetch.href = href;
        document.head.appendChild(prefetch);
      },
      { once: true }
    );
  }

  function bindOutgoing() {
    document.querySelectorAll("a[href]").forEach(function (link) {
      if (!isProjectPath(link.href)) return;
      bindPrefetch(link);
      link.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        const id = projectIdFromURL(link.href) || link.dataset.project;
        const fromProject = document.body.dataset.page === "project";
        if (!fromProject) rememberProject(id);
        writeHop(fromProject ? "cross" : "fwd", id);
        document.documentElement.removeAttribute("data-return-project");
        const frame = nameHomeSource(id, link);
        if (frame) {
          void frame.offsetWidth;
          capture(frame, id, "forward");
        }
      });
    });

    document.querySelectorAll("[data-project-back]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        const id = document.body.dataset.project;
        rememberProject(id);
        writeHop("back", id);
        const hero = nameDetailHero();
        if (hero && id) {
          void hero.offsetWidth;
          capture(hero, id, "back");
        }
      });
    });

    document.querySelectorAll("a[href]").forEach(function (link) {
      if (link.matches("[data-project-back]") || isProjectPath(link.href)) return;
      link.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        const fromProject = document.body.dataset.page === "project";
        const toProject = isProjectPath(link.href);
        const toHome = isHomePath(link.href);
        if ((!fromProject && toProject) || (fromProject && toHome)) return;
        suppressHeroName();
      });
    });
  }

  function playFallback() {
    if ("onpagereveal" in window) return;
    const state = readCapture();
    if (!state || reduced) return;
    const el = frameFor(state.id);
    if (!el) return;
    const back = state.direction === "back";
    if (!back && document.body.dataset.page === "project") {
      armDetailReveal();
      scheduleReveal((back ? EXIT_MS : ENTER_MS) - 80);
    }
    playFlip(el, state.rect, back ? EXIT_MS : ENTER_MS, back ? EASE_OUT : EASE_MOVE);
  }

  if ("onpageswap" in window) {
    window.addEventListener("pageswap", function (event) {
      if (!event.viewTransition) return;
      const incomingUrl = event.activation && event.activation.entry && event.activation.entry.url;
      const incomingId = incomingUrl ? projectIdFromURL(incomingUrl) : null;
      const incomingIsProject = Boolean(incomingUrl && isProjectPath(incomingUrl));
      const incomingIsHome = Boolean(incomingUrl && isHomePath(incomingUrl));
      const leavingIsProject = document.body.dataset.page === "project";
      const types = event.viewTransition.types;

      if (reduced) {
        suppressHeroName();
        if (types) types.add("cross");
        return;
      }

      if (leavingIsProject && incomingIsHome) {
        if (types) types.add("back");
        writeHop("back", document.body.dataset.project);
        nameDetailHero();
      } else if (!leavingIsProject && incomingIsProject) {
        if (types) types.add("forward");
        writeHop("fwd", incomingId);
        if (!namedByClick && incomingId) nameHomeSource(incomingId);
      } else if (leavingIsProject && incomingIsProject) {
        if (types) types.add("cross");
        writeHop("cross", incomingId);
        suppressHeroName();
      } else {
        if (types) types.add("cross");
        suppressHeroName();
      }
    });
  }

  if ("onpagereveal" in window) {
    window.addEventListener("pagereveal", function (event) {
      const returning = document.documentElement.getAttribute("data-return-project");
      const id = document.body && document.body.dataset.project;
      const isHome = !document.body || document.body.dataset.page !== "project";
      const hop = readHop();
      let lastId = hop && hop.id;
      if (!lastId) {
        try {
          lastId = sessionStorage.getItem("xstation-last-project");
        } catch (err) {
          lastId = null;
        }
      }
      if (!lastId) lastId = readCookie(LAST_COOKIE);
      const fromOtherProject = Boolean(
        !isHome && ((hop && hop.kind === "cross") || (lastId && id && lastId !== id))
      );

      if (isHome && returning) restoreReturnScroll(returning);

      if (!event.viewTransition) {
        const state = readCapture();
        if (state && !reduced) {
          const el = frameFor(state.id);
          if (el) {
            const back = state.direction === "back";
            if (!back && !isHome) {
              armDetailReveal();
              scheduleReveal(ENTER_MS - 60);
            }
            playFlip(el, state.rect, back ? EXIT_MS : ENTER_MS, back ? EASE_OUT : EASE_MOVE);
          }
        }
        window.setTimeout(clearReturnMarker, EXIT_MS + 40);
        return;
      }

      if (event.viewTransition.types) {
        if (returning && isHome) event.viewTransition.types.add("back");
        else if (fromOtherProject) event.viewTransition.types.add("cross");
        else if (!isHome) event.viewTransition.types.add("forward");
        else event.viewTransition.types.add("cross");
      }

      if (reduced) {
        suppressHeroName();
        return;
      }

      if (returning && isHome) {
        nameHomeSource(returning);
      } else if (!isHome) {
        if (!fromOtherProject && id) nameDetailHero();
        else suppressHeroName();
        armDetailReveal();
        scheduleReveal(fromOtherProject ? 160 : 380);
      } else {
        suppressHeroName();
      }

      event.viewTransition.finished.finally(function () {
        clearHeroNames();
        clearReturnMarker();
        if (!isHome) scheduleReveal(20);
        if (returning && isHome) focusReturnCard(returning);
        try {
          sessionStorage.removeItem(KEY);
        } catch (err) {
          /* Storage is optional. */
        }
      });
    });
  }

  window.addEventListener("DOMContentLoaded", function () {
    bindOutgoing();
    if (document.body.dataset.page === "project") {
      rememberProject(document.body.dataset.project);
      ensureReveal();
      const main = document.getElementById("main-content");
      if (main && typeof main.focus === "function") {
        try {
          main.focus({ preventScroll: true });
        } catch (err) {
          /* Focus is optional. */
        }
      }
    } else {
      const id = document.documentElement.getAttribute("data-return-project");
      if (id) restoreReturnScroll(id);
    }
    playFallback();
  });
})();
