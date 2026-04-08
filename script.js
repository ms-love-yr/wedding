(function () {
  const page = document.body.dataset.page;
  const data = window.SITE_DATA || { gallery: [], past: [] };
  const params = new URLSearchParams(window.location.search);
  const bgmPlayer = document.getElementById("bgm-player");
  const bgmToggle = document.getElementById("bgm-toggle");
  let galleryViewer = null;
  let galleryViewerImage = null;
  let galleryViewerCounter = null;
  let galleryViewerBackdrop = null;
  let copyToast = null;
  let activeGalleryIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;

  function createImageCard(src, alt) {
    const button = document.createElement("button");
    button.className = "gallery-item";
    button.type = "button";
    button.setAttribute("aria-label", alt + " 확대 보기");

    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    image.loading = "lazy";

    button.appendChild(image);
    return button;
  }

  function createEmptyMessage(message) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = message;
    return empty;
  }

  function setupBgmFallback() {
    if (!bgmPlayer) {
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;
    let retryTimerId = null;

    function showBgmToggle() {
      if (bgmToggle) {
        bgmToggle.hidden = false;
      }
    }

    function hideBgmToggle() {
      if (bgmToggle) {
        bgmToggle.hidden = true;
      }
    }

    function clearRetryTimer() {
      if (retryTimerId) {
        window.clearTimeout(retryTimerId);
        retryTimerId = null;
      }
    }

    function tryPlay() {
      const playPromise = bgmPlayer.play();
      if (!playPromise || typeof playPromise.then !== "function") {
        hideBgmToggle();
        return;
      }

      playPromise
        .then(function () {
          clearRetryTimer();
          hideBgmToggle();
        })
        .catch(function () {
          retryCount += 1;
          if (retryCount >= maxRetries) {
            showBgmToggle();
            return;
          }
          clearRetryTimer();
          retryTimerId = window.setTimeout(tryPlay, 700);
        });
    }

    function resumeOnFirstInteraction() {
      retryCount = 0;
      tryPlay();
      document.removeEventListener("pointerdown", resumeOnFirstInteraction);
      document.removeEventListener("keydown", resumeOnFirstInteraction);
    }

    bgmPlayer.addEventListener("playing", hideBgmToggle);
    bgmPlayer.addEventListener("canplay", tryPlay, { once: true });
    document.addEventListener("pointerdown", resumeOnFirstInteraction, { once: true, passive: true });
    document.addEventListener("keydown", resumeOnFirstInteraction, { once: true });

    if (bgmToggle) {
      bgmToggle.addEventListener("click", function () {
        retryCount = 0;
        tryPlay();
      });
    }
  }

  function buildStoryDescription(index, fileName) {
    const prompts = [
      "함께 웃었던 하루를 조용히 꺼내 보았습니다.",
      "익숙한 계절 속에서 더 가까워진 순간입니다.",
      "작은 여행처럼 오래 기억될 장면입니다.",
      "서로의 일상에 스며든 시간들을 담았습니다."
    ];
    return prompts[index % prompts.length] + " " + fileName + "의 기억을 남깁니다.";
  }

  function showCopyToast(message, isError) {
    if (!copyToast) {
      copyToast = document.createElement("div");
      copyToast.className = "copy-toast";
      document.body.appendChild(copyToast);
    }

    copyToast.textContent = message;
    copyToast.classList.toggle("is-error", Boolean(isError));
    copyToast.classList.add("is-visible");

    window.clearTimeout(showCopyToast.timeoutId);
    showCopyToast.timeoutId = window.setTimeout(function () {
      copyToast.classList.remove("is-visible");
    }, 1400);
  }

  function getAccountOwnerName(element) {
    const row = element.closest(".account-row");
    if (!row) {
      return "";
    }
    const name = row.querySelector("span");
    return name ? name.textContent.trim() : "";
  }

  async function copyText(text, ownerName) {
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showCopyToast((ownerName || "선택한") + " 님의 계좌가 복사되었습니다.");
    } catch (error) {
      showCopyToast("복사에 실패했습니다", true);
    }
  }

  function setupCopyButtons() {
    const rows = document.querySelectorAll(".account-row");
    rows.forEach(function (row) {
      row.addEventListener("click", function () {
        const target = row.querySelector("[data-copy]");
        if (!target) {
          return;
        }
        copyText(target.dataset.copy || "", getAccountOwnerName(row));
      });
    });

    const buttons = document.querySelectorAll(".copy-button");
    buttons.forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        copyText(button.dataset.copy || "", getAccountOwnerName(button));
      });
    });
  }

  function setupConditionalSections() {
    const hideAccounts = params.get("hideAccounts");
    if (hideAccounts === "1" || hideAccounts === "true") {
      const accountsSection = document.getElementById("accounts-section");
      if (accountsSection) {
        accountsSection.hidden = true;
      }
    }
  }

  function preserveQueryParamsOnInternalLinks() {
    if (!window.location.search) {
      return;
    }

    const links = document.querySelectorAll('a[href]');
    links.forEach(function (link) {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const url = new URL(href, window.location.href);
      url.search = window.location.search;

      if (href.startsWith("./")) {
        link.setAttribute("href", "./" + url.search);
        return;
      }

      if (!href.includes("/")) {
        link.setAttribute("href", url.pathname.split("/").pop() + url.search);
        return;
      }

      link.setAttribute("href", url.pathname + url.search);
    });
  }

  function updateGalleryViewer(index) {
    activeGalleryIndex = (index + data.gallery.length) % data.gallery.length;
    const item = data.gallery[activeGalleryIndex];
    galleryViewerImage.src = item.src;
    galleryViewerImage.alt = "갤러리 사진 " + (activeGalleryIndex + 1);
    galleryViewerCounter.textContent =
      String(activeGalleryIndex + 1) + " / " + String(data.gallery.length);
  }

  function applyViewerBackdropFromImage() {
    if (!galleryViewerImage || !galleryViewerBackdrop) {
      return;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }

    const sampleWidth = 24;
    const sampleHeight = 24;
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    try {
      context.drawImage(galleryViewerImage, 0, 0, sampleWidth, sampleHeight);
      const { data: pixels } = context.getImageData(0, 0, sampleWidth, sampleHeight);
      let red = 0;
      let green = 0;
      let blue = 0;
      let count = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        red += pixels[i];
        green += pixels[i + 1];
        blue += pixels[i + 2];
        count += 1;
      }

      if (count === 0) {
        return;
      }

      const avgRed = Math.round(red / count);
      const avgGreen = Math.round(green / count);
      const avgBlue = Math.round(blue / count);
      galleryViewerBackdrop.style.background =
        "rgb(" + avgRed + ", " + avgGreen + ", " + avgBlue + ")";
    } catch (error) {
      galleryViewerBackdrop.style.background = "";
    }
  }

  function closeGalleryViewer() {
    if (!galleryViewer) {
      return;
    }
    galleryViewer.classList.remove("is-open");
    document.body.classList.remove("viewer-open");
  }

  function openGalleryViewer(index) {
    if (!galleryViewer || data.gallery.length === 0) {
      return;
    }
    updateGalleryViewer(index);
    galleryViewer.classList.add("is-open");
    document.body.classList.add("viewer-open");
  }

  function ensureGalleryViewer() {
    if (galleryViewer || page !== "home") {
      return;
    }

    galleryViewer = document.createElement("div");
    galleryViewer.className = "gallery-viewer";

    galleryViewerBackdrop = document.createElement("div");
    galleryViewerBackdrop.className = "gallery-viewer__backdrop";
    galleryViewerBackdrop.addEventListener("click", closeGalleryViewer);

    const closeButton = document.createElement("button");
    closeButton.className = "gallery-viewer__close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "갤러리 닫기");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", closeGalleryViewer);

    const prevButton = document.createElement("button");
    prevButton.className = "gallery-viewer__nav gallery-viewer__nav--prev";
    prevButton.type = "button";
    prevButton.setAttribute("aria-label", "이전 사진");
    prevButton.textContent = "‹";
    prevButton.addEventListener("click", function () {
      updateGalleryViewer(activeGalleryIndex - 1);
    });

    const nextButton = document.createElement("button");
    nextButton.className = "gallery-viewer__nav gallery-viewer__nav--next";
    nextButton.type = "button";
    nextButton.setAttribute("aria-label", "다음 사진");
    nextButton.textContent = "›";
    nextButton.addEventListener("click", function () {
      updateGalleryViewer(activeGalleryIndex + 1);
    });

    const figure = document.createElement("figure");
    figure.className = "gallery-viewer__figure";

    const imageFrame = document.createElement("div");
    imageFrame.className = "gallery-viewer__frame";

    galleryViewerImage = document.createElement("img");
    galleryViewerImage.className = "gallery-viewer__image";
    galleryViewerImage.alt = "";
    galleryViewerImage.addEventListener("load", applyViewerBackdropFromImage);

    galleryViewerCounter = document.createElement("figcaption");
    galleryViewerCounter.className = "gallery-viewer__counter";

    imageFrame.appendChild(galleryViewerImage);
    figure.appendChild(imageFrame);
    figure.appendChild(galleryViewerCounter);

    figure.addEventListener("click", function (event) {
      if (event.target === figure) {
        closeGalleryViewer();
      }
    });

    imageFrame.addEventListener("click", function (event) {
      if (event.target === imageFrame) {
        closeGalleryViewer();
      }
    });

    figure.addEventListener("touchstart", function (event) {
      if (event.touches.length !== 1) {
        return;
      }
      touchActive = true;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });

    figure.addEventListener("touchend", function (event) {
      if (!touchActive || event.changedTouches.length !== 1) {
        touchActive = false;
        return;
      }

      const deltaX = event.changedTouches[0].clientX - touchStartX;
      const deltaY = event.changedTouches[0].clientY - touchStartY;
      touchActive = false;

      if (Math.abs(deltaX) < 24 && Math.abs(deltaY) < 24) {
        if (event.target === figure) {
          closeGalleryViewer();
        }
        return;
      }

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
        if (deltaX > 0) {
          updateGalleryViewer(activeGalleryIndex - 1);
        } else {
          updateGalleryViewer(activeGalleryIndex + 1);
        }
      }
    }, { passive: true });

    galleryViewer.appendChild(galleryViewerBackdrop);
    galleryViewer.appendChild(closeButton);
    galleryViewer.appendChild(prevButton);
    galleryViewer.appendChild(nextButton);
    galleryViewer.appendChild(figure);

    document.body.appendChild(galleryViewer);

    document.addEventListener("keydown", function (event) {
      if (!galleryViewer || !galleryViewer.classList.contains("is-open")) {
        return;
      }
      if (event.key === "Escape") {
        closeGalleryViewer();
      }
      if (event.key === "ArrowLeft") {
        updateGalleryViewer(activeGalleryIndex - 1);
      }
      if (event.key === "ArrowRight") {
        updateGalleryViewer(activeGalleryIndex + 1);
      }
    });

  }

  if (page === "home") {
    const gallery = document.getElementById("gallery-grid");
    if (data.gallery.length === 0) {
      gallery.appendChild(createEmptyMessage("표시할 갤러리 사진이 아직 준비되지 않았습니다."));
      return;
    }
    ensureGalleryViewer();
    data.gallery.forEach(function (item, index) {
      const card = createImageCard(item.src, "갤러리 사진 " + (index + 1));
      card.addEventListener("click", function () {
        openGalleryViewer(index);
      });
      gallery.appendChild(card);
    });
  }

  if (page === "story") {
    const storyGrid = document.getElementById("story-grid");
    if (data.past.length === 0) {
      storyGrid.appendChild(createEmptyMessage("연애 이야기 사진이 아직 준비되지 않았습니다."));
      return;
    }
    data.past.forEach(function (item, index) {
      const article = document.createElement("article");
      article.className = "story-card";

      const image = document.createElement("img");
      image.src = item.src;
      image.alt = item.title;
      image.loading = "lazy";

      const body = document.createElement("div");
      body.className = "story-card__body";

      const tag = document.createElement("span");
      tag.className = "story-card__tag";
      tag.textContent = "기록 " + String(index + 1).padStart(2, "0");

      const title = document.createElement("h2");
      title.textContent = item.title;

      const text = document.createElement("p");
      text.textContent = buildStoryDescription(index, item.title);

      body.appendChild(tag);
      body.appendChild(title);
      body.appendChild(text);
      article.appendChild(image);
      article.appendChild(body);
      storyGrid.appendChild(article);
    });
  }

  setupCopyButtons();
  setupConditionalSections();
  preserveQueryParamsOnInternalLinks();
  setupBgmFallback();
})();
