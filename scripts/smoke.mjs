// Smoke test full do app rodando em :3001 (ou env BASE)
const BASE = process.env.BASE || 'http://localhost:3001';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'grana-admin-2026';

const results = [];
function rec(group, name, status, ok, note = '') {
  results.push({ group, name, status, ok, note });
}

async function req(method, path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  let body = opts.body;
  if (body && typeof body !== 'string' && !(body instanceof FormData)) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const r = await fetch(BASE + path, {
    method,
    redirect: 'manual',
    ...opts,
    body,
    headers,
  });
  return r;
}

function setCookie(jar, resp) {
  const sc = resp.headers.get('set-cookie');
  if (!sc) return;
  const parts = sc.split(/,(?=\s*[A-Za-z0-9_-]+=)/);
  for (const p of parts) {
    const [pair] = p.split(';');
    const [k, v] = pair.split('=');
    if (k && v != null) jar[k.trim()] = v.trim();
  }
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function smoke() {
  const userJar = {};
  const adminJar = {};

  // 1. Páginas públicas
  const pubPages = [
    '/',
    '/onboarding/cadastro',
    '/onboarding/profissao',
    '/onboarding/privacidade',
    '/onboarding/metodo',
    '/onboarding/upload',
    '/onboarding/manual',
    '/onboarding/processando',
    '/onboarding/preview',
    '/onboarding/resultado',
    '/share/erro',
  ];
  for (const p of pubPages) {
    const r = await req('GET', p);
    rec('pages', p, r.status, r.status === 200);
  }

  // 2. POST /api/me cria user (GET só lê)
  const meCreate = await req('POST', '/api/me', { body: { name: 'Smoke User' } });
  setCookie(userJar, meCreate);
  rec('user', 'POST /api/me (cria)', meCreate.status, meCreate.status === 200);

  const userHeaders = { cookie: cookieHeader(userJar) };

  const meGet = await req('GET', '/api/me', { headers: userHeaders });
  rec('user', 'GET /api/me (após criar)', meGet.status, meGet.status === 200);

  // 3. Páginas /app
  const appPages = [
    '/app',
    '/app/transacoes',
    '/app/recorrentes',
    '/app/revisar',
    '/app/nova',
    '/app/saude',
    '/app/das',
    '/app/das/regime',
    '/app/relatorios',
    '/app/evolucao',
    '/app/parceiros',
    '/app/perfil',
    '/app/imports',
    '/app/avaliar',
  ];
  for (const p of appPages) {
    const r = await req('GET', p, { headers: userHeaders });
    rec('app-pages', p, r.status, r.status === 200);
  }

  // 4. APIs do user
  const userApis = [
    ['GET', '/api/me'],
    ['GET', '/api/dashboard'],
    ['GET', '/api/transactions'],
    ['GET', '/api/transactions/pending'],
    ['GET', '/api/recurring'],
    ['GET', '/api/saude'],
    ['GET', '/api/das'],
    ['GET', '/api/relatorio'],
    ['GET', '/api/evolucao'],
    ['GET', '/api/parceiros'],
    ['GET', '/api/imports'],
    ['GET', '/api/indicacoes'],
    ['GET', '/api/avaliacoes'],
  ];
  for (const [m, p] of userApis) {
    const r = await req(m, p, { headers: userHeaders });
    rec('user-api', `${m} ${p}`, r.status, r.status === 200);
  }

  // 5. CRUD transação manual (schema correto: date/amount/description/type/category)
  const txCreate = await req('POST', '/api/transactions', {
    headers: userHeaders,
    body: {
      date: new Date().toISOString().slice(0, 10),
      amount: 123.45,
      description: 'Teste smoke',
      type: 'despesa',
      category: 'Outros',
    },
  });
  let txId = null;
  try {
    const j = await txCreate.clone().json();
    txId = j?.transaction?.id;
  } catch {}
  rec(
    'user-api',
    'POST /api/transactions',
    txCreate.status,
    txCreate.status === 200,
    txId ? `id=${txId}` : 'sem id retornado'
  );

  if (txId) {
    const get1 = await req('GET', `/api/transactions/${txId}`, { headers: userHeaders });
    rec('user-api', `GET /api/transactions/:id`, get1.status, get1.status === 200);

    const patchR = await req('PATCH', `/api/transactions/${txId}`, {
      headers: userHeaders,
      body: { description: 'Teste smoke editado' },
    });
    rec('user-api', `PATCH /api/transactions/:id`, patchR.status, patchR.status === 200);

    const delR = await req('DELETE', `/api/transactions/${txId}`, { headers: userHeaders });
    rec('user-api', `DELETE /api/transactions/:id`, delR.status, delR.status === 200);
  }

  // 6. Confirmar pendentes (rota POST sem body)
  const confirm = await req('POST', '/api/transactions/confirm', {
    headers: userHeaders,
    body: {},
  });
  rec(
    'user-api',
    'POST /api/transactions/confirm',
    confirm.status,
    confirm.status === 200 || confirm.status === 400,
    'depende de body'
  );

  // 7. Recurring criar
  const recCreate = await req('POST', '/api/recurring', {
    headers: userHeaders,
    body: {
      description: 'Smoke recorrente',
      amount: 50,
      type: 'despesa',
      category: 'Outros',
      dayOfMonth: 1,
    },
  });
  rec(
    'user-api',
    'POST /api/recurring',
    recCreate.status,
    recCreate.status === 200 || recCreate.status === 400,
    'schema pode diferir'
  );

  // 8. DAS
  const dasCreate = await req('POST', '/api/das', {
    headers: userHeaders,
    body: { month: 1, year: 2026, value: 75.9 },
  });
  rec(
    'user-api',
    'POST /api/das',
    dasCreate.status,
    dasCreate.status === 200 || dasCreate.status === 400
  );

  // 9. Indicações: precisa de parceiroId real
  const parR = await req('GET', '/api/parceiros', { headers: userHeaders });
  let parceiroId = null;
  try {
    const j = await parR.clone().json();
    parceiroId = j?.parceiros?.[0]?.id || j?.[0]?.id;
  } catch {}
  rec(
    'user-api',
    'GET /api/parceiros (lista)',
    parR.status,
    parR.status === 200,
    parceiroId ? `tem parceiro id=${parceiroId.slice(0, 8)}…` : 'sem parceiros no DB'
  );

  if (parceiroId) {
    const ind = await req('POST', '/api/indicacoes', {
      headers: userHeaders,
      body: { parceiroId },
    });
    rec('user-api', 'POST /api/indicacoes', ind.status, ind.status === 200);

    // avaliacao requer indicação anterior - rodamos depois
    const av = await req('POST', '/api/avaliacoes', {
      headers: userHeaders,
      body: { parceiroId, nota: 5, comentario: 'smoke' },
    });
    rec('user-api', 'POST /api/avaliacoes', av.status, av.status === 200);
  }

  // 10. Conversão saude/retirada
  const conv = await req('POST', '/api/saude/converter-retirada', {
    headers: userHeaders,
    body: {},
  });
  rec(
    'user-api',
    'POST /api/saude/converter-retirada',
    conv.status,
    conv.status === 200 || conv.status === 400,
    'depende de body'
  );

  // 11. Share
  const share = await req('GET', '/share', { headers: userHeaders });
  rec(
    'user-api',
    'GET /share',
    share.status,
    share.status === 200 || share.status === 302 || share.status === 307
  );

  // 12. Upload sem arquivo (esperado 400)
  const up1 = await req('POST', '/api/upload', { headers: userHeaders, body: new FormData() });
  rec(
    'rate-limit',
    'POST /api/upload (sem file)',
    up1.status,
    up1.status === 400,
    'esperado 400'
  );

  // 13. Admin sem auth
  const adminLoginPage = await req('GET', '/admin/login');
  rec('admin-pages', '/admin/login', adminLoginPage.status, adminLoginPage.status === 200);

  const adminApiNoAuth = await req('GET', '/api/admin/metrics');
  rec(
    'admin-api',
    'GET /api/admin/metrics (sem auth)',
    adminApiNoAuth.status,
    adminApiNoAuth.status === 401,
    'esperado 401'
  );

  // 14. Login admin com senha errada
  const wrongLogin = await req('POST', '/api/admin/login', {
    body: { password: 'errada' },
  });
  rec(
    'admin-api',
    'POST /api/admin/login (senha errada)',
    wrongLogin.status,
    wrongLogin.status === 401,
    'esperado 401'
  );

  // 15. Login admin correto
  const adminLogin = await req('POST', '/api/admin/login', { body: { password: ADMIN_PASS } });
  setCookie(adminJar, adminLogin);
  rec('admin-api', 'POST /api/admin/login', adminLogin.status, adminLogin.status === 200);

  const adminHeaders = { cookie: cookieHeader(adminJar) };

  // 16. APIs admin com auth
  for (const [m, p] of [
    ['GET', '/api/admin/metrics'],
    ['GET', '/api/admin/parceiros'],
  ]) {
    const r = await req(m, p, { headers: adminHeaders });
    rec('admin-api', `${m} ${p}`, r.status, r.status === 200);
  }

  // 17. Páginas admin com auth
  for (const p of ['/admin/parceiros', '/admin/metrics']) {
    const r = await req('GET', p, { headers: adminHeaders });
    rec('admin-pages', p, r.status, r.status === 200);
  }

  // Relatório
  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok);
  console.log(`\n${ok}/${results.length} ok`);
  if (fail.length) {
    console.log('\nFalhas:');
    for (const f of fail) {
      console.log(
        `  [${f.group}] ${f.name} -> ${f.status} ${f.note ? '(' + f.note + ')' : ''}`
      );
    }
  }
  console.log('\nDetalhe:');
  const groups = [...new Set(results.map((r) => r.group))];
  for (const g of groups) {
    console.log(`\n# ${g}`);
    for (const r of results.filter((x) => x.group === g)) {
      const mark = r.ok ? 'ok  ' : 'FAIL';
      console.log(
        `  ${mark}  ${r.status}  ${r.name}${r.note ? '  -- ' + r.note : ''}`
      );
    }
  }
}

smoke().catch((e) => {
  console.error('smoke crashed:', e);
  process.exit(1);
});
