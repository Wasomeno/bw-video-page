(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const returning = document.documentElement.classList.contains("is-returning");
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  function wrapShift(media) {
    if (!media || !media.parentNode) return null;
    if (media.parentElement && media.parentElement.classList.contains("launch-shift")) {
      return media.parentElement;
    }
    const shift = document.createElement("div");
    shift.className = "launch-shift";
    media.parentNode.insertBefore(shift, media);
    shift.appendChild(media);
    return shift;
  }

  function slotsFor(launch) {
    const slots = [];
    const stage = launch.querySelector(".launch-stage");
    if (stage) {
      const video = stage.querySelector(".launch-video");
      if (video) {
        slots.push({
          host: stage,
          shift: wrapShift(video),
          depth: 0.7,
        });
      }
    }
    launch.querySelectorAll(".launch-still").forEach(function (still, i) {
      const img = still.querySelector("img");
      if (!img) return;
      slots.push({
        host: still,
        shift: wrapShift(img),
        depth: 0.94 + i * 0.22,
      });
    });
    return slots.filter(function (slot) {
      return slot.shift;
    });
  }

  function markRevealed(slot) {
    slot.host.classList.add("is-revealed");
    slot.host.classList.remove("is-ascii");
  }

  function revealNow(hosts) {
    (hosts || document.querySelectorAll(".launch-stage, .launch-still")).forEach(function (host) {
      host.classList.add("is-revealed");
      host.classList.remove("is-ascii");
    });
  }

  function bind(gsap, ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const depthScale = coarse ? 0.5 : 1;

    document.querySelectorAll(".launch").forEach(function (launch) {
      const slots = slotsFor(launch);
      if (!slots.length) return;

      slots.forEach(function (slot) {
        const travel = 8 * slot.depth * depthScale;
        const scale = 1 + (travel * 2 + 6) / 100;
        gsap.set(slot.shift, {
          scale: scale,
          force3D: true,
          transformOrigin: "50% 50%",
        });
        gsap.fromTo(
          slot.shift,
          { yPercent: travel },
          {
            yPercent: -travel,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: slot.host,
              start: "top bottom",
              end: "bottom top",
              scrub: coarse ? 0.35 : 1.2,
              invalidateOnRefresh: true,
            },
          }
        );
      });

      if (returning) {
        slots.forEach(function (slot) {
          gsap.set(slot.host, { clearProps: "clipPath,transform" });
          markRevealed(slot);
        });
        return;
      }

      slots.forEach(function (slot) {
        gsap.set(slot.host, {
          clipPath: "inset(18% 0% 0% 0%)",
          scale: 0.97,
          y: 28,
          force3D: true,
          transformOrigin: "50% 100%",
        });
      });

      const tl = gsap.timeline({
        defaults: { overwrite: false, force3D: true },
        scrollTrigger: {
          trigger: launch,
          start: "top 80%",
          once: true,
          toggleActions: "play none none none",
        },
      });

      slots.forEach(function (slot, i) {
        const at = i * 0.1;
        tl.to(
          slot.host,
          {
            clipPath: "inset(0% 0% 0% 0%)",
            y: 0,
            duration: 1.08,
            ease: "power3.out",
            onStart: function () {
              markRevealed(slot);
            },
          },
          at
        );
        tl.to(
          slot.host,
          {
            scale: 1,
            duration: 1.16,
            ease: "elastic.out(0.5, 0.76)",
            onComplete: function () {
              gsap.set(slot.host, { clearProps: "clipPath,transform" });
            },
          },
          at + 0.05
        );
      });
    });

    ScrollTrigger.refresh();
  }

  function init() {
    function arm(tries) {
      if (reduced) {
        revealNow();
        return;
      }
      if (!window.gsap || !window.ScrollTrigger) {
        if ((tries || 0) > 120) {
          revealNow();
          return;
        }
        window.requestAnimationFrame(function () {
          arm((tries || 0) + 1);
        });
        return;
      }
      bind(window.gsap, window.ScrollTrigger);
    }

    if (document.documentElement.classList.contains("is-booting")) {
      document.addEventListener("xstation:booted", function () {
        arm(0);
      }, { once: true });
    } else {
      arm(0);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
