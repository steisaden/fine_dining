const pageMap = new Map([
  ["/", "/generated/pages/index.html"],
  ["/menu", "/generated/pages/menu.html"],
  ["/private-dining", "/generated/pages/private-dining.html"],
  ["/journal", "/generated/pages/journal.html"],
  ["/reservations", "/generated/pages/reservations.html"],
  ["/prompt/", "/generated/pages/prompt.html"],
]);

const html = (body, status = 200) => new Response(body, {
  status,
  headers: {
    "content-type": "text/html; charset=utf-8",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  },
});

async function assetAt(request, env, path) {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";
  return env.ASSETS.fetch(new Request(url, { headers: { accept: request.headers.get("accept") || "*/*" } }));
}

const escapeHTML = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character]);

const stampForm = (body) => body.replace(/(name="started_at" value=")[^"]*(")/, `$1${Math.floor(Date.now() / 1000)}$2`);

function validate(form) {
  const errors = [];
  if (!form.get("name")?.trim()) errors.push(["name", "Enter your name."]);
  if (!form.get("email")?.includes("@")) errors.push(["email", "Enter a valid email address."]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.get("preferred_date") || "")) errors.push(["preferred_date", "Choose a preferred date."]);
  if (form.get("alternate_date") && !/^\d{4}-\d{2}-\d{2}$/.test(form.get("alternate_date"))) errors.push(["alternate_date", "Choose a valid alternate date or leave it blank."]);
  const guests = Number(form.get("guest_count"));
  if (!Number.isInteger(guests) || guests < 1 || guests > 24) errors.push(["guest_count", "Enter a guest count from 1 to 24."]);
  if (!["tasting", "private", "chef-table", "celebration", "collaboration"].includes(form.get("service_type"))) errors.push(["service_type", "Choose a service type."]);
  if (!form.get("location")?.trim()) errors.push(["location", "Tell us where the dinner would take place."]);
  if (!form.get("consent")) errors.push(["consent", "Acknowledge that this is an availability inquiry."]);
  if (form.get("website")) errors.push(["form", "We could not process this request."]);
  const elapsed = Math.floor(Date.now() / 1000) - Number(form.get("started_at"));
  if (!Number.isFinite(elapsed) || elapsed < 2 || elapsed > 86400) errors.push(["form", "Refresh the form, take a moment to review it, and try again."]);
  return errors;
}

function retainForm(body, form, errors) {
  const values = ["name", "email", "telephone", "guest_count", "preferred_date", "alternate_date", "location"];
  for (const name of values) {
    const pattern = new RegExp(`(name="${name}"[^>]*value=")[^"]*(")`);
    body = body.replace(pattern, `$1${escapeHTML(form.get(name))}$2`);
  }
  for (const name of ["dietary", "accessibility", "occasion", "message"]) {
    const pattern = new RegExp(`(<textarea[^>]*name="${name}"[^>]*>)[\\s\\S]*?(</textarea>)`);
    body = body.replace(pattern, `$1${escapeHTML(form.get(name))}$2`);
  }
  const service = escapeHTML(form.get("service_type"));
  if (service) body = body.replace(`value="${service}"`, `value="${service}" selected`);
  if (form.get("consent")) body = body.replace('name="consent" value="yes"', 'name="consent" value="yes" checked');

  const summary = `<section class="error-summary" role="alert" tabindex="-1" data-focus-on-swap><h2>Review the request</h2><ul>${errors.map(([, message]) => `<li>${escapeHTML(message)}</li>`).join("")}</ul></section>`;
  body = body.replace(/(<form[^>]*>)/, `$1${summary}`);
  for (const [field, message] of errors) {
    if (field === "form") continue;
    const id = `${field.replaceAll("_", "-")}-error`;
    if (field === "service_type") {
      body = body.replace(/(<select[^>]*name="service_type"[^>]*)(>)/, `$1 aria-invalid="true" aria-describedby="${id}"$2`);
      body = body.replace(/(<\/select>)/, `$1<p class="field-error" id="${id}">${escapeHTML(message)}</p>`);
    } else if (field === "consent") {
      body = body.replace(/(<input[^>]*name="consent"[^>]*)(>)/, `$1 aria-invalid="true" aria-describedby="${id}"$2`);
      body = body.replace(/(<\/label>)(?=\s*<div class="form-submit")/, `$1<p class="field-error" id="${id}">${escapeHTML(message)}</p>`);
    } else {
      const pattern = new RegExp(`(<input[^>]*name="${field}"[^>]*)(>)`);
      body = body.replace(pattern, `$1 aria-invalid="true" aria-describedby="${id}"$2<p class="field-error" id="${id}">${escapeHTML(message)}</p>`);
    }
  }
  return body;
}

async function persist(env, record) {
  if (!env.INQUIRIES?.put) throw new Error("INQUIRIES binding is unavailable");
  const key = `${record.kind}/${new Date().toISOString()}/${crypto.randomUUID()}`;
  await env.INQUIRIES.put(key, JSON.stringify({ ...record, received_at: new Date().toISOString() }));
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && pageMap.has(url.pathname)) {
      if (url.pathname === "/menu" && url.searchParams.has("course")) {
        const slug = url.searchParams.get("course").replace(/[^a-z-]/g, "");
        return assetAt(request, env, `/generated/pages/menu-course-${slug}.html`);
      }
      if (url.pathname === "/private-dining" && url.searchParams.has("service")) {
        const slug = url.searchParams.get("service").replace(/[^a-z-]/g, "");
        return assetAt(request, env, `/generated/pages/private-service-${slug}.html`);
      }
      if (url.pathname === "/reservations") {
        const response = await assetAt(request, env, pageMap.get(url.pathname));
        return html(stampForm(await response.text()), response.status);
      }
      return assetAt(request, env, pageMap.get(url.pathname));
    }

    if (request.method === "GET" && url.pathname === "/fragments/reservation-form") {
      const response = await assetAt(request, env, "/generated/fragments/reservation-form.html");
      return html(stampForm(await response.text()), response.status);
    }

    if (request.method === "GET" && url.pathname.startsWith("/fragments/menu/")) {
      const slug = url.pathname.split("/").at(-1);
      return assetAt(request, env, `/generated/fragments/menu/${slug}.html`);
    }

    if (request.method === "GET" && url.pathname.startsWith("/fragments/private-dining/")) {
      const slug = url.pathname.split("/").at(-1);
      return assetAt(request, env, `/generated/fragments/private-dining/${slug}.html`);
    }

    if (request.method === "POST" && ["/inquiries/reservation", "/inquiries/private-dining"].includes(url.pathname)) {
      const form = await request.formData();
      const errors = validate(form);
      if (errors.length) {
        const template = await assetAt(request, env, "/generated/fragments/reservation-form.html");
        const status = request.headers.get("HX-Request") === "true" ? 200 : 422;
        return html(retainForm(stampForm(await template.text()), form, errors), status);
      }
      const inquiry = {};
      for (const field of ["name", "email", "telephone", "preferred_date", "alternate_date", "guest_count", "service_type", "location", "dietary", "accessibility", "occasion", "message"]) inquiry[field] = String(form.get(field) || "");
      try {
        await persist(env, { kind: "reservation", inquiry });
      } catch {
        const template = await assetAt(request, env, "/generated/fragments/reservation-form.html");
        const persistenceErrors = [["form", "We could not save your request. Your entries are still here; please try again."]];
        const status = request.headers.get("HX-Request") === "true" ? 200 : 503;
        return html(retainForm(stampForm(await template.text()), form, persistenceErrors), status);
      }
      const name = escapeHTML(form.get("name"));
      return html(`<section class="form-success" role="status" tabindex="-1" data-focus-on-swap><p class="kicker">Request received</p><h2>Thank you, ${name}.</h2><p>Your inquiry has reached the pass. It remains subject to availability; a reply will discuss fit, practical details, and possible next steps.</p><a class="text-link" href="/">Return to Esker →</a></section>`);
    }

    if (request.method === "POST" && url.pathname === "/newsletter") {
      const form = await request.formData();
      if (!form.get("email")?.includes("@")) return html(`<p class="form-note form-note--error" role="alert">Enter a valid email address.</p>`, request.headers.get("HX-Request") === "true" ? 200 : 422);
      try {
        await persist(env, { kind: "newsletter", email: String(form.get("email")).trim() });
      } catch {
        return html(`<p class="form-note form-note--error" role="alert">We could not save that address. Please try again.</p>`, request.headers.get("HX-Request") === "true" ? 200 : 503);
      }
      return html(`<p class="form-note" role="status" tabindex="-1" data-focus-on-swap>Thank you. Seasonal notes will arrive occasionally.</p>`);
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
