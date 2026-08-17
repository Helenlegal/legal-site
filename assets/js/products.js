/* ============================================================
 * products.js — 法律服务产品数据层 + 文书模板引擎
 * 每个产品包含：元信息、questions（驱动问卷）、generate(answers)（返回 HTML 文书）
 * 文书标准：参考国内红圈所（君合/方达/金杜/中伦/海问/竞天公诚/环球/通商等）
 *           常用交易文件结构，并结合 2024 新《公司法》《民法典》《个保法》
 *           等现行法。所有文书均标注「示范文本」，须经执业律师审阅定稿。
 * 约定：generate 统一用「块体」写法 => { ... return `...`; }
 * ============================================================ */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function todayCN() {
  const d = new Date();
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}
function moneyCN(wan) {
  const n = Number(wan) || 0;
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}
function moneyYuan(y) {
  const n = Number(y) || 0;
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}
function foundersClause(founders, regCapital) {
  if (!Array.isArray(founders) || !founders.length) return '（未填写股东信息）';
  return founders.map((f, i) => {
    const ratio = Number(f.ratio) || 0;
    const amt = (Number(regCapital) * ratio / 100).toFixed(2);
    const role = f.role ? '（' + esc(f.role) + '）' : '';
    return '        ' + (i + 1) + '. ' + esc(f.name) + role + '：认缴出资额人民币 ' + moneyCN(amt) + ' 万元，占注册资本 ' + ratio + '%；';
  }).join('\n');
}
/* 示范文本注记（每份文书统一附） */
function docFoot() {
  return '<p style="margin-top:36px;color:#999;font-size:12px">注：本文件系依据市场通用交易文本（参考国内一线律师事务所常用结构）生成的<b>示范文本</b>，仅供起草参考，不构成法律意见；须由具备资质的执业律师结合交易实际情况审阅、修订并定稿后使用。</p>';
}
/* 境内仲裁条款（CIETAC） */
function arbCIETAC() {
  return '因本协议引起的或与本协议有关的任何争议，双方应首先友好协商解决；协商不成的，任何一方均有权将争议提交中国国际经济贸易仲裁委员会（CIETAC），按照该会届时有效的仲裁规则在北京进行仲裁。仲裁裁决是终局的，对双方均有约束力。';
}
/* 涉外仲裁条款（按适用法映射机构） */
function arbIntl(law) {
  const l = esc(law || '');
  let inst = '中国国际经济贸易仲裁委员会（CIETAC）';
  let seat = '北京';
  if (l.indexOf('香港') >= 0) { inst = '香港国际仲裁中心（HKIAC）'; seat = '香港'; }
  else if (l.indexOf('新加坡') >= 0) { inst = '新加坡国际仲裁中心（SIAC）'; seat = '新加坡'; }
  else if (l.indexOf('英国') >= 0 || l.indexOf('美国') >= 0) { inst = '国际商会国际仲裁院（ICC）'; seat = '香港'; }
  return '因本协议引起的或与本协议有关的任何争议，均应提交 ' + inst + '，按照该机构届时有效的仲裁规则在 ' + seat + ' 仲裁解决。仲裁语言为中文（及英文，如适用）。仲裁裁决是终局的，对双方均有约束力。';
}

const CATEGORIES = [
  { id: 'equity',    name: '公司注册与股权', icon: '🏛️', desc: '从 0 到 1 把公司的「地基」打牢' },
  { id: 'financing', name: '融资文件',       icon: '💰', desc: '拿融资前必须有的专业条款清单与协议' },
  { id: 'ip',        name: 'IP 与合规',      icon: '🛡️', desc: '保密、隐私、知识产权一站式合规' },
  { id: 'overseas',  name: '出海合规',       icon: '🌏', desc: '跨境投融资、数据与海外实体的专业文书' },
  { id: 'labor',     name: '劳动与期权',     icon: '🤝', desc: '劳动合同、保密竞业与 ESOP 留人方案' },
];

const PRODUCTS = [
  /* ============ 公司注册与股权 ============ */
  {
    id: 'articles',
    category: 'equity',
    name: '有限责任公司章程（定制版）',
    price: 299,
    tagline: '贴合你的股权结构与治理需求，工商局备案可用',
    includes: ['注册资本与出资安排（新公司法 5 年缴足）', '股东知情权与优先购买权', '董事 / 审计委员会设置', '分红、股权转让与回购'],
    questions: [
      { id: 'companyName', label: '公司全称', type: 'text', placeholder: '如：北京某某科技有限公司' },
      { id: 'regCapital', label: '注册资本（万元）', type: 'number', placeholder: '如：100' },
      { id: 'registeredAddress', label: '注册地址', type: 'text', placeholder: '如：北京市海淀区某某路 1 号' },
      { id: 'legalRep', label: '法定代表人姓名', type: 'text' },
      { id: 'bizScope', label: '经营范围', type: 'textarea', placeholder: '如：技术开发、技术咨询；软件开发；销售自行开发的产品…' },
      { id: 'founders', label: '股东 / 创始人', type: 'group', fields: [
        { key: 'name', label: '姓名 / 名称', type: 'text' },
        { key: 'ratio', label: '出资比例(%)', type: 'number' },
        { key: 'role', label: '职务(可选)', type: 'text' },
      ]},
      { id: 'board', label: '治理结构', type: 'select', options: ['设执行董事（1 人）', '设董事会（3 人以上）'] },
      { id: 'term', label: '营业期限', type: 'text', placeholder: '如：长期 / 20 年' },
      { id: 'profit', label: '分红方式', type: 'select', options: ['按实缴出资比例分红', '另行约定（章程写明）'] },
    ],
    generate: (a) => {
      const cn = esc(a.companyName) || '__________';
      return `
<h1 style="text-align:center">${cn}章程</h1>
<p style="text-align:center;color:#666">（${todayCN()} 制定）</p>
<p><b>第一章　总则与定义</b></p>
<p>第一条　为规范 ${cn}（以下简称「公司」）的组织和行为，保护公司、股东、职工和债权人的合法权益，依据《中华人民共和国公司法》（2023 年修订）及其他相关法律法规，制定本章程。</p>
<p>第二条　公司名称：${cn}。</p>
<p>第三条　公司住所：${esc(a.registeredAddress) || '________________'}。</p>
<p>第四条　公司经营范围：${esc(a.bizScope) || '________________'}（以登记机关核准为准）。</p>
<p>第五条　公司注册资本为人民币 ${moneyCN(a.regCapital)} 万元，由全体股东认缴。各股东应自公司成立之日起五年内缴足认缴出资（新《公司法》第四十七条）。</p>
<p>第六条　定义：本章程中「控股股东」「实际控制人」「关联关系」「高级管理人员」等术语，均按《公司法》相关定义解释。</p>
<p><b>第二章　股东与出资</b></p>
<p>第七条　公司股东及认缴出资情况如下：</p>
<pre style="white-space:pre-wrap;font-family:inherit">${foundersClause(a.founders, a.regCapital)}</pre>
<p>第八条　股东以其认缴的出资额为限对公司承担责任；公司以其全部财产对公司的债务承担责任。股东未按期足额缴纳出资的，除应向公司足额缴纳外，还应对给公司造成的损失承担赔偿责任。</p>
<p>第九条　股东权利包括：（一）按实缴出资比例分取红利；（二）依法转让股权并享有优先购买权；（三）查阅、复制公司章程、股东名册、股东会会议记录、董事会（或执行董事）决议、监事会（或监事）决议和财务会计报告，并要求查阅公司会计账簿、会计凭证（新《公司法》第五十七条）；（四）公司清算后按出资比例分配剩余财产；（五）对股东会决议行使表决权。</p>
<p>第十条　有下列情形之一的，对股东会该项决议投反对票的股东，可请求公司按合理价格收购（回购）其股权（异议股东回购请求权，新《公司法》第八十九条）：（一）公司连续五年盈利且符合分红条件但不向股东分红；（二）公司合并、分立、转让主要财产；（三）章程规定的营业期限届满或其他解散事由出现，股东会决议存续。</p>
<p><b>第三章　组织机构</b></p>
<p>第十一条　公司${esc(a.board) === '设董事会（3 人以上）' ? '设董事会，成员由股东会选举产生，董事会设董事长一人' : '设执行董事一名，由股东会选举产生'}。公司法定代表人由${esc(a.legalRep) || '________'}（执行董事或经理）担任。</p>
<p>第十二条　公司设监事（会）履行监督职责；公司亦可选择不设监事会，而由董事会下设审计委员会行使监事会职权（新《公司法》第六十九条、第八十三条）。${esc(a.board) === '设董事会（3 人以上）' ? '本次设董事会。' : '本次设执行董事，'}是否设监事由股东按本条及章程约定确定，依法可经全体股东一致同意不设监事。</p>
<p>第十三条　股东会由全体股东组成，是公司的权力机构，行使下列职权：（一）选举和更换董事、监事，决定其报酬；（二）审议批准董事会、监事会的报告；（三）审议批准年度财务预算、决算方案；（四）审议批准利润分配和弥补亏损方案；（五）对公司增加或减少注册资本、发行债券、合并、分立、解散、清算或变更公司形式作出决议；（六）修改公司章程。股东会会议由股东按出资比例行使表决权；修改章程、增减资、合并分立解散或变更公司形式，须经代表三分之二以上表决权的股东通过。</p>
<p><b>第四章　财务会计与利润分配</b></p>
<p>第十四条　公司分配当年税后利润时，应提取利润的百分之十列入法定公积金；法定公积金累计额达注册资本的百分之五十以上的，可不再提取。公司从税后利润中提取法定公积金后，经股东会决议可提取任意公积金。</p>
<p>第十五条　公司${esc(a.profit) === '按实缴出资比例分红' ? '按照股东实缴的出资比例分配红利' : '红利分配办法由股东另行约定，具体如下：________________'}。</p>
<p><b>第五章　股权转让</b></p>
<p>第十六条　股东之间可相互转让其全部或部分股权。股东向股东以外的人转让股权，应将股权转让的数量、价格、支付方式和期限等事项书面通知其他股东，其他股东在同等条件下有优先购买权；其他股东自接到书面通知之日起三十日内未答复的，视为同意转让（新《公司法》第八十四条）。</p>
<p>第十七条　自然人股东死亡后，其合法继承人可继承股东资格，章程另有规定的除外。</p>
<p><b>第六章　解散、清算与争议</b></p>
<p>第十八条　公司营业期限为${esc(a.term) || '长期'}。公司因下列原因解散：（一）章程规定的营业期限届满或解散事由出现；（二）股东会决议解散；（三）因合并或分立需要解散；（四）依法被吊销营业执照、责令关闭或被撤销；（五）人民法院依照《公司法》规定予以解散。</p>
<p>第十九条　公司解散的，应依法成立清算组进行清算。清算结束后办理注销登记。</p>
<p>第二十条　股东、董事、高级管理人员执行职务给公司造成损失的，应承担赔偿责任；控股股东、实际控制人利用关联关系损害公司利益的，亦同（新《公司法》第二十一条、第一百八十八条）。</p>
<p><b>第七章　附则</b></p>
<p>第二十一条　本章程自全体股东签字（或盖章）之日起生效。修改本章程须经代表三分之二以上表决权的股东通过，并依法办理变更登记。</p>
<p style="margin-top:40px">全体股东签字（或盖章）：________________</p>
<p>日期：${todayCN()}</p>
${docFoot()}`;
    },
  },

  {
    id: 'shareholders',
    category: 'equity',
    name: '联合创始人股东协议',
    price: 499,
    tagline: '把「分手」也写清楚，避免兄弟式创业、仇人式散伙',
    includes: ['股权成熟（Vesting）与加速', '拖带权 / 共同出售 / 优先认购', '信息权与保护性事项', '僵局解决与回购'],
    questions: [
      { id: 'companyName', label: '公司全称', type: 'text' },
      { id: 'founders', label: '联合创始人', type: 'group', fields: [
        { key: 'name', label: '姓名', type: 'text' },
        { key: 'ratio', label: '股权比例(%)', type: 'number' },
        { key: 'role', label: '职务', type: 'text' },
      ]},
      { id: 'vesting', label: '股权成熟年限（年）', type: 'number', placeholder: '如：4' },
      { id: 'cliff', label: '悬崖期（月）', type: 'number', placeholder: '如：12' },
      { id: 'dragAlong', label: '是否设置拖带权（Drag-Along）', type: 'select', options: ['设置', '不设置'] },
      { id: 'nonCompete', label: '是否约定不竞争义务', type: 'select', options: ['约定', '不约定'] },
    ],
    generate: (a) => {
      const v = Number(a.vesting) || 4, c = Number(a.cliff) || 12;
      const list = (Array.isArray(a.founders) && a.founders.length)
        ? a.founders.map((f, i) => '        ' + (i + 1) + '. ' + esc(f.name) + '，持有公司 ' + (Number(f.ratio) || 0) + '% 股权，担任' + (esc(f.role) || '________') + '；').join('\n')
        : '        （未填写）';
      const n = Array.isArray(a.founders) ? a.founders.length : 2;
      const drag = esc(a.dragAlong) === '设置'
        ? '若持有公司过半数表决权的股东（「牵头股东」）决定向第三方出售公司控制权（指导致公司 50% 以上股权或表决权转移的交易的，以下简称「出售事件」），各股东应配合签署交易文件并按同等条款出售其股权；拟出售股东应保证收购方承担与本协议相当的创始人限制义务。'
        : '本协议项下不设置拖带权。';
      const nc = esc(a.nonCompete) === '约定'
        ? '各创始人（包括其关联方）在任职期间及不再持有公司股权后二十四（24）个月内，不得：（i）以任何方式从事或投资与公司构成竞争的业务；（ii）招揽或诱使公司任何员工离职；（iii）招揽或诱使公司客户、供应商终止与公司的交易。违反本条款的，应将竞争业务所得归公司所有并赔偿公司损失。'
        : '本协议不另行约定不竞争义务，但保密义务独立有效。';
      return `
<h1 style="text-align:center">股东协议</h1>
<p style="text-align:center;color:#666">签署日期：${todayCN()}</p>
<p><b>第一条　定义与背景</b></p>
<p>1.1　本协议由以下各方（合称「股东」，单称「一方」）于${todayCN()}在${esc(a.companyName) || '____'}住所地签署。各股东现持有 ${esc(a.companyName) || '目标公司'}（以下简称「公司」）股权如下：</p>
<pre style="white-space:pre-wrap;font-family:inherit">${list}</pre>
<p>1.2　鉴于各方共同创立并经营公司，为明确股东之间的权利义务、公司治理及退出机制，特订立本协议。本协议与公司章程冲突的，以本协议为准（在股东之间）；涉及外部第三人利益的，以公司章程及法律规定为准。</p>
<p><b>第二条　股权成熟（Vesting）</b></p>
<p>2.1　各方持有的公司股权自本协议签署之日起分 <b>${v}</b> 年按月成熟，其中前 <b>${c}</b> 个月为悬崖期（Cliff）。悬崖期内任一方与公司终止劳动关系的，其未成熟股权由公司以名义价格（人民币 1 元或法律允许的最低价）无偿收回并注销或重新分配。</p>
<p>2.2　加速成熟：（i）单触发加速（Single Trigger）：公司发生被并购等清算事件时，未成熟股权按 50%–100% 加速成熟；（ii）双触发加速（Double Trigger）：清算事件且创始人在交易后十二（12）个月内被终止雇佣的，未成熟股权全额加速。具体比例由各方另行书面约定。</p>
<p><b>第三条　股权转让限制与优先权利</b></p>
<p>3.1　未经其他股东书面同意，任一股东不得向第三方转让、质押或以其他方式处置其股权；其他股东在同等条件下享有优先购买权。</p>
<p>3.2　共同出售权（Tag-Along）：任一股东（「转让股东」）拟向第三方转让股权时，其他股东有权按其与转让股东的相对持股比例，以同等条款一并出售其股权。</p>
<p>3.3　拖带权（Drag-Along）：${drag}</p>
<p>3.4　优先认购权（Preemptive）：公司后续发行股本或股权类证券时，各股东有权按其实时持股比例优先认购，以维持其持股比例（员工期权池的稀释除外）。</p>
<p><b>第四条　信息权</b></p>
<p>4.1　公司应定期向股东提供：季度财务报表、经审计的年度财务报告、预算与经营计划。任一股东经合理提前通知，可在正常工作时间查阅公司账簿并复制与自身权益相关的文件。</p>
<p>4.2　公司发生重大不利变化、诉讼、监管调查或融资时，应及时书面通知全体股东。</p>
<p><b>第五条　公司治理</b></p>
<p>5.1　公司设董事会（或执行董事），由股东按持股比例提名；关键人事任免须经董事会决议。各方应促使其提名的董事保持一致行动（如适用）。</p>
<p>5.2　下列事项须经持有公司过半数表决权的股东同意：（i）变更主营业务；（ii）单笔超过约定阈值的借款、担保或资产处置；（iii）增资、减资、合并、分立、解散或清算；（iv）设立或处置子公司、分公司。</p>
<p><b>第六条　不竞争与禁止招揽</b></p>
<p>6.1　${nc}</p>
<p>6.2　各方应对公司商业秘密、技术秘密承担保密义务，该义务在协议终止后继续有效。</p>
<p><b>第七条　陈述与保证</b></p>
<p>7.1　各方陈述并保证：其签署并履行本协议不违反其承担的任何其他协议或法律义务；其用于出资的股权/资产权属清晰、无权利负担；其向公司披露的信息真实、准确、完整。</p>
<p><b>第八条　僵局与退出</b></p>
<p>8.1　僵局解决：若股东会就重大事项连续两次无法形成有效决议，且僵局持续超过 [六十（60）] 日，任一方可提议以下机制之一：（i）由持股较多一方按独立评估价值收购其他方股权（ Texas Shoot-out / 买断机制）；（ii）引入独立第三方整体收购公司；（iii）依法解散公司。</p>
<p>8.2　回购权（Put）：股东因死亡、丧失行为能力或经其他股东一致同意退出的，公司或其他股东有权按「届时净资产」或「原始出资额加年化 8% 利息」之孰高者回购其股权。</p>
<p><b>第九条　保密与违约救济</b></p>
<p>9.1　各方对本协议内容及公司信息保密。任一方违反本协议，应赔偿守约方因此遭受的直接损失；守约方并有权申请禁令救济。</p>
<p>9.2　不可抗力：因不可抗力致协议无法履行的，受影响方应及时通知并在合理期限内提供证明，可部分或全部免除责任。</p>
<p><b>第十条　适用法律与争议解决</b></p>
<p>10.1　本协议适用中华人民共和国法律。${arbCIETAC()}</p>
<p>10.2　本协议一式 ${n} 份，各方各执一份，具同等效力；未尽事宜由各方另行签署补充协议。</p>
<p style="margin-top:40px">股东签字：________________　　日期：${todayCN()}</p>
${docFoot()}`;
    },
  },

  /* ============ 融资文件 ============ */
  {
    id: 'termSheet',
    category: 'financing',
    name: 'Term Sheet 投资条款清单',
    price: 399,
    tagline: '拿 term sheet 不踩坑，关键条款一眼看明白',
    includes: ['估值与清算优先权', '反稀释与优先权', '董事席位与保护性事项', '优先认购 / 共同出售 / 股权成熟'],
    questions: [
      { id: 'companyName', label: '公司全称', type: 'text' },
      { id: 'investor', label: '投资方名称', type: 'text' },
      { id: 'round', label: '融资轮次', type: 'select', options: ['天使轮', 'Pre-A', 'A 轮', 'A+ 轮', 'B 轮', '其他'] },
      { id: 'amount', label: '投资额（万元）', type: 'number' },
      { id: 'preMoney', label: '投前估值（万元）', type: 'number' },
      { id: 'equityPct', label: '本轮出让股权比例(%)', type: 'number' },
      { id: 'liquidation', label: '清算优先权', type: 'select', options: ['1 倍，非参与分配', '1 倍，参与分配', '2 倍，非参与分配'] },
      { id: 'antiDilution', label: '反稀释条款', type: 'select', options: ['加权平均', '完全棘轮', '无'] },
      { id: 'boardSeat', label: '董事席位', type: 'select', options: ['投资方 1 席', '投资方观察员', '无'] },
    ],
    generate: (a) => {
      const post = (Number(a.preMoney || 0) + Number(a.amount || 0));
      const pricePer = Number(a.equityPct) ? (post / Number(a.equityPct)).toFixed(2) : '____';
      const liq = esc(a.liquidation) || '1 倍，非参与分配';
      const anti = esc(a.antiDilution) || '加权平均';
      return `
<h1 style="text-align:center">投资条款清单（Term Sheet）</h1>
<p style="text-align:center;color:#666">${todayCN()}　·　本清单仅为投资意向的摘要，具体以正式交易文件为准</p>
<p><b>一、交易概况</b></p>
<p>目标公司：${esc(a.companyName) || '__________'}（以下简称「公司」）　投资方：${esc(a.investor) || '__________'}　轮次：${esc(a.round) || '____'}<br>
投资金额：人民币 ${moneyCN(a.amount)} 万元　投前估值：人民币 ${moneyCN(a.preMoney)} 万元<br>
投后估值：人民币 ${moneyCN(post)} 万元　本轮出让股权比例：${Number(a.equityPct) || 0}%　（隐含每 1% 股权对价约人民币 ${moneyCN(pricePer)} 万元）</p>
<p><b>二、投资工具与清算优先权</b></p>
<p>2.1　投资方向公司认购本轮优先股（或可转债，以正式文件为准），金额人民币 ${moneyCN(a.amount)} 万元。</p>
<p>2.2　清算优先权：公司发生清算、解散、视同清算事件（含控制权变更、实质资产出售）时，投资方享有 <b>${liq}</b> 的清算优先权——即投资方优先于其他股东取回其投资本金（及约定优先收益）后，剩余资产方由全体股东按股权比例分配；如为「参与分配」，投资方在取回优先额后还参与剩余资产按比例分配。</p>
<p><b>三、反稀释保护</b></p>
<p>若公司后续发行股权的有效价格低于本次认购价格（「 Down Round」），投资方的转换价格按 <b>${anti}</b> 方式调整（加权平均指广义加权平均 Broad-based Weighted Average；完全棘轮指按最低发行价重置）。</p>
<p><b>四、公司治理</b></p>
<p>4.1　董事会：<b>${esc(a.boardSeat) || '投资方 1 席'}</b>（董事或观察员）。<br>
4.2　保护性事项（须经投资方董事或投资方股东同意）：变更公司主营业务；增发股本、期权池或发行任何股权类证券超出已批额度；公司合并、分立、清算、解散或实质资产出售；单笔超过 [____] 万元的借款、担保或关联交易；任命或解聘 CEO / CFO 等核心高管；批准年度预算的重大偏离。</p>
<p><b>五、优先认购权、共同出售权与股权成熟</b></p>
<p>5.1　优先认购权（Pro Rata）：投资人对公司后续合格融资，按其届时持股比例享有优先认购权以维持比例。<br>
5.2　共同出售权（Co-Sale）：任一创始人转让股权时，投资人有权按同等条款与比例一并出售。<br>
5.3　股权成熟（Vesting）：创始人股权自交割日起分四年成熟、首年一年悬崖期（Cliff）；投资人通常要求该机制以绑定核心团队。</p>
<p><b>六、员工期权池</b></p>
<p>公司应保留不低于 [____]% 的已授权员工期权池（于本轮交割前或交割时预留，具体以正式文件为准），用于核心员工激励。</p>
<p><b>七、排他期、保密与费用</b></p>
<p>本清单签署后 [60] 日内，公司不得就同类交易与第三方洽谈（排他期）。各方对磋商信息保密。尽职调查及交易文件费用通常由 [公司 / 投资方] 承担，以正式约定为准。</p>
<p><b>八、法律效力</b></p>
<p>除「保密、排他期、适用法律与争议解决、费用承担」等条款自签署日起具约束力外，本 Term Sheet 其余条款（含估值、清算优先权、反稀释、保护性事项等）仅为投资意向，不构成法律约束，最终以各方正式签署的交易文件（如增资协议、股东协议、章程修订）为准。</p>
<p>适用法律：中华人民共和国法律。${arbCIETAC()}</p>
<p style="margin-top:40px">投资方（签字）：________________　　公司（盖章）：________________</p>
<p>日期：${todayCN()}</p>
${docFoot()}`;
    },
  },

  {
    id: 'safe',
    category: 'financing',
    name: 'SAFE 未来股权简单协议',
    price: 299,
    tagline: '硅谷同款，早期融资最快的「先拿钱后算股」方案',
    includes: ['投后估值上限（Post-Money Cap）', '折扣（Discount）/ 最惠国', '转化触发事件', '最简法律文本'],
    questions: [
      { id: 'companyName', label: '公司全称', type: 'text' },
      { id: 'investor', label: '投资方名称', type: 'text' },
      { id: 'amount', label: '投资金额（万元）', type: 'number' },
      { id: 'cap', label: '估值上限 Cap（万元，投后）', type: 'number' },
      { id: 'discount', label: '折扣(%)', type: 'number', placeholder: '如：20' },
      { id: 'safeType', label: 'SAFE 类型', type: 'select', options: ['仅估值上限', '仅折扣', '估值上限 + 折扣'] },
    ],
    generate: (a) => {
      const t = esc(a.safeType);
      const capLine = (t === '仅估值上限' || t === '估值上限 + 折扣') ? '2.2 估值上限（Valuation Cap，投后）：人民币 ' + moneyCN(a.cap) + ' 万元。<br>' : '';
      const discLine = (t === '仅折扣' || t === '估值上限 + 折扣') ? '2.3 折扣（Discount）：' + (Number(a.discount) || 0) + '%，即转换价格按下一轮价格的 ' + (100 - (Number(a.discount) || 0)) + '% 计算。<br>' : '';
      return `
<h1 style="text-align:center">未来股权简单协议（SAFE，投后估值型）</h1>
<p style="text-align:center;color:#666">${todayCN()}</p>
<p><b>第一条　当事方与目的</b></p>
<p>本协定由 ${esc(a.companyName) || '公司'}（「公司」）与 ${esc(a.investor) || '投资方'}（「投资方」）于${todayCN()}签署。投资方以人民币 ${moneyCN(a.amount)} 万元（「投资款」）认购公司未来股权，旨在简化早期融资、延后估值谈判。</p>
<p><b>第二条　转换机制</b></p>
<p>2.1　当发生下列「股权融资」「清算」「解散」等触发事件时，本 SAFE 项下的投资款按本条转换为公司股权：</p>
<p>${capLine}${discLine}</p>
<p>2.4　转换价格取「按估值上限计算的价格」与「按折扣计算的价格」之孰低者（如两者兼具）；如为「仅估值上限」或「仅折扣」，则分别按其规则计算。转换后投资方持有公司优先股（或届时发行的同类股权）。</p>
<p>2.5　最惠国（MFN）：如公司后续签发更优条款的 SAFE，投资方有权自动适用该更优条款（仅估值上限 / 折扣类）。</p>
<p><b>第三条　触发事件</b></p>
<p>（a）<b>股权融资</b>：公司发行优先股融资时，本 SAFE 按转换价格转为该轮优先股；<br>
（b）<b>清算 / 视同清算</b>：公司清算或发生控制权变更、实质资产出售时，投资方优先获得投资款本息（或按股权比例分配，孰高）；<br>
（c）<b>解散</b>：公司解散时同清算处理。</p>
<p><b>第四条　声明与限制</b></p>
<p>4.1　本 SAFE 不计算利息，不赋予投资方董事席位或表决权（除非另行书面约定）；投资方为公司的「资本公积 / 股权」权益人，享有转换前的信息知情权。<br>
4.2　公司陈述：其签署并履行本协议已获必要授权，不违反其章程或所负其他义务。</p>
<p><b>第五条　效力与争议</b></p>
<p>5.1　本协议自双方签署之日起生效，对双方具有法律约束力；投资款支付以本协议及公司收款确认为准。<br>
5.2　适用法律：中华人民共和国法律。${arbCIETAC()}</p>
<p style="margin-top:40px">公司（盖章）：________________　　投资方（签字）：________________</p>
<p>日期：${todayCN()}</p>
${docFoot()}`;
    },
  },

  /* ============ IP 与合规 ============ */
  {
    id: 'nda',
    category: 'ip',
    name: '保密协议（双向 NDA）',
    price: 199,
    tagline: '聊合作、谈融资前先签它，信息不泄露',
    includes: ['双向保密义务与用途限制', '除外与强制披露', '返还 / 销毁与无许可', '违约禁令救济'],
    questions: [
      { id: 'partyA', label: '甲方（披露方 / 接收方均可）名称', type: 'text' },
      { id: 'partyB', label: '乙方名称', type: 'text' },
      { id: 'purpose', label: '保密目的', type: 'textarea', placeholder: '如：双方就 XXX 项目合作进行商业洽谈' },
      { id: 'term', label: '保密期限（年）', type: 'number', placeholder: '如：3' },
    ],
    generate: (a) => {
      return `
<h1 style="text-align:center">保密协议（双向 / Mutual NDA）</h1>
<p style="text-align:center;color:#666">${todayCN()}</p>
<p><b>第一条　定义</b></p>
<p>1.1　「披露方」指披露保密信息的一方；「接收方」指接收保密信息的一方；「保密信息」指一方以书面、口头、电子或其他形式向另一方披露的、与其业务、技术、财务、客户、产品相关的非公开信息，包括但不限于技术方案、源代码、商业计划、客户名单、财务数据、定价及谈判立场，无论是否标注「保密」。</p>
<p>1.2　「代表」指接收方的员工、董事、顾问或专业服务机构，且该等代表已受书面保密义务约束。</p>
<p><b>第二条　双向保密义务</b></p>
<p>2.1　双方互为披露方与接收方，均应对收到的保密信息严格保密，未经披露方事先书面同意，不得向任何第三方披露，亦不得用于本协议目的之外的任何用途。</p>
<p>2.2　接收方应采取不低于保护自身同类信息的合理措施（包括访问控制、加密、最小知悉原则）保护保密信息，并仅在其代表为合作目的且已承担保密义务的前提下有限披露。</p>
<p>2.3　接收方发现保密信息泄露或可能泄露时，应立即通知披露方并协助采取补救措施。</p>
<p><b>第三条　除外情形</b></p>
<p>下列信息不属于保密信息：（一）接收方接收时已合法知悉且无保密义务；（二）非因接收方违约已进入公有领域；（三）接收方从无保密义务的第三方合法取得；（四）接收方独立开发且未使用保密信息。</p>
<p><b>第四条　强制披露</b></p>
<p>若接收方因法律、法规、证券交易所规则或司法机关、监管机构的强制要求须披露保密信息，应在可行的最早时间书面通知披露方（除非法律禁止），并仅披露被要求的最小范围，同时协助披露方寻求保护令等救济。</p>
<p><b>第五条　返还与销毁</b></p>
<p>协议终止或经披露方要求，接收方应返还或销毁（含从电子系统中删除）所有含保密信息的载体，并应披露方要求出具书面销毁证明；但依法须留存备份的除外，该备份仍受保密义务约束。</p>
<p><b>第六条　无许可与无保证</b></p>
<p>6.1　本协议不授予接收方任何知识产权或保密信息的任何许可（含暗示许可）。<br>6.2　保密信息按「现状」提供，披露方不对信息的准确性、完整性或适用性作出任何明示或暗示保证。</p>
<p><b>第七条　保密期限</b></p>
<p>本协议项下保密义务自保密信息披露之日起持续 <b>${Number(a.term) || 3}</b> 年；对于构成商业秘密的信息，保密义务持续至该信息依法不再构成商业秘密为止。</p>
<p><b>第八条　违约救济</b></p>
<p>任一方违反本协议，应赔偿守约方因此遭受的全部损失（含合理律师费）；守约方有权申请禁令（injunctive relief）等衡平救济，且无需证明实际损害。</p>
<p><b>第九条　适用法律与争议解决</b></p>
<p>9.1　本协议适用中华人民共和国法律。${arbCIETAC()}<br>9.2　本协议一式两份，双方各执一份；通知地址以各方书面指定为准；协议构成双方就保密事宜的完整约定，取代此前一切口头或书面沟通。</p>
<p style="margin-top:40px">甲方（盖章）：________________　　乙方（盖章）：________________</p>
<p>日期：${todayCN()}</p>
${docFoot()}`;
    },
  },

  {
    id: 'privacy',
    category: 'ip',
    name: '隐私政策（App / 网站）',
    price: 299,
    tagline: '上线前合规必备，符合个保法要求',
    includes: ['收集清单与最小必要', '委托/共享/转让/出境区分', '个人权利与单独同意', '未成年人保护与责任人'],
    questions: [
      { id: 'appName', label: '产品 / 应用名称', type: 'text' },
      { id: 'companyName', label: '运营主体名称', type: 'text' },
      { id: 'contact', label: '联系邮箱', type: 'text', placeholder: '如：privacy@example.com' },
      { id: 'dataType', label: '收集的数据类型（可多选）', type: 'checkboxes', options: ['账户信息（手机号/邮箱）', '设备与日志信息', '位置信息', '支付与交易信息', '相册/通讯录等敏感权限'] },
      { id: 'thirdParty', label: '是否向第三方共享', type: 'select', options: ['否', '是（如统计分析、支付通道）'] },
      { id: 'minor', label: '是否面向未成年人', type: 'select', options: ['否', '是（需监护人同意机制）'] },
    ],
    generate: (a) => {
      const dt = (Array.isArray(a.dataType) && a.dataType.length) ? a.dataType.map(x => '· ' + esc(x)).join('；<br>') : '· （未选择）';
      const sensitive = (Array.isArray(a.dataType) && a.dataType.some(x => x.indexOf('敏感') >= 0 || x.indexOf('相册') >= 0 || x.indexOf('通讯录') >= 0)) ? '就所收集的敏感个人信息，我们另行取得您的单独同意，并告知处理必要性及对个人权益的影响。' : '本产品不收集敏感个人信息；如后续新增，将依法重新取得同意。';
      return `
<h1 style="text-align:center">${esc(a.appName) || '本产品'}隐私政策</h1>
<p style="text-align:center;color:#666">生效日期：${todayCN()}</p>
<p>本政策由 ${esc(a.companyName) || '运营主体'}（「我们」，作为个人信息处理者）制定，说明 ${esc(a.appName) || '本产品'}（「本产品」）如何收集、使用、存储、共享、转让、公开披露及跨境提供您的个人信息，并载明您所享有的权利。使用前请仔细阅读。本政策依据《中华人民共和国个人信息保护法》《网络安全法》《数据安全法》及相关法规制定。</p>
<p><b>一、我们收集的信息及目的</b></p>
<p>为向您提供服务，我们遵循「合法、正当、必要、诚信」及「最小必要」原则，可能收集以下信息：<br>${dt}<br>${sensitive}</p>
<p><b>二、信息的使用</b></p>
<p>我们使用上述信息用于：账户注册与实名认证、提供服务核心功能、安全保障与风控、产品优化与统计分析。我们仅在为实现目的所必需的最小范围及时限内处理您的个人信息。</p>
<p><b>三、委托处理、共享、转让与公开披露</b></p>
<p>3.1　<b>委托处理</b>：我们可能委托第三方（如云服务商、支付机构）处理个人信息，并与之签署个人信息保护协议，监督其处理活动。<br>
3.2　<b>共享</b>：${esc(a.thirdParty) === '否' ? '我们不会向任何第三方共享您的个人信息（法律法规规定或您另行授权除外）。' : '我们可能向以下类型第三方共享必要信息：统计分析、支付清算、云服务；共享前均取得您的同意或属履行必要合同所必需，且均签署保密与数据处理协议。'}我们不会出售您的个人信息。<br>
3.3　<b>转让</b>：因合并、分立、解散、被收购等导致个人信息控制者变更的，我们将向您告知接收方身份与联系方式，并由接收方继续履行本政策；如变更处理目的，将重新取得同意。<br>
3.4　<b>公开披露</b>：仅在法律要求或您单独同意时公开披露。</p>
<p><b>四、跨境提供</b></p>
<p>如我们向境外提供个人信息，将依法通过签订标准合同、通过安全评估或取得保护认证等方式，履行《个人信息保护法》第三十八条规定的合规义务，并告知您境外接收方名称、联系方式、处理目的、方式及行权途径。</p>
<p><b>五、存储与安全</b></p>
<p>我们在中华人民共和国境内存储您的个人信息，采取加密传输、访问控制、日志审计等技术与管理措施保护信息安全；保存期限为实现目的所必需的最短时间，超出后删除或匿名化。</p>
<p><b>六、您的权利</b></p>
<p>您对个人信息的处理享有知情权、决定权；有权查询、复制、更正、补充、删除您的个人信息；有权撤回同意（撤回不影响撤回前处理的效力）；有权要求个人信息转移；有权就自动化决策要求说明并拒绝仅通过自动化决策作出的重大决定。您可通过 ${esc(a.contact) || '____'} 行使上述权利，我们将在十五日内响应。如您认为处理违反法律，可向网信部门投诉举报。</p>
<p><b>七、未成年人保护</b></p>
<p>${esc(a.minor) === '是（需监护人同意机制）' ? '若本产品面向未成年人，我们仅在取得监护人同意后收集必要信息，并建立监护人同意、未成年人模式与退出机制；不满十四周岁未成年人的个人信息按敏感个人信息处理。' : '本产品不面向未满十四周岁未成年人；若我们发现误收集，将立即删除。'}</p>
<p><b>八、个人信息保护负责人与联系</b></p>
<p>我们指定个人信息保护负责人，您可就本政策或个人信息处理事宜通过 ${esc(a.contact) || '____'} 联系我们。本政策将随业务与法规更新，重大变更将以显著方式通知。</p>
${docFoot()}`;
    },
  },

  /* ============ 出海合规 ============ */
  {
    id: 'ndaIntl',
    category: 'overseas',
    name: '涉外保密协议（中英双语 NDA）',
    price: 299,
    tagline: '跨境合作、海外融资前先签，中英对照直接用',
    includes: ['双向保密义务（中英）', '除外与强制披露', '适用法与仲裁（按法域）', '中英双语效力'],
    questions: [
      { id: 'partyA', label: '甲方（披露方）名称', type: 'text' },
      { id: 'partyB', label: '乙方（接收方）名称', type: 'text' },
      { id: 'purpose', label: '保密目的', type: 'textarea', placeholder: '如：双方就 XXX 海外业务合作进行洽谈' },
      { id: 'law', label: '适用法', type: 'select', options: ['中华人民共和国法律', '香港法律', '新加坡法律', '英国法律（英格兰与威尔士）', '美国纽约州法律'] },
      { id: 'term', label: '保密期限（年）', type: 'number', placeholder: '如：3' },
      { id: 'bilingual', label: '是否生成中英双语', type: 'select', options: ['是（中英对照）', '否（仅中文）'] },
    ],
    generate: (a) => {
      const bi = esc(a.bilingual) === '是（中英对照）';
      const cn = `
<h1 style="text-align:center">保密协议（双向）</h1>
<p style="text-align:center;color:#666">Mutual Non-Disclosure Agreement　·　${todayCN()}</p>
<p>甲方：${esc(a.partyA) || '__________'}　乙方：${esc(a.partyB) || '__________'}</p>
<p>鉴于甲乙双方拟就「${esc(a.purpose) || '________'}」开展跨境合作洽谈，双方均可能向对方披露保密信息，为此达成如下协议：</p>
<p><b>第一条　保密信息</b>　指一方以书面、口头、电子或其他形式向另一方披露的、与其业务、技术、财务、客户、产品相关的非公开信息，含技术方案、源代码、商业计划、客户名单、财务数据。</p>
<p><b>第二条　双向保密义务</b>　2.1 双方均应对收到的保密信息严格保密，未经披露方书面同意不得向第三方披露或用于本协议目的之外。2.2 接收方应采取合理保护措施，仅在其代表为合作目的且已承担保密义务的前提下有限披露。2.3 发现泄露应立即通知并补救。</p>
<p><b>第三条　除外与强制披露</b>　下列信息不属于保密信息：（一）接收时已合法知悉；（二）非因违约进入公有领域；（三）从无保密义务的第三方合法取得；（四）独立开发。因法律强制要求披露的，应尽早书面通知披露方并仅披露最小范围。</p>
<p><b>第四条　返还与销毁</b>　协议终止或应要求，接收方应返还或销毁含保密信息的载体并出具证明（依法留存的备份除外）。</p>
<p><b>第五条　期限</b>　保密义务自披露之日起持续 <b>${Number(a.term) || 3}</b> 年；构成商业秘密的，持续至不再构成商业秘密为止。</p>
<p><b>第六条　违约救济</b>　违约方应赔偿守约方全部损失（含律师费），守约方有权申请禁令救济。</p>
<p><b>第七条　适用法律与争议解决</b>　本协议适用 <b>${esc(a.law) || '中华人民共和国法律'}</b>。${arbIntl(a.law)}</p>
<p><b>第八条　双语效力</b>　本协议以中文与英文作成，两种文本具有同等效力；如理解不一致，以中文文本为准。</p>
`;
      const en = bi ? `
<hr>
<p><b>ENGLISH VERSION</b> <span style="color:#666;font-size:12px">（Chinese text prevails in case of conflict）</span></p>
<p><b>Mutual Non-Disclosure Agreement</b></p>
<p>Party A: ${esc(a.partyA) || '__________'}　Party B: ${esc(a.partyB) || '__________'}</p>
<p><b>1. Confidential Information.</b> Means non-public business, technical, financial or customer information disclosed by either party in any form, including technical solutions, source code, business plans, customer lists and financial data.</p>
<p><b>2. Mutual Obligations.</b> Each party shall keep the other's Confidential Information secret, shall not disclose it to any third party or use it except for the Purpose, shall apply reasonable protections, and shall notify and remedy any breach promptly.</p>
<p><b>3. Exclusions &amp; Compelled Disclosure.</b> Information already known, public through no fault, lawfully received from a third party without duty, or independently developed is excluded. Disclosure compelled by law is permitted if notice is given promptly and only the minimum required is disclosed.</p>
<p><b>4. Return or Destruction.</b> On termination or request, the Receiving Party shall return or destroy all materials containing Confidential Information and certify destruction (permitted legal backups excepted).</p>
<p><b>5. Term.</b> Obligations survive <b>${Number(a.term) || 3}</b> years from disclosure; for trade secrets, until no longer secret.</p>
<p><b>6. Remedies.</b> The breaching party shall indemnify the other for all losses (including legal fees); the non-breaching party may seek injunctive relief.</p>
<p><b>7. Governing Law &amp; Dispute Resolution.</b> This agreement is governed by <b>${esc(a.law) || 'the applicable law'}</b>. ${arbIntl(a.law)}</p>
<p><b>8. Bilingual Effect.</b> This agreement is executed in Chinese and English, both equally authentic; in case of conflict, the Chinese text prevails.</p>
` : '';
      return cn + en + `
<p style="margin-top:40px">甲方（盖章）：________________　　乙方（盖章）：________________</p>
<p>日期：${todayCN()}</p>
${docFoot()}`;
    },
  },

  {
    id: 'dataExport',
    category: 'overseas',
    name: '跨境数据传输协议（个保法/GDPR）',
    price: 399,
    tagline: '数据出海合规必备，标准合同与安全评估双路径',
    includes: ['出境合规路径（标准合同/评估/认证）', '数据主体权利与再传输限制', '安全、审计与泄露通知', '违约救济与管辖'],
    questions: [
      { id: 'exporter', label: '境内出境方（个人信息处理者）名称', type: 'text' },
      { id: 'importer', label: '境外接收方名称', type: 'text' },
      { id: 'dataType', label: '传输的数据类型', type: 'textarea', placeholder: '如：用户账户信息、设备日志、交易记录' },
      { id: 'dest', label: '数据接收国 / 地区', type: 'text', placeholder: '如：美国 / 欧盟 / 新加坡' },
      { id: 'mechanism', label: '出境合规机制', type: 'select', options: ['标准合同（签订个人信息出境标准合同并报备）', '安全评估（通过国家网信部门评估）', '个人信息保护认证', '法定豁免情形'] },
      { id: 'purpose', label: '传输目的', type: 'text', placeholder: '如：提供海外云服务、跨境客服' },
      { id: 'retention', label: '境外保存期限', type: 'text', placeholder: '如：服务终止后 6 个月' },
    ],
    generate: (a) => {
      return `
<h1 style="text-align:center">跨境数据传输协议</h1>
<p style="text-align:center;color:#666">Cross-Border Data Transfer Agreement　·　${todayCN()}</p>
<p>出境方（境内个人信息处理者）：${esc(a.exporter) || '__________'}（「出境方」）　接收方（境外）：${esc(a.importer) || '__________'}（「接收方」）</p>
<p>双方就 ${esc(a.dataType) || '个人信息'} 向 ${esc(a.dest) || '境外'} 提供（出境）事宜，依据《中华人民共和国个人信息保护法》第三十八条至第四十三条、《数据安全法》及（如适用）欧盟《通用数据保护条例》（GDPR）第 44–49 条，达成如下协议：</p>
<p><b>第一条　出境合规路径</b></p>
<p>本次出境采用「<b>${esc(a.mechanism) || '标准合同'}</b>」路径。出境方应于传输前完成相应合规手续：（i）如属标准合同路径，签订《个人信息出境标准合同》并向网信部门备案；（ii）如属安全评估路径，通过国家网信部门组织的安全评估；（iii）如属认证路径，取得个人信息保护认证；（iv）如属法定豁免，留存合规依据。各方确保传输具有合法基础。</p>
<p><b>第二条　传输目的、范围与最小必要</b></p>
<p>传输目的：${esc(a.purpose) || '________'}。传输数据范围以「实现目的所必需的最小化」为限，不得超出约定用途处理；接收方处理活动受本协议及出境方书面指示约束。</p>
<p><b>第三条　境外保存期限</b></p>
<p>接收方应在 ${esc(a.retention) || '____'} 期限届满或目的实现后立即删除或匿名化相关数据，除非法律要求延长保存；保存期限届满的处理记录应可核查。</p>
<p><b>第四条　数据主体权利</b></p>
<p>双方应确保数据主体（用户）可行使访问、更正、删除、复制、携带及撤回同意等权利；接收方应建立便捷的请求响应机制，并在 [30] 个工作日内处理，必要时由出境方协调。</p>
<p><b>第五条　再传输与次级处理者</b></p>
<p>未经出境方书面同意及再次完成合规评估，接收方不得将数据传输至第三国或转委托给次级处理者（sub-processor）；次级处理者应具备同等保护水平并受书面协议约束。</p>
<p><b>第六条　安全、审计与泄露通知</b></p>
<p>6.1　接收方应采取加密、访问控制、日志审计、去标识化等措施保护数据，并每年至少一次向出境方提供合规与安全保障说明；出境方有权进行合规审计。<br>6.2　发生数据泄露、毁损或丢失的，接收方应在 [72] 小时内通知出境方，并配合履行对监管与数据主体的通知、补救义务。</p>
<p><b>第七条　违约与救济</b></p>
<p>任一方违反本协议致数据泄露或违法违规的，应承担相应法律责任并赔偿守约方及数据主体损失；出境方有权暂停或终止传输，并要求接收方承担整改费用。</p>
<p><b>第八条　适用法律与争议解决</b></p>
<p>本协议适用中华人民共和国法律。因本协议产生的争议，提交出境方所在地有管辖权的人民法院诉讼解决，或按双方另行约定提交仲裁（CIETAC）。涉及 GDPR 项下数据主体权利的，不影响数据主体依 GDPR 向相关监管机构投诉或提起诉讼的权利。</p>
<p style="color:#999;font-size:12px">提示：本协为模板文本。「安全评估」「标准合同备案」「认证」为并行合规路径，应按数据规模、敏感程度与风险选择；涉重要数据或大规模敏感个人信息的，须优先走安全评估；关键信息基础设施运营者出境须强制评估。</p>
${docFoot()}`;
    },
  },

  {
    id: 'offshoreSetup',
    category: 'overseas',
    name: '海外实体设立与股权架构建议书',
    price: 499,
    tagline: '出海第一步，给你可落地的设立路径与架构图',
    includes: ['目标地设立路径', '股权 / 控制架构（红筹 / VIE）', '税务、外汇与合规要点', '风险提示（含境外上市备案）'],
    questions: [
      { id: 'companyName', label: '境内运营主体名称', type: 'text' },
      { id: 'market', label: '目标市场', type: 'select', options: ['美国（Delaware C-Corp）', '新加坡私人有限公司', '香港有限公司', '英国私人有限公司', '开曼 / BVI（红筹或 VIE）'] },
      { id: 'bizType', label: '业务类型', type: 'text', placeholder: '如：SaaS / 跨境电商 / AI 应用' },
      { id: 'finance', label: '是否计划境外融资', type: 'select', options: ['是', '否', '暂不确定'] },
      { id: 'structure', label: '架构偏好', type: 'select', options: ['直接持股', '红筹架构（境外控股 + 境内 WFOE）', 'VIE 架构（限制类业务）', '请给建议'] },
    ],
    generate: (a) => {
      const m = esc(a.market);
      const s = esc(a.structure);
      const rec = (s === '请给建议')
        ? (esc(a.finance) === '是' ? '建议采用「红筹架构」：于开曼（或 BVI）设上市/控股主体，下设香港中间控股层（用于股息预提所得税筹划），再设境内 WFOE 持有运营实体，便于境外融资与未来境外上市。' : '如短期无境外融资需求，可先以「直接持股」或「香港/新加坡公司」轻量出海；待启动融资时再升级为红筹架构。')
        : '按你选择的「' + s + '」路径落地。';
      const holding = (m.indexOf('开曼') >= 0 || m.indexOf('BVI') >= 0) ? '开曼 / BVI 特殊目的公司（SPV）'
        : (m.indexOf('美国') >= 0 ? 'Delaware C-Corp'
        : (m.indexOf('新加坡') >= 0 ? '新加坡私人有限公司'
        : (m.indexOf('香港') >= 0 ? '香港有限公司'
        : (m.indexOf('英国') >= 0 ? '英国私人有限公司' : '境外控股实体'))));
      return `
<h1 style="text-align:center">海外实体设立与股权架构建议书</h1>
<p style="text-align:center;color:#666">${todayCN()}</p>
<p><b>一、项目背景</b></p>
<p>境内主体：${esc(a.companyName) || '__________'}；目标市场：${m || '____'}；业务类型：${esc(a.bizType) || '____'}；是否计划境外融资：${esc(a.finance) || '____'}。</p>
<p><b>二、推荐设立路径</b></p>
<p>${rec}</p>
<p><b>三、建议股权 / 控制架构（文字示意）</b></p>
<p>创始股东 → 境外控股公司（${holding}）${esc(a.finance) === '是' ? ' → 中间控股层（香港/新加坡，用于税务筹划）→ 境内 WFOE / 运营公司。' : '（如直接出海，可由创始股东或境内主体直接持股境外运营公司）。'}</p>
<p><b>四、税务要点</b></p>
<p>1. 境外公司须按注册地（美国、新加坡、香港、英国或开曼/BVI）履行所得税、经济实质（Economic Substance）、CRS 信息申报等义务；股息、特许权使用费跨境流动须关注税收协定优惠与受益所有人认定。<br>2. 境内居民个人/企业透过境外 SPV 持股或融资，可能触发外汇登记（如 37 号文登记、ODI 境外投资核准/备案）与返程投资合规。<br>3. 若业务涉增值电信、教育、媒体、互联网新闻等外资限制或禁止类领域，须评估 VIE 架构必要性及境内增值电信等资质。</p>
<p><b>五、境外上市与监管</b></p>
<p>境内企业境外发行上市自 2023 年起实行备案制（《境内企业境外发行证券和上市管理试行办法》）；涉及 VIE 的，证监会备案口径与行业主管部门意见尤为关键，不确定性较高，应前置论证。</p>
<p><b>六、风险提示</b></p>
<p>本建议书为一般性提示，<b>不构成法律意见</b>。具体架构须结合业务实质、融资计划、税务居民身份、外汇与两地监管动态，由具备跨境资质的律师出具正式法律意见书后落地。架构一旦设立，调整成本高，建议前置规划。</p>
${docFoot()}`;
    },
  },

  /* ============ 劳动与期权 ============ */
  {
    id: 'laborContract',
    category: 'labor',
    name: '劳动合同（标准版）',
    price: 199,
    tagline: '入职必备，符合劳动合同法，含试用期与保密条款',
    includes: ['合同期限与法定试用期', '劳动报酬、加班与社保', '保密与竞业限制（含补偿）', '解除终止与劳动仲裁前置'],
    questions: [
      { id: 'employerName', label: '用人单位名称', type: 'text' },
      { id: 'employeeName', label: '劳动者姓名', type: 'text' },
      { id: 'position', label: '岗位', type: 'text', placeholder: '如：后端工程师' },
      { id: 'term', label: '合同期限', type: 'select', options: ['1 年（试用≤2月）', '3 年（试用≤6月）', '无固定期限'] },
      { id: 'salary', label: '月工资（元）', type: 'number', placeholder: '如：25000' },
      { id: 'probation', label: '试用期工资比例(%)', type: 'number', placeholder: '如：80' },
      { id: 'socialInsurance', label: '工作 / 社保缴纳地', type: 'text', placeholder: '如：杭州市' },
      { id: 'nonCompete', label: '是否约定竞业限制', type: 'select', options: ['否', '是'] },
    ],
    generate: (a) => {
      const termMap = {
        '1 年（试用≤2月）': '本合同期限为 1 年，其中试用期不超过 2 个月',
        '3 年（试用≤6月）': '本合同期限为 3 年，其中试用期不超过 6 个月',
        '无固定期限': '本合同为无固定期限劳动合同',
      };
      const termText = termMap[esc(a.term)] || '________';
      const nc = esc(a.nonCompete) === '是'
        ? '乙方在离职后两年内不得到与甲方生产或者经营同类产品、从事同类业务的有竞争关系的其他用人单位任职，也不得自己开业生产或者经营同类产品、从事同类业务。甲方应在竞业限制期限内按月向乙方支付经济补偿（不低于乙方离职前十二个月平均工资的 30% 且不低于当地最低工资标准）；乙方违反竞业限制约定的，应按约定向甲方支付违约金，并继续履行竞业限制义务。'
        : '双方不另行约定竞业限制义务。';
      return `
<h1 style="text-align:center">劳动合同</h1>
<p style="text-align:center;color:#666">${todayCN()}</p>
<p>甲方（用人单位）：${esc(a.employerName) || '__________'}　乙方（劳动者）：${esc(a.employeeName) || '__________'}</p>
<p>甲乙双方根据《中华人民共和国劳动合同法》及相关法律法规，在平等自愿、协商一致的基础上订立本合同。</p>
<p><b>第一条　合同期限</b></p>
<p>${termText}。试用期包含在合同期限内；同一用人单位与同一劳动者只能约定一次试用期。</p>
<p><b>第二条　工作内容与工作地点</b></p>
<p>2.1　乙方担任${esc(a.position) || '____'}岗位，工作地点为${esc(a.socialInsurance) || '____'}。乙方应按甲方依法制定的规章制度完成工作任务、达到考核标准。<br>2.2　甲方因生产经营需要，经与乙方协商一致，可依法调整乙方的工作岗位、工作内容或工作地点；依法需变更合同的，应书面变更。</p>
<p><b>第三条　劳动报酬与社会保险</b></p>
<p>3.1　乙方月工资为人民币 ${moneyYuan(a.salary)} 元（税前）；试用期工资不低于转正工资的 ${Number(a.probation) || 80}%，且不低于当地最低工资标准。甲方于每月 [____] 日前以货币形式足额支付。<br>3.2　加班工资按《劳动法》第四十四条执行；乙方依法享受带薪年休假、法定节假日等休息休假权利。<br>3.3　甲方依法为乙方办理并缴纳社会保险（养老、医疗、失业、工伤、生育）及住房公积金，个人应缴部分由甲方代扣代缴。</p>
<p><b>第四条　保密义务</b></p>
<p>乙方应对甲方商业秘密（含技术秘密、经营信息、客户与员工数据）承担保密义务，未经甲方同意不得披露、使用或允许他人使用；该义务在合同终止后继续有效。乙方违反保密义务的，应承担赔偿责任。</p>
<p><b>第五条　竞业限制</b></p>
<p>${nc}</p>
<p><b>第六条　服务期（如适用）</b></p>
<p>甲方为乙方提供专项培训费用进行专业技术培训的，可约定服务期；乙方违反服务期约定的，应按未履行部分比例向甲方支付违约金（不超过培训费用）。</p>
<p><b>第七条　合同的解除与终止</b></p>
<p>双方依《劳动合同法》第三十六条至第五十条行使解除权与终止权。甲方违法解除或终止的，应依照本法支付赔偿金；甲方解除须符合法定情形并履行通知工会等程序。</p>
<p><b>第八条　劳动争议</b></p>
<p>因履行本合同发生争议，双方可协商或申请调解；不愿协商、调解或不成的，应自争议发生之日起一年内向有管辖权的劳动争议仲裁委员会（劳动仲裁）申请仲裁；对仲裁裁决不服的，可依法向人民法院提起诉讼（仲裁前置）。</p>
<p><b>第九条　其他</b></p>
<p>本合同适用中华人民共和国法律，一式两份，双方各执一份，自双方签字（盖章）之日起生效，具同等效力。</p>
<p style="margin-top:40px">甲方（盖章）：________________　　乙方（签字）：________________</p>
<p>日期：${todayCN()}</p>
${docFoot()}`;
    },
  },

  {
    id: 'esop',
    category: 'labor',
    name: 'ESOP 股权激励方案（期权池）',
    price: 499,
    tagline: '创业公司留人利器，期权池设立与授予方案',
    includes: ['期权池与授予要素', '成熟（Vesting）与加速', '行权（含净行权）与 Good/Bad Leaver', '税务（101号文）与外汇（37/7号文）'],
    questions: [
      { id: 'companyName', label: '公司全称', type: 'text' },
      { id: 'poolPct', label: '期权池比例(%)', type: 'number', placeholder: '如：10' },
      { id: 'grantPct', label: '本次授予比例(%)', type: 'number', placeholder: '如：1' },
      { id: 'vesting', label: '成熟年限（年）', type: 'number', placeholder: '如：4' },
      { id: 'cliff', label: '悬崖期（月）', type: 'number', placeholder: '如：12' },
      { id: 'exercisePrice', label: '行权价格（元/股）', type: 'text', placeholder: '如：1（面值）' },
      { id: 'strikeEvent', label: '行权触发情形', type: 'select', options: ['融资后', '离职后 90 日内', '随时可行权'] },
    ],
    generate: (a) => {
      const v = Number(a.vesting) || 4, c = Number(a.cliff) || 12;
      return `
<h1 style="text-align:center">ESOP 股权激励方案（要点）</h1>
<p style="text-align:center;color:#666">${todayCN()}</p>
<p>本方案由 ${esc(a.companyName) || '公司'}（「公司」）制定，旨在建立员工长期激励机制。具体授予以公司与被授予人签署的《期权授予协议》为准。</p>
<p><b>一、期权池</b></p>
<p>公司设立占总股本 <b>${Number(a.poolPct) || 10}%</b> 的期权池，用于核心员工激励，由董事会（或股东会授权）下设的薪酬/期权委员会（「管理员」）统一管理，并保留适当预留。</p>
<p><b>二、本次授予</b></p>
<p>被授予人本次授予比例为 <b>${Number(a.grantPct) || 1}%</b>，行权价格为 ${esc(a.exercisePrice) || '____'} 元/股（可为面值或公允价值，以管理员确定为准）。授予自《期权授予协议》签署日起生效。</p>
<p><b>三、成熟机制（Vesting）</b></p>
<p>授予期权自授予日起分 <b>${v}</b> 年按月成熟，前 <b>${c}</b> 个月为悬崖期（Cliff）；悬崖期后按月线性成熟。成熟部分方可行权；未成熟部分在离职等事件发生时由公司无偿收回（或按协议处理）。</p>
<p><b>四、行权</b></p>
<p>4.1　行权触发情形：${esc(a.strikeEvent) || '____'}。行权资金由被授予人自筹；公司可允许现金less exercise（净行权，以部分股票抵缴行权款）或相同经济效果的安排。<br>4.2　<b>离职处理（Good/Bad Leaver）</b>：善意离职（如死亡、伤残、无因解雇）通常保留已成熟期权并给与合理行权窗口（如 90 日）；恶意离职（如重大违约、竞争）已成熟未行权部分亦由公司收回且无补偿。</p>
<p><b>五、加速成熟</b></p>
<p>单触发加速（Single Trigger）：公司发生被并购等清算事件时，未成熟期权按约定比例（通常 50%–100%）加速；双触发加速（Double Trigger）：清算事件且被授予人在交易后约十二（12）个月内被终止雇佣的，未成熟期权全额加速。</p>
<p><b>六、限制转让与回购</b></p>
<p>未行权期权不得转让、质押或处置；公司发生合格上市、被并购时，未行权期权按约定转换（如按转换比转为上市主体股票）或现金结算；管理员有权按协议价格回购。</p>
<p><b>七、税务提示</b></p>
<p>期权授予与行权可能产生个人所得税。符合条件（如非上市公司股权激励）可适用递延纳税政策（参考财税〔2016〕101 号），即行权环节暂不缴税、递延至转让时按「财产转让所得」计税；建议落地前咨询税务顾问并履行备案。涉及境外架构或境外上市的，还须履行外汇登记（如 37 号文、7 号文）等程序。</p>
<p><b>八、计划管理、适用法律与风险提示</b></p>
<p>本计划由管理员负责解释与执行，重大事项须经董事会/股东会批准。本方案适用中华人民共和国法律。本方案为框架要点，正式激励须签署《期权授予协议》并履行公司内部决议及必要登记/备案程序；最终条款以正式法律文件为准。</p>
${docFoot()}`;
    },
  }
];

function getProduct(id) {
  return PRODUCTS.find(p => p.id === id);
}
