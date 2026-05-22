const STORAGE_KEY = "realEstateLedger.v2";
const MONEY_FORMATTER = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});
const TRANSACTION_CATEGORIES = {
  income: ["租金收入", "押金收入", "管理费收入", "水电费代收", "维修费代收", "其他收入"],
  expense: ["房东租金", "水电费支出", "物业费支出", "家电支出", "家具支出", "维修支出", "装修维护", "保洁支出", "中介费支出", "其他成本"],
};

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};
const addMonths = (dateValue, months) => {
  const source = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(source.getTime())) return today();
  const day = source.getDate();
  const target = new Date(source);
  target.setMonth(target.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
};
const daysBetween = (date) => {
  const base = new Date(today());
  const target = new Date(date);
  base.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - base) / 86400000);
};
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const money = (value) => MONEY_FORMATTER.format(Number(value || 0));
const byDateDesc = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));

const defaultState = () => ({
  selectedCommunityId: "all",
  communities: [
    {
      id: "c1",
      name: "滨江花园",
      district: "河西片区",
      manager: "自营",
      note: "主做两居室，租客稳定。",
    },
    {
      id: "c2",
      name: "云上公馆",
      district: "城东片区",
      manager: "联合代理",
      note: "新房源较多，需要关注空置期。",
    },
  ],
  properties: [
    {
      id: "p1",
      communityId: "c1",
      name: "3 栋 1202",
      layout: "两室一厅",
      area: 82,
      status: "rented",
      tenant: "李女士",
      monthlyRent: 3600,
      landlordRent: 2800,
      rentDueDate: addDays(5),
      renovationDate: "2025-11-18",
      appliances: "空调 2 台、冰箱、洗衣机、热水器",
      furniture: "双人床、衣柜、餐桌、沙发",
      note: "到期前提醒租客续租，并检查空调清洗。",
    },
    {
      id: "p2",
      communityId: "c1",
      name: "8 栋 703",
      layout: "一室一厅",
      area: 54,
      status: "vacant",
      tenant: "",
      monthlyRent: 2450,
      landlordRent: 2050,
      rentDueDate: addDays(15),
      renovationDate: "2026-03-02",
      appliances: "空调、冰箱、洗衣机",
      furniture: "床、书桌、衣柜",
      note: "待出租，建议补拍采光照片。",
    },
    {
      id: "p3",
      communityId: "c2",
      name: "1 栋 1801",
      layout: "三室两厅",
      area: 118,
      status: "rented",
      tenant: "张先生",
      monthlyRent: 5200,
      landlordRent: 4300,
      rentDueDate: addDays(-2),
      renovationDate: "2025-08-10",
      appliances: "中央空调、冰箱、洗衣机、电视",
      furniture: "三张床、餐桌、沙发、书柜",
      note: "房租已逾期，需要电话确认付款时间。",
    },
  ],
  transactions: [
    {
      id: "t1",
      communityId: "c1",
      propertyId: "p1",
      type: "income",
      category: "租金收入",
      amount: 3600,
      date: today(),
      note: "5 月租金",
    },
    {
      id: "t2",
      communityId: "c1",
      propertyId: "p1",
      type: "expense",
      category: "房东租金",
      amount: 2800,
      date: today(),
      note: "5 月成本",
    },
    {
      id: "t3",
      communityId: "c1",
      propertyId: "p2",
      type: "expense",
      category: "装修维护",
      amount: 860,
      date: addDays(-3),
      note: "补漆和清洁",
    },
    {
      id: "t4",
      communityId: "c2",
      propertyId: "p3",
      type: "income",
      category: "租金收入",
      amount: 5200,
      date: addDays(-28),
      note: "上月租金",
    },
    {
      id: "t5",
      communityId: "c2",
      propertyId: "p3",
      type: "expense",
      category: "房东租金",
      amount: 4300,
      date: addDays(-28),
      note: "上月成本",
    },
  ],
});

let state = loadLocalState();
let currentUser = null;
let authMode = "login";
let syncTimer = null;

const els = {
  authScreen: document.querySelector("#authScreen"),
  appShell: document.querySelector("#appShell"),
  authForm: document.querySelector("#authForm"),
  authName: document.querySelector("#authName"),
  authMessage: document.querySelector("#authMessage"),
  loginTab: document.querySelector("#loginTab"),
  registerTab: document.querySelector("#registerTab"),
  currentUser: document.querySelector("#currentUser"),
  userAdminBtn: document.querySelector("#userAdminBtn"),
  communityList: document.querySelector("#communityList"),
  communitySearch: document.querySelector("#communitySearch"),
  pageTitle: document.querySelector("#pageTitle"),
  communityHeading: document.querySelector("#communityHeading"),
  communitySummary: document.querySelector("#communitySummary"),
  propertyGrid: document.querySelector("#propertyGrid"),
  transactionTable: document.querySelector("#transactionTable"),
  rentAlerts: document.querySelector("#rentAlerts"),
  optimizationList: document.querySelector("#optimizationList"),
  totalIncome: document.querySelector("#totalIncome"),
  totalExpense: document.querySelector("#totalExpense"),
  netProfit: document.querySelector("#netProfit"),
  profitRate: document.querySelector("#profitRate"),
  alertCount: document.querySelector("#alertCount"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  modalTitle: document.querySelector("#modalTitle"),
  modalForm: document.querySelector("#modalForm"),
};

document.querySelector("#addCommunityBtn").addEventListener("click", () => openCommunityModal());
document.querySelector("#addPropertyBtn").addEventListener("click", () => openPropertyModal());
document.querySelector("#addTransactionBtn").addEventListener("click", () => openTransactionModal());
document.querySelector("#closeModalBtn").addEventListener("click", closeModal);
document.querySelector("#briefBtn").addEventListener("click", openBriefModal);
document.querySelector("#syncBtn").addEventListener("click", () => syncNow(true));
document.querySelector("#exportFinanceBtn").addEventListener("click", openFinanceExportModal);
document.querySelector("#logoutBtn").addEventListener("click", logout);
document.querySelector("#demoBtn").addEventListener("click", openPropertyImportModal);
els.userAdminBtn.addEventListener("click", openUserAdminModal);
els.communitySearch.addEventListener("input", renderCommunities);
els.loginTab.addEventListener("click", () => setAuthMode("login"));
els.registerTab.addEventListener("click", () => setAuthMode("register"));
els.authForm.addEventListener("submit", submitAuth);
els.loginTab.onclick = () => setAuthMode("login");
els.registerTab.onclick = () => setAuthMode("register");
els.authForm.onsubmit = submitAuth;
els.modalBackdrop.addEventListener("click", (event) => {
  if (event.target === els.modalBackdrop) closeModal();
});

window.setAuthMode = setAuthMode;
window.submitAuth = submitAuth;
setAuthMode("login");
boot();

async function boot() {
  try {
    const { user } = await api("/api/auth/me");
    currentUser = user;
    const payload = await api("/api/ledger");
    state = normalizeState(payload.data || defaultState());
    saveLocalState();
    showApp();
  } catch {
    showAuth();
  }
}

function showAuth() {
  els.authScreen.hidden = false;
  els.appShell.hidden = true;
}

function showApp() {
  els.authScreen.hidden = true;
  els.appShell.hidden = false;
  els.currentUser.textContent = `${currentUser.name || currentUser.email} · ${currentUser.role === "admin" ? "管理员" : "成员"}`;
  els.userAdminBtn.hidden = currentUser.role !== "admin";
  render();
}

function setAuthMode(mode) {
  authMode = mode;
  els.loginTab.classList.toggle("active", mode === "login");
  els.registerTab.classList.toggle("active", mode === "register");
  els.authName.closest(".form-field").hidden = mode === "login";
  els.authForm.querySelector(".auth-submit").textContent = mode === "login" ? "登录" : "注册并进入";
  els.authMessage.textContent = "";
}

async function submitAuth(event) {
  event.preventDefault();
  els.authMessage.textContent = "";
  const submitButton = els.authForm.querySelector(".auth-submit");
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = authMode === "login" ? "正在登录..." : "正在注册...";
  const payload = Object.fromEntries(new FormData(els.authForm).entries());
  try {
    const { user } = await api(`/api/auth/${authMode}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    currentUser = user;
    const ledger = await api("/api/ledger");
    state = normalizeState(ledger.data || defaultState());
    saveLocalState();
    showApp();
  } catch (error) {
    els.authMessage.textContent = authErrorMessage(error.message, authMode);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

function authErrorMessage(message, mode) {
  const text = String(message || "").trim();
  const messages = {
    "Email already registered": "这个邮箱已经注册，请直接登录或换一个邮箱。",
    "Invalid email or password": "邮箱或密码不正确，请检查后再登录。",
    "Invalid email or password shorter than 8 characters": "请填写有效邮箱，密码至少 8 位。",
    "Account disabled": "账号已停用，请联系管理员。",
    "Please sign in first": "请先登录后再继续操作。",
    "Admin permission required": "当前账号没有管理员权限。",
    "User not found": "用户不存在或已被删除。",
  };
  if (messages[text]) return messages[text];
  if (text.includes("already registered") || text.includes("这个邮箱已经注册")) {
    return "这个邮箱已经注册，请直接登录或换一个邮箱。";
  }
  if (text.includes("Invalid email or password") || text.includes("邮箱或密码不正确")) {
    return "邮箱或密码不正确，请检查后再登录。";
  }
  if (text.includes("DATABASE_URL")) {
    return "数据库还没有配置，暂时无法完成登录或注册。";
  }
  if (text.includes("SESSION_SECRET")) {
    return "服务端会话密钥未配置，请先补充环境变量。";
  }
  if (text.includes("timeout") || text.includes("Failed to fetch") || text.includes("Load failed")) {
    return "服务暂时没有响应，请确认本地服务已启动后重试。";
  }
  return mode === "register" ? "注册失败，请检查信息后重试。" : "登录失败，请检查信息后重试。";
}

async function logout() {
  await api("/api/auth/logout", { method: "POST" }).catch(() => {});
  currentUser = null;
  showAuth();
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("request timeout")), 8000);
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    signal: controller.signal,
    ...options,
  }).finally(() => clearTimeout(timer));
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "请求失败，请稍后再试");
  return body;
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : defaultState());
  } catch {
    return defaultState();
  }
}

function normalizeState(value) {
  return normalizeTransactionSnapshots({
    selectedCommunityId: value?.selectedCommunityId || "all",
    communities: Array.isArray(value?.communities) ? value.communities : [],
    properties: Array.isArray(value?.properties) ? value.properties : [],
    transactions: Array.isArray(value?.transactions) ? value.transactions : [],
  });
}

function normalizeTransactionSnapshots(value) {
  const communities = value.communities || [];
  const properties = value.properties || [];
  return {
    ...value,
    transactions: (value.transactions || []).map((transaction) => {
      const community = communities.find((item) => item.id === transaction.communityId);
      const property = properties.find((item) => item.id === transaction.propertyId);
      return {
        ...transaction,
        communitySnapshotId: transaction.communitySnapshotId || transaction.communityId || "",
        propertySnapshotId: transaction.propertySnapshotId || transaction.propertyId || "",
        communityName: transaction.communityName || community?.name || "",
        propertyName: transaction.propertyName || property?.name || "",
      };
    }),
  };
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow(false), 450);
}

async function syncNow(showNotice) {
  try {
    await api("/api/ledger", {
      method: "PUT",
      body: JSON.stringify({ data: state }),
    });
    if (showNotice) alert("数据已同步到 PostgreSQL");
  } catch (error) {
    if (showNotice) alert(error.message);
  }
}

function selectedCommunity() {
  return state.communities.find((item) => item.id === state.selectedCommunityId);
}

function scopedProperties() {
  if (state.selectedCommunityId === "all") return state.properties;
  return state.properties.filter((property) => property.communityId === state.selectedCommunityId);
}

function scopedTransactions() {
  const propertyIds = new Set(scopedProperties().map((item) => item.id));
  if (state.selectedCommunityId === "all") return state.transactions;
  return state.transactions.filter(
    (item) =>
      item.communityId === state.selectedCommunityId ||
      propertyIds.has(item.propertyId) ||
      item.communitySnapshotId === state.selectedCommunityId,
  );
}

function totals(transactions = scopedTransactions()) {
  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expense = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return { income, expense, profit: income - expense };
}

function render() {
  renderCommunities();
  renderKpis();
  renderProperties();
  renderTransactions();
  renderAlerts();
  renderOptimization();
  saveLocalState();
  if (currentUser) scheduleSync();
}

function renderCommunities() {
  const query = els.communitySearch.value.trim().toLowerCase();
  const communityStats = new Map(
    state.communities.map((community) => {
      const tx = state.transactions.filter((item) => item.communityId === community.id);
      const stat = totals(tx);
      const count = state.properties.filter((property) => property.communityId === community.id).length;
      return [community.id, { ...stat, count }];
    }),
  );
  const filtered = state.communities.filter((item) => `${item.name} ${item.district}`.toLowerCase().includes(query));
  const allStat = totals(state.transactions);
  const allButton = communityButton({
    id: "all",
    name: "全部小区",
    district: `${state.communities.length} 个小区 · ${state.properties.length} 套房源 · ${money(allStat.profit)}`,
  });
  els.communityList.innerHTML =
    allButton +
    filtered
      .map((item) => {
        const stat = communityStats.get(item.id);
        return communityButton({
          id: item.id,
          name: item.name,
          district: `${item.district || "未填写片区"} · ${stat.count} 套 · ${money(stat.profit)}`,
          editable: true,
        });
      })
      .join("");
  els.communityList.querySelectorAll(".community-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCommunityId = button.dataset.id;
      render();
    });
  });
  els.communityList.querySelectorAll(".community-edit-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const community = state.communities.find((item) => item.id === button.dataset.id);
      if (community) openCommunityModal(community);
    });
  });
}

function communityButton(item) {
  const active = state.selectedCommunityId === item.id ? "active" : "";
  return `
    <button class="community-item ${active}" type="button" data-id="${item.id}">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.district)}</span>
      ${
        item.editable
          ? `<span class="community-edit-button" role="button" tabindex="0" title="编辑小区" aria-label="编辑小区" data-id="${item.id}">编辑</span>`
          : ""
      }
    </button>
  `;
}

function renderKpis() {
  const stat = totals();
  const dueCount = scopedProperties().filter((property) => {
    const diff = daysBetween(property.rentDueDate);
    return property.status === "rented" && diff <= 7;
  }).length;
  els.totalIncome.textContent = money(stat.income);
  els.totalExpense.textContent = money(stat.expense);
  els.netProfit.textContent = money(stat.profit);
  els.profitRate.textContent = `利润率 ${stat.income ? Math.round((stat.profit / stat.income) * 100) : 0}%`;
  els.alertCount.textContent = `${dueCount} 套`;

  const community = selectedCommunity();
  els.pageTitle.textContent = community ? `${community.name}经营概览` : "全部经营概览";
  els.communityHeading.textContent = community ? community.name : "全部小区";
}

function renderProperties() {
  const properties = scopedProperties();
  const stat = totals();
  const rented = properties.filter((item) => item.status === "rented").length;
  const vacant = properties.filter((item) => item.status === "vacant").length;
  els.communitySummary.innerHTML = [
    ["房源数量", `${properties.length} 套`],
    ["已出租", `${rented} 套`],
    ["待出租", `${vacant} 套`],
    ["净利润", money(stat.profit)],
  ]
    .map(([label, value]) => `<div class="summary-chip"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  if (!properties.length) {
    els.propertyGrid.innerHTML = `<div class="empty-state">当前小区还没有房源，点击“添加房源”开始记录。</div>`;
    return;
  }

  els.propertyGrid.innerHTML = properties
    .map((property) => {
      const community = state.communities.find((item) => item.id === property.communityId);
      const diff = daysBetween(property.rentDueDate);
      const overdue = property.status === "rented" && diff < 0;
      const cardStatus = overdue ? "overdue" : property.status;
      const statusText = overdue ? "房租逾期" : property.status === "rented" ? "已出租" : "待出租";
      const dueText =
        property.status === "rented"
          ? diff < 0
            ? `逾期 ${Math.abs(diff)} 天`
            : diff <= 7
              ? `${diff} 天后交租`
              : `${property.rentDueDate} 交租`
          : "当前空置";
      return `
        <article class="property-card ${cardStatus}">
          <div>
            <h4>${escapeHtml(property.name)}</h4>
            <p>${escapeHtml(community?.name || "未归属小区")} · ${escapeHtml(property.layout || "未填户型")} · ${property.area || 0}㎡</p>
          </div>
          <div class="property-meta">
            <span class="tag ${cardStatus}">${statusText}</span>
            <span class="tag neutral">${escapeHtml(dueText)}</span>
          </div>
          <p>月租 ${money(property.monthlyRent)} · 房东成本 ${money(property.landlordRent)}</p>
          <p>装修：${escapeHtml(property.renovationDate || "未记录")}</p>
          <div class="card-actions">
            <button class="secondary-button" type="button" data-action="detail" data-id="${property.id}">详情</button>
            <button class="ghost-button" type="button" data-action="quick-income" data-id="${property.id}">收租</button>
          </div>
        </article>
      `;
    })
    .join("");

  els.propertyGrid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const property = state.properties.find((item) => item.id === button.dataset.id);
      if (button.dataset.action === "detail") openPropertyModal(property);
      if (button.dataset.action === "quick-income") {
        openTransactionModal({
          communityId: property.communityId,
          propertyId: property.id,
          type: "income",
          category: "租金收入",
          amount: property.monthlyRent,
          date: today(),
          note: `${property.name} 收租`,
        });
      }
    });
  });
}

function renderTransactions() {
  const rows = scopedTransactions().slice().sort(byDateDesc);
  if (!rows.length) {
    els.transactionTable.innerHTML = `<tr><td colspan="6">暂无流水，点击“记一笔”添加收入或成本。</td></tr>`;
    return;
  }
  els.transactionTable.innerHTML = rows
    .map((item) => {
      const community = state.communities.find((c) => c.id === item.communityId);
      const property = state.properties.find((p) => p.id === item.propertyId);
      const communityName = community?.name || item.communityName || "-";
      const propertyName = property?.name || item.propertyName || "-";
      return `
        <tr>
          <td>${escapeHtml(item.date)}</td>
          <td>${item.type === "income" ? "收入" : "成本"}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(communityName)} / ${escapeHtml(propertyName)}</td>
          <td class="${item.type === "income" ? "amount-income" : "amount-expense"}">
            ${item.type === "income" ? "+" : "-"}${money(item.amount)}
          </td>
          <td>${escapeHtml(item.note || "")}</td>
        </tr>
      `;
    })
    .join("");
}

function rentAlertItems() {
  return scopedProperties()
    .filter((property) => property.status === "rented")
    .map((property) => ({ ...property, diff: daysBetween(property.rentDueDate) }))
    .filter((property) => property.diff <= 7)
    .sort((a, b) => a.diff - b.diff);
}

function renderAlerts() {
  const alerts = rentAlertItems();
  if (!alerts.length) {
    els.rentAlerts.innerHTML = `<div class="empty-state">7 天内没有待交房租提醒。</div>`;
    return;
  }
  els.rentAlerts.innerHTML = alerts
    .map((property) => {
      const community = state.communities.find((item) => item.id === property.communityId);
      const overdue = property.diff < 0;
      return `
        <div class="alert-item ${overdue ? "overdue" : "soon"}">
          <strong>${escapeHtml(community?.name || "")} · ${escapeHtml(property.name)}</strong>
          <p>${overdue ? `已逾期 ${Math.abs(property.diff)} 天` : `${property.diff} 天后到期`}，应收租金 ${money(property.monthlyRent)}，租客 ${escapeHtml(property.tenant || "未填写")}。</p>
        </div>
      `;
    })
    .join("");
}

function renderOptimization() {
  const properties = scopedProperties();
  const tx = scopedTransactions();
  const stat = totals(tx);
  const insights = [];
  const vacant = properties.filter((item) => item.status === "vacant");
  const rentGap = properties.reduce(
    (sum, item) => sum + (Number(item.monthlyRent || 0) - Number(item.landlordRent || 0)),
    0,
  );
  const categoryCost = tx
    .filter((item) => item.type === "expense")
    .reduce((map, item) => {
      map[item.category] = (map[item.category] || 0) + Number(item.amount || 0);
      return map;
    }, {});
  const highestCost = Object.entries(categoryCost).sort((a, b) => b[1] - a[1])[0];

  if (stat.profit < 0) {
    insights.push(["利润为负", "优先检查房东租金、装修维护和空置期，先止损再扩张。"]);
  }
  if (vacant.length) {
    insights.push(["空置房源", `${vacant.length} 套待出租，建议补充照片、调整挂牌价或推出短期优惠。`]);
  }
  if (highestCost) {
    insights.push(["最大成本项", `${highestCost[0]} 当前累计 ${money(highestCost[1])}，可按供应商或房源复盘。`]);
  }
  if (properties.length && rentGap / properties.length < 500) {
    insights.push(["租差偏低", `平均月租差约 ${money(rentGap / properties.length)}，续签时可重新谈房东成本。`]);
  }
  if (!insights.length) {
    insights.push(["经营健康", "当前利润和空置情况较稳定，建议继续保持到期提醒和费用分类记录。"]);
  }

  els.optimizationList.innerHTML = insights
    .map(([title, text]) => `<div class="insight-item"><strong>${title}</strong><p>${text}</p></div>`)
    .join("");
}

function openCommunityModal(community = null) {
  const isEdit = Boolean(community);
  els.modalTitle.textContent = isEdit ? "编辑小区" : "新建小区";
  els.modalForm.innerHTML = `
    <div class="form-grid">
      ${field("小区名称", "name", community?.name || "", "text", "full")}
      ${field("片区", "district", community?.district || "")}
      ${field("负责人 / 合作方式", "manager", community?.manager || "")}
      ${textArea("备注", "note", community?.note || "", "full")}
    </div>
    <div class="form-actions">
      ${isEdit ? `<button class="danger-button" type="button" data-delete-community="${community.id}">删除小区</button>` : "<span></span>"}
      <div class="right">
        <button class="secondary-button" type="button" data-close>取消</button>
        <button class="primary-button" type="submit">保存</button>
      </div>
    </div>
  `;
  els.modalForm.onsubmit = (event) => {
    event.preventDefault();
    const data = formData();
    if (!data.name) return alert("请填写小区名称");
    if (isEdit) Object.assign(community, data);
    else {
      const created = { id: uid(), ...data };
      state.communities.push(created);
      state.selectedCommunityId = created.id;
    }
    closeModal();
    render();
  };
  const deleteBtn = els.modalForm.querySelector("[data-delete-community]");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => openCommunityDeleteConfirm(community));
  }
  bindCloseButtons();
  showModal();
}

function openCommunityDeleteConfirm(community) {
  const properties = state.properties.filter((item) => item.communityId === community.id);
  const propertyIds = new Set(properties.map((item) => item.id));
  const transactions = state.transactions.filter(
    (item) => item.communityId === community.id || propertyIds.has(item.propertyId),
  );
  els.modalTitle.textContent = "确认删除小区";
  els.modalForm.innerHTML = `
    <div class="empty-state">
      删除后将移除该小区下的 ${properties.length} 套房源。${transactions.length} 条相关收支流水会保留为历史财务记录，并保存当时的小区和房源名称。
    </div>
    <div class="form-grid">
      <div class="form-field full">
        <label for="confirmCommunityName">请输入小区名称确认删除：${escapeHtml(community.name)}</label>
        <input id="confirmCommunityName" name="confirmCommunityName" autocomplete="off" />
      </div>
    </div>
    <div class="form-actions">
      <button class="secondary-button" type="button" id="backToCommunityEditBtn">返回编辑</button>
      <div class="right">
        <button class="secondary-button" type="button" data-close>取消</button>
        <button class="danger-button" type="submit">确认删除</button>
      </div>
    </div>
  `;
  document.querySelector("#backToCommunityEditBtn").addEventListener("click", () => openCommunityModal(community));
  els.modalForm.onsubmit = (event) => {
    event.preventDefault();
    const confirmName = formData().confirmCommunityName.trim();
    if (confirmName !== community.name) {
      alert("小区名称不匹配，未执行删除");
      return;
    }
    state.communities = state.communities.filter((item) => item.id !== community.id);
    state.properties = state.properties.filter((item) => item.communityId !== community.id);
    state.transactions = state.transactions.map((item) => {
      if (item.communityId !== community.id && !propertyIds.has(item.propertyId)) return item;
      const property = properties.find((propertyItem) => propertyItem.id === item.propertyId);
      return {
        ...item,
        communitySnapshotId: item.communitySnapshotId || community.id,
        propertySnapshotId: item.propertySnapshotId || item.propertyId,
        communityName: item.communityName || community.name,
        propertyName: item.propertyName || property?.name || "",
        communityId: "",
        propertyId: "",
      };
    });
    state.selectedCommunityId = "all";
    closeModal();
    render();
  };
  bindCloseButtons();
}

function openPropertyModal(property = null) {
  if (!state.communities.length) return alert("请先新建小区");
  const currentCommunityId =
    property?.communityId || (state.selectedCommunityId === "all" ? state.communities[0].id : state.selectedCommunityId);
  const isEdit = Boolean(property?.id);
  els.modalTitle.textContent = isEdit ? "房源详情" : "添加房源";
  els.modalForm.innerHTML = `
    <div class="form-grid">
      ${selectField("所属小区", "communityId", state.communities.map((item) => [item.id, item.name]), currentCommunityId)}
      ${field("房源名称", "name", property?.name || "", "text")}
      ${field("户型", "layout", property?.layout || "")}
      ${field("面积（㎡）", "area", property?.area || "", "number")}
      ${selectField("出租状态", "status", [["rented", "已出租"], ["vacant", "待出租"]], property?.status || "vacant")}
      ${field("租客", "tenant", property?.tenant || "")}
      ${field("月租收入", "monthlyRent", property?.monthlyRent || "", "number")}
      ${field("房东租金成本", "landlordRent", property?.landlordRent || "", "number")}
      ${field("下次交租日", "rentDueDate", property?.rentDueDate || today(), "date")}
      ${field("装修时间", "renovationDate", property?.renovationDate || "", "date")}
      ${textArea("房内家电", "appliances", property?.appliances || "", "full")}
      ${textArea("家具配置", "furniture", property?.furniture || "", "full")}
      ${textArea("备注", "note", property?.note || "", "full")}
    </div>
    <div class="form-actions">
      ${isEdit ? `<button class="danger-button" type="button" data-delete-property="${property.id}">删除房源</button>` : "<span></span>"}
      <div class="right">
        <button class="secondary-button" type="button" data-close>取消</button>
        <button class="primary-button" type="submit">保存</button>
      </div>
    </div>
  `;
  els.modalForm.onsubmit = (event) => {
    event.preventDefault();
    const data = normalizePropertyData(formData());
    if (!data.name) return alert("请填写房源名称");
    if (isEdit) Object.assign(property, data);
    else state.properties.push({ id: uid(), ...data });
    closeModal();
    render();
  };
  const deleteBtn = els.modalForm.querySelector("[data-delete-property]");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (!confirm("确定删除这个房源吗？相关收支流水会保留为历史财务记录。")) return;
      const community = state.communities.find((item) => item.id === property.communityId);
      state.transactions = state.transactions.map((item) => {
        if (item.propertyId !== property.id) return item;
        return {
          ...item,
          communitySnapshotId: item.communitySnapshotId || property.communityId,
          propertySnapshotId: item.propertySnapshotId || property.id,
          communityName: item.communityName || community?.name || "",
          propertyName: item.propertyName || property.name,
          propertyId: "",
        };
      });
      state.properties = state.properties.filter((item) => item.id !== property.id);
      closeModal();
      render();
    });
  }
  bindCloseButtons();
  showModal();
}

function openTransactionModal(seed = {}) {
  if (!state.communities.length) return alert("请先新建小区");
  const communityId =
    seed.communityId || (state.selectedCommunityId === "all" ? state.communities[0].id : state.selectedCommunityId);
  const propertyOptions = state.properties
    .filter((item) => item.communityId === communityId)
    .map((item) => [item.id, item.name]);
  const selectedProperty = state.properties.find((item) => item.id === seed.propertyId);
  const propertySearchValue = selectedProperty ? selectedProperty.name : "";
  const typeValue = seed.type || "income";
  const categoryValue = seed.category || TRANSACTION_CATEGORIES[typeValue][0];
  els.modalTitle.textContent = "新增收支流水";
  els.modalForm.innerHTML = `
    <div class="form-grid">
      ${selectField("类型", "type", [["income", "收入"], ["expense", "成本"]], typeValue)}
      ${field("分类", "category", categoryValue, "text", "", "transactionCategoryOptions")}
      ${selectField("所属小区", "communityId", state.communities.map((item) => [item.id, item.name]), communityId)}
      <div class="form-field">
        <label for="propertySearch">关联房源</label>
        <input id="propertySearch" name="propertySearch" list="propertyOptions" value="${escapeAttr(propertySearchValue)}" placeholder="输入房源名快速查找，不关联可留空" autocomplete="off" />
        <input id="propertyId" name="propertyId" type="hidden" value="${escapeAttr(seed.propertyId || "")}" />
        <datalist id="propertyOptions">
          ${propertyOptions.map(([optionValue, text]) => `<option value="${escapeAttr(text)}" data-id="${escapeAttr(optionValue)}"></option>`).join("")}
        </datalist>
      </div>
      ${field("金额", "amount", seed.amount || "", "number")}
      ${field("日期", "date", seed.date || today(), "date")}
      ${textArea("备注", "note", seed.note || "", "full")}
    </div>
    <datalist id="transactionCategoryOptions">
      ${TRANSACTION_CATEGORIES[typeValue].map((item) => `<option value="${escapeAttr(item)}"></option>`).join("")}
    </datalist>
    <div class="form-actions">
      <span></span>
      <div class="right">
        <button class="secondary-button" type="button" data-close>取消</button>
        <button class="secondary-button" type="submit" name="submitAction" value="save-add" title="保存这一笔，然后清空金额和备注，继续录入下一笔。">保存并新增</button>
        <button class="primary-button" type="submit" name="submitAction" value="save">保存</button>
      </div>
    </div>
  `;
  const communitySelect = els.modalForm.querySelector('[name="communityId"]');
  communitySelect.addEventListener("change", () => {
    const current = formData();
    openTransactionModal({ ...current, communityId: communitySelect.value, propertyId: "" });
  });
  const typeSelect = els.modalForm.querySelector('[name="type"]');
  const propertySearch = els.modalForm.querySelector('[name="propertySearch"]');
  const propertyIdInput = els.modalForm.querySelector('[name="propertyId"]');
  const categoryInput = els.modalForm.querySelector('[name="category"]');
  const amountInput = els.modalForm.querySelector('[name="amount"]');
  const dateInput = els.modalForm.querySelector('[name="date"]');
  const resolvePropertyId = () => {
    const matched = state.properties.find(
      (item) => item.communityId === communitySelect.value && item.name === propertySearch.value.trim(),
    );
    propertyIdInput.value = matched ? matched.id : "";
    return matched;
  };
  const refreshCategories = () => {
    const options = TRANSACTION_CATEGORIES[typeSelect.value];
    document.querySelector("#transactionCategoryOptions").innerHTML = options
      .map((item) => `<option value="${escapeAttr(item)}"></option>`)
      .join("");
    if (!categoryInput.value || !TRANSACTION_CATEGORIES.income.includes(categoryInput.value) && !TRANSACTION_CATEGORIES.expense.includes(categoryInput.value)) return;
    categoryInput.value = options[0];
  };
  const syncRentDueDate = () => {
    const property = resolvePropertyId();
    const amount = Number(amountInput.value || 0);
    const monthlyRent = Number(property?.monthlyRent || 0);
    const isRentIncome =
      typeSelect.value === "income" &&
      property &&
      monthlyRent > 0 &&
      String(categoryInput.value || "").includes("租");
    if (!isRentIncome || amount < monthlyRent) return;
    const monthsPaid = Math.max(1, Math.floor(amount / monthlyRent + 0.000001));
    dateInput.value = addMonths(property.rentDueDate || today(), monthsPaid);
  };
  typeSelect.addEventListener("change", () => {
    refreshCategories();
    syncRentDueDate();
  });
  [propertySearch, categoryInput, amountInput].forEach((input) => {
    input.addEventListener("input", syncRentDueDate);
    input.addEventListener("change", syncRentDueDate);
  });
  syncRentDueDate();
  els.modalForm.onsubmit = (event) => {
    event.preventDefault();
    const submitAction = event.submitter?.value || "save";
    resolvePropertyId();
    const data = formData();
    if (!data.amount || Number(data.amount) <= 0) return alert("请填写有效金额");
    const property = state.properties.find((item) => item.id === data.propertyId);
    const community = state.communities.find((item) => item.id === data.communityId);
    if (
      property &&
      data.type === "income" &&
      String(data.category || "").includes("租") &&
      Number(data.amount || 0) >= Number(property.monthlyRent || 0)
    ) {
      property.rentDueDate = data.date;
      property.status = "rented";
    }
    state.transactions.push({
      id: uid(),
      ...data,
      communitySnapshotId: data.communityId,
      propertySnapshotId: data.propertyId,
      communityName: community?.name || "",
      propertyName: property?.name || "",
      amount: Number(data.amount),
    });
    if (submitAction === "save-add") {
      render();
      openTransactionModal({
        type: data.type,
        category: data.category,
        communityId: data.communityId,
        propertyId: data.propertyId,
        amount: "",
        date: today(),
        note: "",
      });
      return;
    }
    closeModal();
    render();
  };
  bindCloseButtons();
  showModal();
}

function openBriefModal() {
  const alerts = rentAlertItems();
  const stat = totals();
  const vacant = scopedProperties().filter((item) => item.status === "vacant");
  const lines = [
    `${today()} 每日经营简报`,
    "",
    `收入：${money(stat.income)}，成本：${money(stat.expense)}，净利润：${money(stat.profit)}。`,
    `当前范围共有 ${scopedProperties().length} 套房源，其中待出租 ${vacant.length} 套。`,
    "",
    alerts.length ? "待交房租提醒：" : "待交房租提醒：7 天内暂无到期房源。",
    ...alerts.map((property) => {
      const community = state.communities.find((item) => item.id === property.communityId);
      return `- ${community?.name || ""} ${property.name}，${property.diff < 0 ? `逾期 ${Math.abs(property.diff)} 天` : `${property.diff} 天后到期`}，金额 ${money(property.monthlyRent)}，租客 ${property.tenant || "未填写"}`;
    }),
  ];
  els.modalTitle.textContent = "今日经营简报";
  els.modalForm.innerHTML = `
    <div class="brief-text">${escapeHtml(lines.join("\n"))}</div>
    <div class="form-actions">
      <span></span>
      <div class="right">
        <button class="secondary-button" type="button" data-close>关闭</button>
        <button class="primary-button" type="button" id="copyBriefBtn">复制简报</button>
      </div>
    </div>
  `;
  document.querySelector("#copyBriefBtn").addEventListener("click", async () => {
    await navigator.clipboard.writeText(lines.join("\n"));
    alert("简报已复制");
  });
  bindCloseButtons();
  showModal();
}

function openFinanceExportModal() {
  const dates = state.transactions.map((item) => item.date).filter(Boolean).sort();
  const start = dates[0] || today();
  const end = dates[dates.length - 1] || today();
  els.modalTitle.textContent = "财务数据导出";
  els.modalForm.innerHTML = `
    <div class="form-grid">
      ${field("开始日期", "startDate", start, "date")}
      ${field("结束日期", "endDate", end, "date")}
    </div>
    <div class="empty-state">将按日期范围导出当前账号的收支流水，文件可用 Excel 直接打开。</div>
    <div class="form-actions">
      <span></span>
      <div class="right">
        <button class="secondary-button" type="button" data-close>取消</button>
        <button class="primary-button" type="submit">导出 Excel</button>
      </div>
    </div>
  `;
  els.modalForm.onsubmit = (event) => {
    event.preventDefault();
    const { startDate, endDate } = formData();
    if (!startDate || !endDate) return alert("请选择开始日期和结束日期");
    if (startDate > endDate) return alert("开始日期不能晚于结束日期");
    exportFinanceExcel(startDate, endDate);
    closeModal();
  };
  bindCloseButtons();
  showModal();
}

function exportFinanceExcel(startDate, endDate) {
  const rows = state.transactions
    .filter((item) => item.date >= startDate && item.date <= endDate)
    .slice()
    .sort(byDateDesc)
    .map((item) => {
      const community = state.communities.find((communityItem) => communityItem.id === item.communityId);
      const property = state.properties.find((propertyItem) => propertyItem.id === item.propertyId);
      return {
        date: item.date,
        type: item.type === "income" ? "收入" : "成本",
        category: item.category || "",
        community: community?.name || item.communityName || "",
        property: property?.name || item.propertyName || "",
        amount: Number(item.amount || 0),
        signedAmount: item.type === "income" ? Number(item.amount || 0) : -Number(item.amount || 0),
        note: item.note || "",
      };
    });
  if (!rows.length) {
    alert("所选日期范围内没有可导出的财务流水");
    return;
  }
  const income = rows.filter((item) => item.signedAmount > 0).reduce((sum, item) => sum + item.amount, 0);
  const expense = rows.filter((item) => item.signedAmount < 0).reduce((sum, item) => sum + item.amount, 0);
  const tableRows = rows
    .map(
      (item) => `
        <tr>
          <td>${excelCell(item.date)}</td>
          <td>${excelCell(item.type)}</td>
          <td>${excelCell(item.category)}</td>
          <td>${excelCell(item.community)}</td>
          <td>${excelCell(item.property)}</td>
          <td style="mso-number-format:'0.00';">${item.amount}</td>
          <td style="mso-number-format:'0.00';">${item.signedAmount}</td>
          <td>${excelCell(item.note)}</td>
        </tr>
      `,
    )
    .join("");
  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: "Microsoft YaHei", Arial, sans-serif; }
          th { background: #207a5c; color: #ffffff; font-weight: 700; }
          th, td { border: 1px solid #b7c5c0; padding: 8px 10px; }
          .summary th { background: #d8b15f; color: #16201f; }
        </style>
      </head>
      <body>
        <table class="summary">
          <tr><th colspan="2">房产中介经营记账本 - 财务数据导出</th></tr>
          <tr><td>开始日期</td><td>${excelCell(startDate)}</td></tr>
          <tr><td>结束日期</td><td>${excelCell(endDate)}</td></tr>
          <tr><td>收入合计</td><td>${income}</td></tr>
          <tr><td>成本合计</td><td>${expense}</td></tr>
          <tr><td>净额</td><td>${income - expense}</td></tr>
        </table>
        <br />
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>分类</th>
              <th>小区</th>
              <th>房源</th>
              <th>金额</th>
              <th>收入/成本净额</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `财务数据_${startDate}_${endDate}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function excelCell(value = "") {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

const PROPERTY_IMPORT_HEADERS = [
  "小区名称",
  "片区",
  "负责人/合作方式",
  "小区备注",
  "房源名称",
  "户型",
  "面积㎡",
  "出租状态",
  "租客",
  "月租收入",
  "房东租金成本",
  "下次交租日",
  "装修时间",
  "房内家电",
  "家具配置",
  "房源备注",
];

function openPropertyImportModal() {
  els.modalTitle.textContent = "导入房产信息";
  els.modalForm.innerHTML = `
    <div class="empty-state">
      先下载 Excel 模板，按表头填写小区和房源信息，再选择填好的模板导入。系统会按“小区名称 + 房源名称”新增或更新房源，不会清空现有数据。
    </div>
    <div class="form-grid">
      <div class="form-field full">
        <label for="propertyImportFile">选择已填写的模板文件</label>
        <input id="propertyImportFile" name="propertyImportFile" type="file" accept=".xls,.html,.htm" />
      </div>
    </div>
    <div class="form-actions">
      <button class="secondary-button" type="button" id="downloadPropertyTemplateBtn">下载 Excel 模板</button>
      <div class="right">
        <button class="secondary-button" type="button" data-close>取消</button>
        <button class="primary-button" type="submit">导入房产信息</button>
      </div>
    </div>
  `;
  document.querySelector("#downloadPropertyTemplateBtn").addEventListener("click", downloadPropertyImportTemplate);
  els.modalForm.onsubmit = async (event) => {
    event.preventDefault();
    const file = document.querySelector("#propertyImportFile").files[0];
    if (!file) return alert("请先选择填写好的 Excel 模板文件");
    try {
      const result = await importPropertyWorkbook(file);
      closeModal();
      render();
      alert(`导入完成：新增小区 ${result.createdCommunities} 个，新增房源 ${result.createdProperties} 套，更新房源 ${result.updatedProperties} 套。`);
    } catch (error) {
      alert(error.message || "导入失败，请检查模板格式");
    }
  };
  bindCloseButtons();
  showModal();
}

function downloadPropertyImportTemplate() {
  const sampleRows = [
    [
      "滨江花园",
      "河西片区",
      "自营",
      "主做两居室",
      "8 栋 703",
      "一室一厅",
      54,
      "待出租",
      "",
      2455,
      2050,
      today(),
      today(),
      "空调、冰箱、洗衣机",
      "床、书桌、衣柜",
      "采光好，待出租",
    ],
  ];
  const html = propertyWorkbookHtml([PROPERTY_IMPORT_HEADERS, ...sampleRows]);
  downloadHtmlExcel(html, `房产信息导入模板_${today()}.xls`);
}

async function importPropertyWorkbook(file) {
  const html = await file.text();
  const documentBody = new DOMParser().parseFromString(html, "text/html");
  const rows = Array.from(documentBody.querySelectorAll("tr")).map((row) =>
    Array.from(row.children).map((cell) => cell.textContent.trim()),
  );
  const headerIndex = rows.findIndex((row) => PROPERTY_IMPORT_HEADERS.every((header, index) => row[index] === header));
  if (headerIndex < 0) {
    throw new Error("没有找到正确的模板表头，请先下载并使用系统模板填写");
  }
  const dataRows = rows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => Object.fromEntries(PROPERTY_IMPORT_HEADERS.map((header, index) => [header, row[index] || ""])));
  if (!dataRows.length) throw new Error("模板里没有可导入的房源数据");

  let createdCommunities = 0;
  let createdProperties = 0;
  let updatedProperties = 0;
  dataRows.forEach((row, index) => {
    const communityName = row["小区名称"].trim();
    const propertyName = row["房源名称"].trim();
    if (!communityName || !propertyName) {
      throw new Error(`第 ${index + headerIndex + 2} 行缺少小区名称或房源名称`);
    }
    let community = state.communities.find((item) => item.name === communityName);
    if (!community) {
      community = {
        id: uid(),
        name: communityName,
        district: row["片区"].trim(),
        manager: row["负责人/合作方式"].trim(),
        note: row["小区备注"].trim(),
      };
      state.communities.push(community);
      createdCommunities += 1;
    } else {
      community.district = row["片区"].trim() || community.district;
      community.manager = row["负责人/合作方式"].trim() || community.manager;
      community.note = row["小区备注"].trim() || community.note;
    }

    const importedProperty = {
      communityId: community.id,
      name: propertyName,
      layout: row["户型"].trim(),
      area: Number(row["面积㎡"] || 0),
      status: normalizeImportStatus(row["出租状态"]),
      tenant: row["租客"].trim(),
      monthlyRent: Number(row["月租收入"] || 0),
      landlordRent: Number(row["房东租金成本"] || 0),
      rentDueDate: normalizeImportDate(row["下次交租日"]) || today(),
      renovationDate: normalizeImportDate(row["装修时间"]),
      appliances: row["房内家电"].trim(),
      furniture: row["家具配置"].trim(),
      note: row["房源备注"].trim(),
    };
    const existing = state.properties.find((item) => item.communityId === community.id && item.name === propertyName);
    if (existing) {
      Object.assign(existing, importedProperty);
      updatedProperties += 1;
    } else {
      state.properties.push({ id: uid(), ...importedProperty });
      createdProperties += 1;
    }
  });
  state.selectedCommunityId = "all";
  saveLocalState();
  syncNow(false);
  return { createdCommunities, createdProperties, updatedProperties };
}

function propertyWorkbookHtml(rows) {
  const tableRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell) => {
          const tag = rowIndex === 0 ? "th" : "td";
          return `<${tag}>${excelCell(cell)}</${tag}>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: "Microsoft YaHei", Arial, sans-serif; }
          th { background: #207a5c; color: #ffffff; font-weight: 700; }
          th, td { border: 1px solid #b7c5c0; padding: 8px 10px; mso-number-format:"\\@"; }
        </style>
      </head>
      <body>
        <table>${tableRows}</table>
      </body>
    </html>
  `;
}

function downloadHtmlExcel(html, filename) {
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeImportStatus(value) {
  const text = String(value || "").trim();
  return text === "已出租" || text.toLowerCase() === "rented" ? "rented" : "vacant";
}

function normalizeImportDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const normalized = text.replaceAll("/", "-").replaceAll(".", "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return text;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

async function openUserAdminModal() {
  els.modalTitle.textContent = "用户管理";
  els.modalForm.innerHTML = `<div class="empty-state">正在加载用户列表...</div>`;
  showModal();
  try {
    const { users } = await api("/api/users");
    els.modalForm.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                (user) => `
                  <tr>
                    <td>${escapeHtml(user.name || "-")}</td>
                    <td>${escapeHtml(user.email)}</td>
                    <td>${user.role === "admin" ? "管理员" : "成员"}</td>
                    <td>${user.status === "active" ? "启用" : "停用"}</td>
                    <td>${escapeHtml(new Date(user.created_at).toLocaleString("zh-CN"))}</td>
                    <td>
                      <div class="user-table-actions">
                        <button class="secondary-button" type="button" data-role="${user.id}">${user.role === "admin" ? "设为成员" : "设为管理员"}</button>
                        <button class="danger-button" type="button" data-status="${user.id}">${user.status === "active" ? "停用" : "启用"}</button>
                      </div>
                    </td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="form-actions">
        <span></span>
        <div class="right">
          <button class="secondary-button" type="button" data-close>关闭</button>
        </div>
      </div>
    `;
    els.modalForm.querySelectorAll("[data-role]").forEach((button) => {
      button.addEventListener("click", async () => {
        const target = users.find((user) => user.id === button.dataset.role);
        await api(`/api/users/${target.id}`, {
          method: "PATCH",
          body: JSON.stringify({ role: target.role === "admin" ? "member" : "admin" }),
        });
        openUserAdminModal();
      });
    });
    els.modalForm.querySelectorAll("[data-status]").forEach((button) => {
      button.addEventListener("click", async () => {
        const target = users.find((user) => user.id === button.dataset.status);
        await api(`/api/users/${target.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: target.status === "active" ? "disabled" : "active" }),
        });
        openUserAdminModal();
      });
    });
    bindCloseButtons();
  } catch (error) {
    els.modalForm.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function normalizePropertyData(data) {
  return {
    ...data,
    area: Number(data.area || 0),
    monthlyRent: Number(data.monthlyRent || 0),
    landlordRent: Number(data.landlordRent || 0),
  };
}

function formData() {
  return Object.fromEntries(new FormData(els.modalForm).entries());
}

function field(label, name, value = "", type = "text", wide = "", list = "") {
  return `
    <div class="form-field ${wide}">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="${type}" value="${escapeAttr(value)}" ${list ? `list="${escapeAttr(list)}"` : ""} />
    </div>
  `;
}

function textArea(label, name, value = "", wide = "") {
  return `
    <div class="form-field ${wide}">
      <label for="${name}">${label}</label>
      <textarea id="${name}" name="${name}">${escapeHtml(value)}</textarea>
    </div>
  `;
}

function selectField(label, name, options, value = "") {
  return `
    <div class="form-field">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}">
        ${options
          .map(
            ([optionValue, text]) =>
              `<option value="${escapeAttr(optionValue)}" ${String(optionValue) === String(value) ? "selected" : ""}>${escapeHtml(text)}</option>`,
          )
          .join("")}
      </select>
    </div>
  `;
}

function bindCloseButtons() {
  els.modalForm.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });
}

function showModal() {
  els.modalBackdrop.hidden = false;
}

function closeModal() {
  els.modalBackdrop.hidden = true;
  els.modalForm.onsubmit = null;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}
