// assets/js/checkout.js
(function () {
  const WHATSAPP = "558699700402";
  const CART_KEY = "miPijamas_cart";

  function qs(sel, ctx = document) {
    return ctx.querySelector(sel);
  }

  function formatBRL(value) {
    const n = Number(value) || 0;
    return "R$ " + n.toFixed(2).replace(".", ",");
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
  }

  function calcTotals(items) {
    const subtotal = items.reduce((sum, it) => {
      const q = Number(it.quantidade) || 0;
      const p = Number(it.preco) || 0;
      return sum + q * p;
    }, 0);

    // por enquanto total = subtotal (frete depois)
    const total = subtotal;
    return { subtotal, total };
  }

  function renderOrderSummary(items) {
    const wrap = qs("#order-items");
    const subtotalEl = qs("#subtotal");
    const totalEl = qs("#total");

    if (!wrap || !subtotalEl || !totalEl) return;

    wrap.innerHTML = "";

    if (!items.length) {
      wrap.innerHTML = "<p>Seu carrinho está vazio.</p>";
      subtotalEl.textContent = formatBRL(0);
      totalEl.textContent = formatBRL(0);
      return;
    }

    items.forEach((it) => {
      const line = document.createElement("div");
      line.className = "order-item";
      const name = it.nome || "Pijama";
      const size = it.size ? ` • Tam: ${it.size}` : "";
      const color = it.color ? ` • Cor: ${it.color}` : "";
      const q = Number(it.quantidade) || 1;

      line.innerHTML = `
        <p style="margin:0;">
          <strong>${name}</strong>
          <span style="opacity:.85;">${size}${color}</span>
          <br/>
          <span style="opacity:.85;">Qtd: ${q} • ${formatBRL(it.preco)} cada</span>
        </p>
      `;
      wrap.appendChild(line);
    });

    const { subtotal, total } = calcTotals(items);
    subtotalEl.textContent = formatBRL(subtotal);
    totalEl.textContent = formatBRL(total);
  }

  function buildWhatsAppMessage(orderId, payload) {
    const { nome, telefone, endereco, itens, subtotal, total } = payload;

    const lines = itens.map((it) => {
      const name = it.nome || "Pijama";
      const size = it.size ? ` | Tam: ${it.size}` : "";
      const color = it.color ? ` | Cor: ${it.color}` : "";
      const q = Number(it.quantidade) || 1;
      const unit = formatBRL(it.preco);
      return `• ${name}${size}${color} | Qtd: ${q} | ${unit}`;
    });

    const msg =
      `Olá! Quero finalizar meu pedido 😊\n\n` +
      `Pedido: #${orderId}\n\n` +
      `Cliente:\n` +
      `• Nome: ${nome}\n` +
      `• WhatsApp: ${telefone}\n` +
      (endereco ? `• Endereço: ${endereco}\n\n` : "\n") +
      `Itens:\n${lines.join("\n")}\n\n` +
      `Subtotal: ${formatBRL(subtotal)}\n` +
      `Total: ${formatBRL(total)}\n\n` +
      `Pode confirmar disponibilidade e forma de entrega?`;

    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  async function ensureDataReady() {
    if (window.dataLayer && typeof window.dataLayer.initData === "function") {
      try {
        await window.dataLayer.initData();
      } catch (e) {
        // ok
      }
    }
  }

  async function createOrderInSupabase(payload) {
    if (!window.dataLayer || typeof window.dataLayer.createOrder !== "function") {
      throw new Error("createOrder não existe no dataLayer");
    }
    const created = await window.dataLayer.createOrder(payload);
    return created;
  }

  async function onFinalize() {
    const nome = (qs("#nome")?.value || "").trim();
    const telefone = (qs("#telefone")?.value || "").trim();
    const endereco = (qs("#endereco")?.value || "").trim();

    if (!nome) return alert("Preencha seu nome 🙂");
    if (!telefone) return alert("Preencha seu WhatsApp 🙂");

    const itens = getCart();
    if (!itens.length) return alert("Seu carrinho está vazio 🙂");

    const { subtotal, total } = calcTotals(itens);

    const payload = {
      nome,
      telefone,
      endereco,
      itens,
      subtotal,
      total,
      status: "novo",
      created_at: new Date().toISOString(),
    };

    // botão loading
    const btn = qs("#whatsapp-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Gerando pedido...";
    }

    try {
      await ensureDataReady();

      // ✅ salva no Supabase
      const created = await createOrderInSupabase(payload);

      // id do pedido (padrão: created.id)
      const orderId = created?.id || "SEM-ID";

      // abre WhatsApp com mensagem
      const url = buildWhatsAppMessage(orderId, payload);
      window.open(url, "_blank", "noopener,noreferrer");

      // ✅ limpa carrinho
      setCart([]);

      // feedback
      window.location.href = "obrigado.html";
    } catch (e) {
      console.error(e);
      alert("Não consegui salvar o pedido. Verifique as permissões (RLS) e tente novamente.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Finalizar no WhatsApp";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const btn = qs("#whatsapp-btn");
    const items = getCart();
    renderOrderSummary(items);

    if (btn) btn.addEventListener("click", onFinalize);
  });
})();
