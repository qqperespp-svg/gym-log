/* E2E test of the GYMRAT auth flow against a running instance. */
const BASE = process.argv[2]?.replace(/\/$/, "");
if (!BASE) {
  console.error("usage: node e2e-auth.mjs <base-url>");
  process.exit(1);
}

function decodeEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function getPage(path, cookie) {
  const res = await fetch(BASE + path, { headers: cookie ? { cookie } : {} });
  const html = await res.text();
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { status: res.status, html, setCookies, location: res.headers.get("location") };
}

function extractForms(html) {
  const forms = [];
  const parts = html.split(/<form\b/).slice(1);
  for (const part of parts) {
    const end = part.indexOf("</form>");
    const markup = (end === -1 ? part : part.slice(0, end));
    const fields = {};
    for (const [, name, value] of [...markup.matchAll(/<input type="hidden" name="(\$ACTION[^"]*)"(?: value="([^"]*)")?/g)]) {
      fields[name] = decodeEntities(value ?? "");
    }
    forms.push({ markup, fields });
  }
  return forms;
}

function formWith(html, predicate) {
  return extractForms(html).find((f) => predicate(f.markup)) ?? { markup: "", fields: {} };
}

function sessionCookie(setCookies) {
  const session = setCookies.find((c) => c.toLowerCase().startsWith("gl_session="));
  return session ? session.split(";")[0] : "";
}

async function submitForm(path, payload, actionFields, cookie) {
  const fd = new FormData();
  // Wszystkie ukryte pola akcji ($ACTION_REF, $ACTION_1:0, $ACTION_1:1, $ACTION_KEY)
  for (const [k, v] of Object.entries(actionFields)) fd.append(k, v);
  for (const [k, v] of Object.entries(payload)) fd.append(k, v);
  const res = await fetch(BASE + path, {
    method: "POST",
    body: fd,
    redirect: "manual",
    headers: { origin: BASE, ...(cookie ? { cookie } : {}) },
  });
  const body = await res.text();
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { status: res.status, body, setCookies, location: res.headers.get("location") };
}

const results = [];
const check = (label, ok, detail = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}: ${label}${detail ? " — " + detail : ""}`);
};

// 1. Login page renders
let page = await getPage("/login");
check("GET /login renders", page.status === 200 && page.html.includes("Zaloguj się"), `status=${page.status}`);

// 2. Register a brand-new account through the real server action
page = await getPage("/register");
const regForm = formWith(page.html, (m) => m.includes('name="email"'));
const email = `e2e.user${Date.now()}@example.com`;
const password = "tajne-haslo-123";
const reg = await submitForm("/register", {
  name: "E2E Tester",
  email,
  password,
}, regForm.fields);
check("register redirects to /dashboard", /dashboard/.test(reg.location ?? ""), `status=${reg.status}`);
const regCookie = sessionCookie(reg.setCookies);
check("register sets session cookie", Boolean(regCookie));

// 3. Dashboard accessible with session
page = await getPage("/dashboard", regCookie);
check("GET /dashboard with session", page.status === 200 && page.html.includes("E2E Tester"), `status=${page.status}`);

// 4. Logout via server action
page = await getPage("/dashboard", regCookie);
const logoutForm = formWith(page.html, (m) => m.includes("Wyloguj"));
const out = await submitForm("/dashboard", {}, logoutForm.fields, regCookie);
check("logout redirects to /login", /login/.test(out.location ?? ""), `status=${out.status}`);

// 5. Wrong password on existing account shows error (brak sesji po wylogowaniu)
page = await getPage("/login");
const badForm = formWith(page.html, (m) => m.includes('name="email"'));
const bad = await submitForm("/login", {
  email,
  password: "zle-haslo-999",
}, badForm.fields);
check(
  "wrong password is rejected",
  !/dashboard/.test(bad.location ?? "") &&
    (bad.body.includes("Nieprawidłowe hasło") || /login/.test(bad.location ?? "")),
  `status=${bad.status} location=${bad.location ?? "-"}`,
);

// 6. Correct password on the EXISTING account logs in
page = await getPage("/login");
const goodForm = formWith(page.html, (m) => m.includes('name="email"'));
const good = await submitForm("/login", {
  email,
  password,
}, goodForm.fields);
check("login redirects to /dashboard", /dashboard/.test(good.location ?? ""), `status=${good.status}`);
const loginCookie = sessionCookie(good.setCookies);
check("login sets session cookie", Boolean(loginCookie));

// 7. Dashboard accessible after login on existing account
page = await getPage("/dashboard", loginCookie);
check("dashboard after login shows user", page.status === 200 && page.html.includes("E2E Tester"), `status=${page.status}`);

// 8. Demo account button present
page = await getPage("/login");
check("login page offers demo account", page.html.includes("demo@gymrat.pl"));

// 9. Password reset flow reachable
page = await getPage("/forgot-password");
check("GET /forgot-password renders", page.status === 200 && page.html.includes("reset"), `status=${page.status}`);

console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
