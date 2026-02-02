// assets/js/checkout.js
(function () {
  const CART_KEY = "miPijamas_cart";

  function formatBRL(value) {
    return "R$ " + Number(value || 0).toFixed(2).replace(".", ",");
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
      return [];
    }
  }

  async function ensureDataReady() {
    if (window.dataLayer && typeof window.dataLayer.initData === "function") {
      try { await window.dataLayer.initData(); } catch {}
    }
  }

  function resolveImgSrc(productImage) {
    // checkout está em /pages => basePath volta 1 nível
    const basePath = "../assets/images/";
    if (window.dataLayer && typeof window.dataLayer.resolveImageSrc === "function") {
      return window.dataLayer.resolveImageSrc(productImage || "", basePath);
    }
    const raw = String(productImage || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    return basePath + raw;
  }

  function renderSummary() {
    const itemsBox = document.getElementById("order-items");
    const subtotalEl = document.getElementById("subtotal");
    const totalEl = document.getElementById("total");

    if (!itemsBox || !subtotalEl || !totalEl) return;

    const cart = getCart();
    if (!cart.length) {
      itemsBox.innerHTML = `<p style="opacity:.8;">Seu carrinho está vazio.</p>`;
      subtotalEl.textContent = formatBRL(0);
      totalEl.textContent = formatBRL(0);
      return;
    }

    let subtotal = 0;

    itemsBox.innerHTML = cart.map((item) => {
      const price = Number(item.preco || 0);
      const qty = Number(item.quantidade || 1);
      subtotal += price * qty;

      const img = resolveImgSrc(item.imagem);

      return `
        <div class="cart-row" style="display:flex; gap:12px; align-items:center; padding:10px 0; border-bottom:1px solid rgba(0,0,0,.06);">
          <div style="width:56px; height:56px; border-radius:14px; overflow:hidden; flex:0 0 auto; border:1px solid rgba(0,0,0,.08); background:#f4f4f4;">
            <img src="${img}" alt="${(item.nome || "Produto").replace(/"/g, "")}"
                 style="width:100%; height:100%; object-fit:cover; display:block;" loading="lazy" decoding="async">
          </div>

          <div style="flex:1;">
            <div style="font-weight:800;">${item.nome || "Produto"}</div>
            <div style="opacity:.8; font-size:.92rem;">Tam: ${item.tamanho || "-"}</div>
            <div style="margin-top:2px; font-weight:900;">${formatBRL(price)}</div>
          </div>

          <div style="font-weight:800;">x${qty}</div>
        </div>
      `;
    }).join("");

    subtotalEl.textContent = formatBRL(subtotal);
    totalEl.textContent = formatBRL(subtotal);
  }

  function buildWhatsAppMessage({ nome, telefone, endereco }) {
    const cart = getCart();

    let msg = `Olá! Quero finalizar meu pedido na MI Pijamas 🛍️\n\n`;
    msg += `👤 Nome: ${nome}\n`;
    msg += `📞 WhatsApp: ${telefone}\n`;
    if (endereco) msg += `📍 Endereço: ${endereco}\n`;
    msg += `\n🧾 Itens do pedido:\n`;

    let total = 0;

    cart.forEach((item, idx) => {
      const price = Number(item.preco || 0);
      const qty = Number(item.quantidade || 1);
      const line = price * qty;
      total += line;

      msg += `${idx + 1}) ${item.nome || "Produto"} `;
      if (item.tamanho) msg += `(Tam: ${item.tamanho}) `;
      msg += `x${qty} - ${formatBRL(price)}\n`;
    });

    msg += `\n💰 Total: ${formatBRL(total)}\n`;
    msg += `\nPode confirmar disponibilidade e entrega, por favor? 😊`;

    return msg;
  }

  function initFinalize() {
    const btn = document.getElementById("whatsapp-btn");
    const form = document.getElementById("checkout-form");
    if (!btn || !form) return;

    btn.addEventListener("click", () => {
      const nome = (document.getElementById("nome")?.value || "").trim();
      const telefone = (document.getElementById("telefone")?.value || "").trim();
      const endereco = (document.getElementById("endereco")?.value || "").trim();

      if (!nome || !telefone) {
        alert("Preencha nome e telefone para finalizar.");
        return;
      }

      const cart = getCart();
      if (!cart.length) {
        alert("Seu carrinho está vazio.");
        return;
      }

      const message = buildWhatsAppMessage({ nome, telefone, endereco });
      const url = `https://wa.me/558699700402?text=${encodeURIComponent(message)}`;

      // NÃO salva no Supabase (evita RLS), apenas abre WhatsApp
      window.open(url, "_blank", "noopener,noreferrer");

      // opcional: limpar carrinho e mandar para obrigado
      // localStorage.removeItem(CART_KEY);
      // window.location.href = "obrigado.html";
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await ensureDataReady();
    renderSummary();
    initFinalize();
  });
})();
