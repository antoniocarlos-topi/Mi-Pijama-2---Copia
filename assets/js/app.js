(function () {
  function qs(sel, ctx = document) {
    return ctx.querySelector(sel);
  }
  function qsa(sel, ctx = document) {
    return Array.from(ctx.querySelectorAll(sel));
  }

  const app = {
    init() {
      this.setYear();
      this.initMobileMenu();
      this.initHeaderScroll();
      this.initContactForm();

      // ✅ Tap feedback + skeleton images
      this.initTapFeedback();
      this.initImageSkeletons();

      // ✅ Badge do carrinho
      this.updateCartBadge();
      window.addEventListener("storage", () => this.updateCartBadge());

      // ✅ Scroll reveal
      this.initReveal();
    },

    setYear() {
      const yearEl = document.getElementById("year");
      if (yearEl) yearEl.textContent = new Date().getFullYear();
    },

    initMobileMenu() {
      const toggle = qs(".menu-toggle");
      const drawer = qs("#mobile-menu");
      const overlay = qs(".menu-overlay");

      if (!toggle || !drawer || !overlay) return;

      const open = () => {
        drawer.classList.add("is-open");
        overlay.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        toggle.classList.add("is-open");
        drawer.setAttribute("aria-hidden", "false");
        document.documentElement.classList.add("no-scroll");
      };

      const close = () => {
        drawer.classList.remove("is-open");
        overlay.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        document.documentElement.classList.remove("no-scroll");
      };

      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        expanded ? close() : open();
      });

      qsa("[data-menu-close]").forEach((el) => el.addEventListener("click", close));
      qsa(".mobile-nav a", drawer).forEach((a) => a.addEventListener("click", close));

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });
    },

    initHeaderScroll() {
      const header = qs(".site-header");
      if (!header) return;

      const onScroll = () => {
        if (window.scrollY > 8) header.classList.add("is-scrolled");
        else header.classList.remove("is-scrolled");
      };

      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    },

    initContactForm() {
      const contactForm = document.getElementById("contact-form");
      if (!contactForm) return;

      contactForm.addEventListener("submit", function (e) {
        e.preventDefault();
        alert("Mensagem enviada com sucesso! Entraremos em contato em breve.");
        contactForm.reset();
      });
    },

    initTapFeedback() {
      const targets = qsa("button, .btn");
      if (!targets.length) return;

      targets.forEach((el) => {
        el.addEventListener("pointerdown", () => {
          el.classList.add("is-tap");
          window.setTimeout(() => el.classList.remove("is-tap"), 160);
        });
      });
    },

    initImageSkeletons() {
      const imgs = qsa("img[data-skeleton]");
      if (!imgs.length) return;

      imgs.forEach((img) => {
        if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
        if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async");

        img.classList.remove("is-loaded");

        const done = () => img.classList.add("is-loaded");
        const fail = () => {
          img.classList.add("is-loaded");
          img.alt = img.alt || "Imagem indisponível";
        };

        if (img.complete && img.naturalWidth > 0) done();
        else {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", fail, { once: true });
        }
      });
    },

    // ===== Badge carrinho =====
    getCartCount() {
      const CART_KEY = "miPijamas_cart";
      try {
        const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
        return cart.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
      } catch (e) {
        return 0;
      }
    },

    updateCartBadge() {
      const count = this.getCartCount();
      const badges = document.querySelectorAll("[data-cart-badge]");
      badges.forEach((b) => {
        b.textContent = String(count);
        if (count === 0) b.classList.add("is-empty");
        else b.classList.remove("is-empty");
      });
    },

    // ===== Scroll reveal =====
    initReveal() {
      // respeita acessibilidade
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;

      // Seleciona “blocos” principais automaticamente
      const targets = qsa(".hero, .section, .mini-card, .product, .highlight, .cart-summary, .order-summary, .contact-section, .contact-form");
      if (!targets.length) return;

      targets.forEach((el) => el.classList.add("reveal"));

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
      );

      targets.forEach((el) => io.observe(el));
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    app.init();
  });
})();
