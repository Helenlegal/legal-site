/* ============================================================
 * app.js — 站点交互 + 自助下单 / 生成 / 下载 / 订单管理
 * ============================================================ */

/* ---------- 可配置项（接入真实业务时改这里） ---------- */
const CONFIG = {
  // 微信支付（收款码模式）：二选一配置即可显示真实收款码
  //   1) 代码写死：qrImageUrl 填图片地址，enabled 设 true
  //   2) 自助配置：访问 index.html#setqr=图片地址（存浏览器本地，免改代码免部署）
  // 仅收款码模式只需一张收款码图片；mch_id/API 密钥等留待后续做付款自动校验时再用
  wechatPay: {
    enabled: false,          // 改为 true 后显示真实收款码（配合 qrImageUrl）
    qrImageUrl: '',           // 例：'https://your-cdn.com/wxpay.png'
    payUrl: '',               // 例：JSAPI / H5 支付链接
  },
  // 订单 webhook：创建订单后自动 POST 到该地址，方便你/AI 接收履约通知
  orderWebhook: '',           // 例：'https://your-server.com/api/orders'
};

const ORDERS_KEY = 'fj_orders';

/* ---------- 工具 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function loadOrders() { try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch (e) { return []; } }
function saveOrders(list) { localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); }
function uid() { return 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}
function money(n) { return '¥' + Number(n || 0).toLocaleString('zh-CN'); }

/* ---------- 渲染目录 ---------- */
function renderCatalog() {
  const root = $('#catalog-root');
  if (!root) return;
  root.innerHTML = CATEGORIES.map(cat => {
    const items = PRODUCTS.filter(p => p.category === cat.id);
    const cards = items.map(p => `
      <div class="card">
        <h4>${esc(p.name)}</h4>
        <div class="tagline">${esc(p.tagline)}</div>
        <ul class="includes">${p.includes.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        <div class="price">${money(p.price)} <small>/ 份</small></div>
        <button class="btn btn-primary btn-block buy" data-product="${p.id}">立即下单</button>
      </div>`).join('');
    return `
      <div class="cat-block">
        <div class="cat-head">
          <span class="ico">${cat.icon}</span>
          <h3>${cat.name}</h3>
          <span class="desc">${cat.desc}</span>
        </div>
        <div class="cards">${cards}</div>
      </div>`;
  }).join('');

  $$('.buy', root).forEach(b => b.addEventListener('click', () => openFlow(b.dataset.product)));
}

/* ---------- 流程状态 ---------- */
const state = { step: 'pay', product: null, orderId: null, answers: {} };

function openFlow(productId, prefill) {
  state.product = getProduct(productId);
  state.orderId = null;
  state.answers = prefill ? JSON.parse(JSON.stringify(prefill)) : {};
  state.step = 'pay';
  $('#flowModal').hidden = false;
  document.body.style.overflow = 'hidden';
  renderPay();
}
function closeFlow() {
  $('#flowModal').hidden = true;
  document.body.style.overflow = '';
}

/* ---------- 微信收款码配置（代码配置 + 本地自服务覆盖） ---------- */
// 优先级：CONFIG.wechatPay.qrImageUrl > localStorage('fj_wxpay_qr')
// 自助配置：浏览器访问 index.html#setqr=图片地址 即可设置/更新收款码（无需改代码）
function loadWxQr() {
  return CONFIG.wechatPay.qrImageUrl || localStorage.getItem('fj_wxpay_qr') || '';
}
function applyQrFromHash() {
  const m = location.hash.match(/setqr=([^&]+)/);
  if (m) {
    const url = decodeURIComponent(m[1]);
    localStorage.setItem('fj_wxpay_qr', url);
    location.hash = '';
    toast('微信收款码已更新');
  }
}

/* ---------- Step 1：支付 ---------- */
function renderPay() {
  const p = state.product;
  const wp = CONFIG.wechatPay;
  const qrUrl = loadWxQr();
  const wpOn = wp.enabled || !!qrUrl;
  const qr = qrUrl
    ? `<img src="${esc(qrUrl)}" alt="微信支付二维码" style="width:180px;height:180px;object-fit:contain;border-radius:8px">`
    : `<div>演示收款码<br>（接入微信支付商户号后显示真实二维码）</div>`;
  const payLink = (wp.enabled && wp.payUrl) ? `<a href="${esc(wp.payUrl)}" target="_blank" class="btn btn-primary">前往微信支付</a>` : '';
  $('#flowContent').innerHTML = `
    <div class="stepper">
      <div class="s active">1 · 支付</div>
      <div class="s">2 · 填问卷</div>
      <div class="s">3 · 生成</div>
    </div>
    <h2>${esc(p.name)}</h2>
    <div class="sub">确认服务并支付后，即可填写问卷生成文书。</div>
    <div class="pay-box">
      <div style="font-weight:700;font-size:18px">应付：${money(p.price)}</div>
      <div class="pay-qr">${qr}</div>
      <div class="pay-note">请打开微信「扫一扫」，支付上方「应付金额」${wpOn ? '' : '（当前为演示模式）'}</div>
      <div class="pay-toggle">
        ${payLink}
        <button class="btn btn-primary" id="paidBtn">我已完成支付，继续</button>
      </div>
    </div>
    <p class="pay-note" style="margin-top:10px">${wpOn
      ? '付款后请在微信支付账单中核对金额与商户名称；点击上方按钮即可生成文书（收款码模式为手动确认，建议定期在商户后台核对到账）。'
      : '提示：演示模式下点击上方按钮即可继续体验完整流程；正式环境请在微信支付商户后台核对到账。'}</p>
  `;
  $('#paidBtn').addEventListener('click', onPaid);
}

function onPaid() {
  const p = state.product;
  const order = {
    id: uid(), productId: p.id, productName: p.name, price: p.price,
    paid: true, createdAt: new Date().toISOString(), answers: null, docHTML: null,
  };
  const list = loadOrders(); list.unshift(order); saveOrders(list);
  state.orderId = order.id;
  notifyWebhook(order);
  state.step = 'form';
  renderForm();
}

function notifyWebhook(order) {
  if (!CONFIG.orderWebhook) return;
  try {
    fetch(CONFIG.orderWebhook, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'order_created', order }),
    }).catch(() => {});
  } catch (e) {}
}

/* ---------- Step 2：问卷 ---------- */
function renderForm() {
  const p = state.product;
  $('#flowContent').innerHTML = `
    <div class="stepper">
      <div class="s done">1 · 支付</div>
      <div class="s active">2 · 填问卷</div>
      <div class="s">3 · 生成</div>
    </div>
    <h2>填写信息 · ${esc(p.name)}</h2>
    <div class="sub">信息仅用于生成你的文书，请如实填写。</div>
    <form id="qForm">${p.questions.map(renderQuestion).join('')}</form>
    <div class="preview-actions">
      <button class="btn btn-ghost" id="backPay">返回</button>
      <button class="btn btn-primary" id="genBtn">生成文书</button>
    </div>
  `;
  $('#backPay').addEventListener('click', renderPay);
  $('#genBtn').addEventListener('click', onSubmitForm);
}

function renderQuestion(q) {
  const v = state.answers[q.id];
  if (q.type === 'group') {
    const rows = (Array.isArray(v) && v.length ? v : [{}]).map(row => groupRowHtml(q, row)).join('');
    return `<div class="field" data-qid="${q.id}" data-type="group">
      <label>${esc(q.label)}</label>
      <div class="group-rows" data-group="${q.id}">${rows}</div>
      <button type="button" class="group-add" data-add="${q.id}">+ 添加一行</button>
    </div>`;
  }
  if (q.type === 'textarea') {
    return `<div class="field" data-qid="${q.id}">
      <label>${esc(q.label)}</label>
      <textarea data-qid="${q.id}" placeholder="${esc(q.placeholder || '')}">${esc(v || '')}</textarea>
      <div class="errmsg">请填写此项</div></div>`;
  }
  if (q.type === 'select') {
    const opts = ['<option value="">请选择</option>'].concat(q.options.map(o =>
      `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`)).join('');
    return `<div class="field" data-qid="${q.id}">
      <label>${esc(q.label)}</label>
      <select data-qid="${q.id}">${opts}</select>
      <div class="errmsg">请选择</div></div>`;
  }
  if (q.type === 'checkboxes') {
    const arr = Array.isArray(v) ? v : [];
    const boxes = q.options.map(o => `
      <label class="check-item"><input type="checkbox" value="${esc(o)}" data-qid="${q.id}" ${arr.includes(o) ? 'checked' : ''}> ${esc(o)}</label>`).join('');
    return `<div class="field" data-qid="${q.id}" data-type="checkboxes">
      <label>${esc(q.label)}</label>${boxes}
      <div class="errmsg">请至少选择一项</div></div>`;
  }
  // text / number
  return `<div class="field" data-qid="${q.id}">
    <label>${esc(q.label)}</label>
    <input type="${q.type === 'number' ? 'number' : 'text'}" data-qid="${q.id}" value="${esc(v || '')}" placeholder="${esc(q.placeholder || '')}">
    <div class="errmsg">请填写此项</div></div>`;
}

function groupRowHtml(q, row) {
  const cells = q.fields.map(f => {
    const val = row && row[f.key] != null ? row[f.key] : '';
    return `<div class="field"><input type="${f.type === 'number' ? 'number' : 'text'}"
      data-key="${f.key}" placeholder="${esc(f.label)}" value="${esc(val)}"></div>`;
  }).join('');
  return `<div class="group-row" data-row>${cells}<button type="button" class="del" data-del="1">×</button></div>`;
}

/* 事件委托：动态增删「股东/创始人」分组行，只绑定一次，避免重复 */
function setupGroupDelegation() {
  const box = $('#flowContent');
  if (!box || box._groupBound) return;
  box._groupBound = true;
  box.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const id = add.dataset.add;
      const q = state.product && state.product.questions.find(x => x.id === id);
      if (!q) return;
      const wrap = $(`.group-rows[data-group="${id}"]`);
      if (wrap) wrap.insertAdjacentHTML('beforeend', groupRowHtml(q, {}));
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      const row = del.closest('[data-row]');
      if (row) row.remove();
    }
  });
}

function collectAnswers() {
  const out = {};
  state.product.questions.forEach(q => {
    if (q.type === 'group') {
      const rows = $$('.group-rows[data-group="' + q.id + '"] [data-row]').map(r => {
        const obj = {};
        q.fields.forEach(f => { obj[f.key] = $(`[data-key="${f.key}"]`, r).value.trim(); });
        return obj;
      }).filter(r => q.fields.some(f => r[f.key]));
      out[q.id] = rows;
    } else if (q.type === 'checkboxes') {
      out[q.id] = $$(`input[data-qid="${q.id}"]:checked`).map(i => i.value);
    } else {
      const el = controlOf(q.id);
      out[q.id] = el ? el.value.trim() : '';
    }
  });
  return out;
}

/* 取某问题的真实控件（避免选到外层 .field 容器 div） */
function controlOf(qid) {
  return $(`input[data-qid="${qid}"], textarea[data-qid="${qid}"], select[data-qid="${qid}"]`);
}

function validate() {
  let ok = true;
  $$('.field').forEach(f => f.classList.remove('err'));
  state.product.questions.forEach(q => {
    if (q.type === 'group') {
      const rows = $$('.group-rows[data-group="' + q.id + '"] [data-row]');
      if (!rows.length) { markErr(q.id); ok = false; }
    } else if (q.type === 'checkboxes') {
      if (!$$(`input[data-qid="${q.id}"]:checked`).length) { markErr(q.id); ok = false; }
    } else {
      const el = controlOf(q.id);
      if (!el || !String(el.value).trim()) { markErr(q.id); ok = false; }
    }
  });
  return ok;
}
function markErr(qid) {
  const f = $(`.field[data-qid="${qid}"]`);
  if (f) f.classList.add('err');
}

function onSubmitForm() {
  if (!validate()) { toast('请完整填写带 * 的必填项'); return; }
  state.answers = collectAnswers();
  const docHTML = state.product.generate(state.answers);
  // 更新订单
  const list = loadOrders();
  const order = list.find(o => o.id === state.orderId);
  if (order) { order.answers = state.answers; order.docHTML = docHTML; order.updatedAt = new Date().toISOString(); saveOrders(list); }
  state.step = 'preview';
  renderPreview(docHTML);
}

/* ---------- Step 3：预览 + 下载 ---------- */
function renderPreview(docHTML) {
  const p = state.product;
  $('#flowContent').innerHTML = `
    <div class="stepper">
      <div class="s done">1 · 支付</div>
      <div class="s done">2 · 填问卷</div>
      <div class="s active">3 · 生成</div>
    </div>
    <h2>文书已生成 · ${esc(p.name)}</h2>
    <div class="sub">确认内容无误后，下载为 Word 文档即可使用。</div>
    <div class="preview-doc" id="docView">${docHTML}</div>
    <div class="preview-actions">
      <button class="btn btn-ghost" id="editBtn">返回修改</button>
      <button class="btn btn-ghost" id="printBtn">打印 / 存 PDF</button>
      <button class="btn btn-primary" id="dlBtn">下载 Word 文档</button>
    </div>
  `;
  $('#editBtn').addEventListener('click', renderForm);
  $('#dlBtn').addEventListener('click', () => downloadDoc(fileName(p), docHTML));
  $('#printBtn').addEventListener('click', () => printDoc(docHTML));
}

function fileName(p) {
  const a = state.answers || {};
  const name = (a.companyName || a.appName || a.partyA || p.name).toString().replace(/[\\/:*?"<>|]/g, '');
  return `${name}_${p.name}`;
}

function downloadDoc(name, html) {
  const head = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>';
  const blob = new Blob(['﻿' + head + html + '</body></html>'], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name + '.doc';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('已开始下载 Word 文档');
}

function printDoc(html) {
  const w = window.open('', '_blank');
  if (!w) { toast('请允许弹出窗口以打印'); return; }
  w.document.write('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>打印</title></head><body>' + html + '</body></html>');
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

/* ---------- 订单管理视图 ---------- */
function openOrders() {
  const list = loadOrders();
  const cards = list.length ? list.map(o => {
    const p = getProduct(o.productId);
    const canRedownload = o.docHTML;
    return `<div class="order-card">
      <div class="top">
        <h4>${esc(o.productName)}</h4>
        <span class="tag-paid">已支付</span>
      </div>
      <div class="meta">订单号 ${o.id} · ${new Date(o.createdAt).toLocaleString('zh-CN')} · ${money(o.price)}</div>
      <div class="acts">
        ${canRedownload ? `<button class="btn btn-primary btn-sm" data-dl="${o.id}">下载文书</button>` : `<button class="btn btn-ghost btn-sm" data-redo="${o.id}">去填写生成</button>`}
      </div>
    </div>`;
  }).join('') : `<p style="color:#5b6b7c">还没有订单。去 <a href="#catalog" style="color:#1f5fbf">服务目录</a> 下一单吧。</p>`;

  $('#flowModal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('#flowContent').innerHTML = `
    <h2>我的订单</h2>
    <div class="sub">已购订单会自动保存，随时可重新生成或下载文书。</div>
    <div class="orders-wrap" style="padding:0">${cards}</div>
    <div class="preview-actions"><button class="btn btn-ghost" id="closeOrders">关闭</button></div>
  `;
  $('#closeOrders').addEventListener('click', closeFlow);
  $$('[data-dl]').forEach(b => b.addEventListener('click', () => {
    const o = loadOrders().find(x => x.id === b.dataset.dl);
    if (o && o.docHTML) downloadDoc(fileName(getProduct(o.productId)), o.docHTML);
  }));
  $$('[data-redo]').forEach(b => b.addEventListener('click', () => {
    const o = loadOrders().find(x => x.id === b.dataset.redo);
    if (o) { closeFlow(); openFlow(o.productId); }
  }));
}

/* ---------- 事件绑定 ---------- */
$('#flowClose').addEventListener('click', closeFlow);
$('#flowModal').addEventListener('click', e => { if (e.target === $('#flowModal')) closeFlow(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#flowModal').hidden) closeFlow(); });
$('#ordersLink').addEventListener('click', e => { e.preventDefault(); openOrders(); });

setupGroupDelegation();
applyQrFromHash();
renderCatalog();
