// assets/js/admin.js
(function () {
  const ADMIN_PASSWORD = "miadmin123"; // <-- TROQUE se quiser
  const AUTH_KEY = "mi_admin_auth_ok";

  const PRODUCTS_TABLE = "products";
  const BUCKET = "product-images";

  function qs(sel, ctx = document) {
    return ctx.querySelector(sel);
  }

  function toNumber(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim().replace(",", ".");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function msg(el, text, ok = true) {
    if (!el) return;
    el.textContent = text || "";
    el.style.color = ok ? "rgba(31,27,29,.75)" : "#B93A76";
  }

  async function ensureSupabaseJs() {
    if (window.supabase?.createClient) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function getClient() {
    await ensureSupabaseJs();
    if (!window.__MI_SUPABASE__?.url || !window.__MI_SUPABASE__?.anonKey) {
      throw new Error("Config do Supabase não encontrada (window.__MI_SUPABASE__).");
    }
    return window.supabase.createClient(window.__MI_SUPABASE__.url, window.__MI_SUPABASE__.anonKey);
  }

  function setAuthed(v) {
    localStorage.setItem(AUTH_KEY, v ? "1" : "0");
  }

  function isAuthed() {
    return localStorage.getItem(AUTH_KEY) === "1";
  }

  function showApp() {
    qs("#admin-login").style.display = "none";
    qs("#admin-app").style.display = "block";
  }

  function showLogin() {
    qs("#admin-login").style.display = "block";
    qs("#admin-app").style.display = "none";
  }

  function resetForm() {
    qs("#p-id").value = "";
    qs("#p-name").value = "";
    qs("#p-price").value = "";
    qs("#p-image").value = "";
    qs("#p-desc").value = "";
    qs("#p-active").checked = true;
    qs("#p-featured").checked = false;
    qs("#p-promo").checked = false;
    qs("#p-promo-price").value = "";
    qs("#p-stock").value = "";
    qs("#form-title").textContent = "Novo pijama";
    msg(qs("#form-msg"), "");
    qs("#save-btn").textContent = "Salvar";

    const file = qs("#p-image-file");
    if (file) file.value = "";

    const preview = qs("#p-image-preview");
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
  }

  function normalizeRow(row) {
    return {
      id: row.id,
      name: row.name ?? "",
      description: row.description ?? "",
      price: row.price ?? 0,
      image: row.image ?? "",
      active: row.active ?? true,
      featured: row.featured ?? false,
      promo: row.promo ?? false,
      promo_price: row.promo_price ?? null,
      stock: row.stock ?? null,
    };
  }

  function formatBRL(n) {
    const v = Number(n || 0).toFixed(2).replace(".", ",");
    return `R$ ${v}`;
  }

  function getPublicUrl(client, path) {
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || "";
  }

  function safeFileName(originalName) {
    const base = (originalName || "image")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9.\-_]/g, "");
    return base.length ? base : "image";
  }

  async function uploadImageIfAny(client) {
    const input = qs("#p-image-file");
    if (!input || !input.files || !input.files.length) return null;

    const file = input.files[0];
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeFileName(file.name)}`;
    const path = `products/${fileName}`;

    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || `image/${ext}`,
    });

    if (error) throw error;

    return getPublicUrl(client, path);
  }

  function productCardHTML(p) {
    const promo = p.promo && p.promo_price ? formatBRL(p.promo_price) : null;
    const base = formatBRL(p.price);

    const imgSrc =
      window.dataLayer && typeof window.dataLayer.resolveImageSrc === "function"
        ? window.dataLayer.resolveImageSrc(p.image || "", "../assets/images/")
        : (p.image || "");

    return `
      <article class="highlight" style="text-align:left; position:relative;">
        <img data-skeleton alt="${p.name || "Pijama"}" src="${imgSrc}">
        <h3 style="margin:0;">${p.name || "Sem nome"}</h3>

        <p style="margin:0; font-weight:800; color: var(--brand);">
          ${
            promo
              ? `${promo} <span style="opacity:.55; font-weight:600; text-decoration:line-through; margin-left:8px;">${base}</span>`
              : base
          }
        </p>

        <p style="margin:6px 0 0; font-size:.95rem;">
          ${p.active ? "✅ Ativo" : "⛔ Inativo"}
          ${p.featured ? " • ⭐ Selecionado" : ""}
          ${p.stock !== null && p.stock !== "" ? ` • Estoque: ${p.stock}` : ""}
        </p>

        <div class="actions" style="margin-top:10px;">
          <button class="btn" data-edit="${p.id}">Editar</button>
          <button class="btn" data-toggle="${p.id}">${p.active ? "Desativar" : "Ativar"}</button>
          <button class="btn" data-featured="${p.id}">${p.featured ? "Remover Seleção" : "Selecionar"}</button>
          <button class="btn" data-delete="${p.id}" style="border-color: rgba(185,58,118,.28); color:#B93A76;">
            Apagar
          </button>
        </div>
      </article>
    `;
  }

  async function listProducts() {
    const wrap = qs("#admin-list");
    wrap.innerHTML = `<p>Carregando...</p>`;

    const client = await getClient();
    const { data, error } = await client.from(PRODUCTS_TABLE).select("*").order("id", { ascending: true });
    if (error) throw error;

    const items = (data || []).map(normalizeRow);

    if (!items.length) {
      wrap.innerHTML = `<p>Nenhum pijama cadastrado ainda.</p>`;
      return;
    }

    wrap.innerHTML = items.map(productCardHTML).join("");

    // skeleton
    wrap.querySelectorAll("img[data-skeleton]").forEach((img) => {
      img.classList.remove("is-loaded");
      const done = () => img.classList.add("is-loaded");
      if (img.complete && img.naturalWidth > 0) done();
      else img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });

    // editar
    wrap.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-edit");
        await fillFormFromDB(id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    // toggle active
    wrap.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-toggle");
        await toggleActive(id);
        await listProducts();
      });
    });

    // toggle featured
    wrap.querySelectorAll("[data-featured]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-featured");
        await toggleFeatured(id);
        await listProducts();
      });
    });

    // delete
    wrap.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-delete");
        await deleteProductFlow(id);
      });
    });
  }

  async function fillFormFromDB(id) {
    const client = await getClient();
    const { data, error } = await client.from(PRODUCTS_TABLE).select("*").eq("id", id).single();
    if (error) throw error;

    const p = normalizeRow(data);

    qs("#p-id").value = p.id;
    qs("#p-name").value = p.name || "";
    qs("#p-price").value = String(p.price ?? "");
    qs("#p-image").value = p.image || "";
    qs("#p-desc").value = p.description || "";
    qs("#p-active").checked = !!p.active;
    qs("#p-featured").checked = !!p.featured;
    qs("#p-promo").checked = !!p.promo;
    qs("#p-promo-price").value = p.promo_price !== null && p.promo_price !== undefined ? String(p.promo_price) : "";
    qs("#p-stock").value = p.stock !== null && p.stock !== undefined ? String(p.stock) : "";

    qs("#form-title").textContent = `Editando: ${p.name || "Pijama"}`;
    qs("#save-btn").textContent = "Salvar alterações";
    msg(qs("#form-msg"), "Carregado para edição ✅", true);

    const preview = qs("#p-image-preview");
    if (preview && p.image) {
      preview.src = p.image;
      preview.style.display = "block";
    }
  }

  async function toggleActive(id) {
    const client = await getClient();
    const { data, error } = await client.from(PRODUCTS_TABLE).select("id, active").eq("id", id).single();
    if (error) throw error;

    const next = !(data.active ?? true);
    const up = await client.from(PRODUCTS_TABLE).update({ active: next }).eq("id", id);
    if (up.error) throw up.error;
  }

  async function toggleFeatured(id) {
    const client = await getClient();
    const { data, error } = await client.from(PRODUCTS_TABLE).select("id, featured").eq("id", id).single();
    if (error) throw error;

    const next = !(data.featured ?? false);
    const up = await client.from(PRODUCTS_TABLE).update({ featured: next }).eq("id", id);
    if (up.error) throw up.error;
  }

  async function deleteProductFlow(id) {
    const client = await getClient();
    const formMsg = qs("#form-msg");

    const { data, error } = await client.from(PRODUCTS_TABLE).select("id, name").eq("id", id).single();
    if (error) {
      console.error(error);
      msg(formMsg, "Erro ao localizar o produto para apagar.", false);
      return;
    }

    const name = data?.name ? `“${data.name}”` : "este produto";
    const ok = confirm(`Tem certeza que deseja apagar ${name}?\n\nIsso não pode ser desfeito.`);
    if (!ok) return;

    try {
      msg(formMsg, "Apagando...", true);
      const del = await client.from(PRODUCTS_TABLE).delete().eq("id", id);
      if (del.error) throw del.error;

      if (qs("#p-id").value.trim() === String(id)) resetForm();

      msg(formMsg, "Produto apagado ✅", true);
      await listProducts();
    } catch (err) {
      console.error(err);
      msg(formMsg, "Erro ao apagar. Veja o console.", false);
    }
  }

  async function saveProduct(e) {
    e.preventDefault();
    const formMsg = qs("#form-msg");

    const id = qs("#p-id").value.trim();
    const name = qs("#p-name").value.trim();
    const description = qs("#p-desc").value.trim();
    const price = toNumber(qs("#p-price").value);

    const currentImage = qs("#p-image").value.trim();

    const active = qs("#p-active").checked;
    const featured = qs("#p-featured").checked;
    const promo = qs("#p-promo").checked;
    const promo_price = toNumber(qs("#p-promo-price").value);
    const stock = toNumber(qs("#p-stock").value);

    if (!name) return msg(formMsg, "Informe o nome do pijama.", false);
    if (price === null) return msg(formMsg, "Informe um preço válido (ex: 89.90).", false);
    if (promo && (promo_price === null || promo_price <= 0))
      return msg(formMsg, "Promoção marcada: informe preço promocional válido.", false);

    try {
      msg(formMsg, "Salvando... (enviando imagem se houver)", true);
      const client = await getClient();

      const uploadedUrl = await uploadImageIfAny(client);
      const image = uploadedUrl || currentImage || "";

      const payload = {
        name,
        description,
        price,
        image,
        active,
        featured,
        promo,
        promo_price: promo ? promo_price : null,
        stock: stock === null ? null : stock,
      };

      if (id) {
        const { error } = await client.from(PRODUCTS_TABLE).update(payload).eq("id", id);
        if (error) throw error;
        msg(formMsg, "Alterações salvas ✅", true);
      } else {
        const { error } = await client.from(PRODUCTS_TABLE).insert([payload]);
        if (error) throw error;
        msg(formMsg, "Pijama criado ✅", true);
      }

      resetForm();
      await listProducts();
    } catch (err) {
      console.error(err);
      msg(formMsg, "Erro ao salvar. Veja o console.", false);
    }
  }

  function initPreview() {
    const file = qs("#p-image-file");
    const preview = qs("#p-image-preview");
    if (!file || !preview) return;

    file.addEventListener("change", () => {
      const f = file.files?.[0];
      if (!f) {
        preview.src = "";
        preview.style.display = "none";
        return;
      }
      const url = URL.createObjectURL(f);
      preview.src = url;
      preview.style.display = "block";
    });
  }

  function boot() {
    const loginMsg = qs("#admin-login-msg");
    const pass = qs("#admin-pass");
    const enter = qs("#admin-enter");

    const logout = qs("#logout-btn");
    const clear = qs("#clear-btn");
    const form = qs("#product-form");

    initPreview();

    if (isAuthed()) {
      showApp();
      listProducts().catch(console.error);
    } else {
      showLogin();
    }

    enter.addEventListener("click", async () => {
      const v = (pass.value || "").trim();
      if (v !== ADMIN_PASSWORD) {
        msg(loginMsg, "Senha incorreta.", false);
        return;
      }
      setAuthed(true);
      msg(loginMsg, "");
      showApp();
      await listProducts().catch(console.error);
    });

    logout.addEventListener("click", () => {
      setAuthed(false);
      resetForm();
      showLogin();
      msg(loginMsg, "Você saiu do admin.", true);
      pass.value = "";
    });

    clear.addEventListener("click", resetForm);
    form.addEventListener("submit", saveProduct);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
