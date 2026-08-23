import { useState, useMemo, useEffect } from "react";

const STORAGE_KEY = "secondhand_items";
const STORAGE_ID_KEY = "secondhand_nextId";

const formatNTD = (val) => {
  if (val === "" || val === null || val === undefined) return "—";
  const num = Number(val);
  if (isNaN(num)) return "—";
  return `$${num.toLocaleString()}`;
};

const profitColor = (val) => {
  if (val === null || val === undefined || val === "") return "";
  if (val > 0) return "profit-pos";
  if (val < 0) return "profit-neg";
  return "profit-zero";
};

const loadItems = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

const loadNextId = () => {
  try {
    const saved = localStorage.getItem(STORAGE_ID_KEY);
    return saved ? parseInt(saved) : 1;
  } catch { return 1; }
};

export default function SecondhandTracker() {
  const [items, setItems] = useState(loadItems);
  const [nextId, setNextId] = useState(loadNextId);
  const [form, setForm] = useState({ name: "", buyPrice: "", targetPrice: "", sellPrice: "", note: "", date: "" });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // 搜尋 / 篩選 / 排序
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all | holding | sold
  const [sortBy, setSortBy] = useState("date_desc"); // date_desc | date_asc | name_asc | name_desc

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(STORAGE_ID_KEY, String(nextId));
    } catch {}
  }, [items, nextId]);

  const showSaved = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const getProfit = (item) => {
    if (item.sellPrice === "" || item.sellPrice === null || item.sellPrice === undefined) return null;
    return Number(item.sellPrice) - Number(item.buyPrice);
  };

  const getStatus = (item) => {
    if (item.sellPrice !== "" && item.sellPrice !== null && item.sellPrice !== undefined) return "sold";
    return "holding";
  };

  // 總計只計算所有 items（不受篩選影響）
  const totals = useMemo(() => {
    const totalBuy = items.reduce((s, i) => s + (Number(i.buyPrice) || 0), 0);
    const totalTarget = items.reduce((s, i) => s + (Number(i.targetPrice) || 0), 0);
    const totalSell = items.reduce((s, i) => s + (Number(i.sellPrice) || 0), 0);
    const soldItems = items.filter((i) => i.sellPrice !== "" && i.sellPrice !== null && i.sellPrice !== undefined);
    const totalProfit = soldItems.reduce((s, i) => s + (Number(i.sellPrice) - Number(i.buyPrice)), 0);
    return { totalBuy, totalTarget, totalSell, totalProfit, soldCount: soldItems.length };
  }, [items]);

  // 篩選 + 搜尋 + 排序
  const displayItems = useMemo(() => {
    let result = [...items];

    // 狀態篩選
    if (filterStatus === "holding") result = result.filter(i => getStatus(i) === "holding");
    if (filterStatus === "sold") result = result.filter(i => getStatus(i) === "sold");

    // 文字搜尋
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.note || "").toLowerCase().includes(q)
      );
    }

    // 排序
    result.sort((a, b) => {
      if (sortBy === "date_desc") return (b.id || 0) - (a.id || 0);
      if (sortBy === "date_asc") return (a.id || 0) - (b.id || 0);
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "zh-Hant");
      if (sortBy === "name_desc") return b.name.localeCompare(a.name, "zh-Hant");
      return 0;
    });

    return result;
  }, [items, search, filterStatus, sortBy]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name || form.buyPrice === "") return;
    if (editId !== null) {
      setItems((items) => items.map((it) => (it.id === editId ? { ...it, ...form } : it)));
      setEditId(null);
    } else {
      const today = new Date().toISOString().split("T")[0];
      setItems((items) => [...items, { id: nextId, date: form.date || today, ...form }]);
      setNextId((n) => n + 1);
    }
    setForm({ name: "", buyPrice: "", targetPrice: "", sellPrice: "", note: "", date: "" });
    setShowForm(false);
    showSaved();
  };

  const handleEdit = (item) => {
    setForm({ name: item.name, buyPrice: item.buyPrice, targetPrice: item.targetPrice, sellPrice: item.sellPrice, note: item.note || "", date: item.date || "" });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (!window.confirm("確定要刪除這筆記錄嗎？")) return;
    setItems((items) => items.filter((it) => it.id !== id));
    showSaved();
  };

  const handleCancel = () => {
    setForm({ name: "", buyPrice: "", targetPrice: "", sellPrice: "", note: "", date: "" });
    setEditId(null);
    setShowForm(false);
  };

  const SORT_OPTIONS = [
    { value: "date_desc", label: "新增時間 ↓" },
    { value: "date_asc",  label: "新增時間 ↑" },
    { value: "name_asc",  label: "名稱 A → Z" },
    { value: "name_desc", label: "名稱 Z → A" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f1117; }
        .app { min-height: 100vh; background: #0f1117; color: #e8e8e8; font-family: 'Noto Sans TC','Space Grotesk',sans-serif; padding: 32px 16px 64px; }

        .toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); background: #1a2e1a; border: 1px solid #3ddc84; color: #3ddc84; font-size: 13px; font-weight: 600; padding: 10px 22px; border-radius: 24px; z-index: 200; white-space: nowrap; font-family: 'Noto Sans TC',sans-serif; }

        .header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
        .header-tag { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #f0a500; font-family: 'Space Grotesk',sans-serif; font-weight: 500; margin-bottom: 6px; }
        .header-title { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.02em; line-height: 1.15; }
        .header-title span { color: #f0a500; }
        .header-save-hint { font-size: 11px; color: #3ddc84; margin-top: 5px; }
        .btn-add { background: #f0a500; color: #0f1117; border: none; border-radius: 8px; padding: 11px 22px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Noto Sans TC',sans-serif; transition: background 0.15s, transform 0.1s; white-space: nowrap; }
        .btn-add:hover { background: #ffc233; transform: translateY(-1px); }

        .summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
        @media (max-width: 700px) { .summary-grid { grid-template-columns: repeat(2,1fr); } }
        .card { background: #1a1d27; border: 1px solid #2a2d3a; border-radius: 12px; padding: 18px 20px; }
        .card-label { font-size: 11px; color: #7a7d8e; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; font-family: 'Space Grotesk',sans-serif; }
        .card-value { font-size: 22px; font-weight: 700; color: #fff; font-family: 'Space Grotesk',sans-serif; letter-spacing: -0.01em; }
        .card-value.accent { color: #f0a500; }
        .card-value.pos { color: #3ddc84; }
        .card-value.neg { color: #ff6b6b; }
        .card-sub { font-size: 11px; color: #7a7d8e; margin-top: 4px; }

        /* Controls bar */
        .controls { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .search-wrap { position: relative; flex: 1; min-width: 160px; }
        .search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #5a5d70; font-size: 14px; pointer-events: none; }
        .search-input { width: 100%; background: #1a1d27; border: 1px solid #2a2d3a; border-radius: 8px; padding: 9px 13px 9px 34px; color: #e8e8e8; font-size: 13px; font-family: 'Noto Sans TC',sans-serif; outline: none; transition: border-color 0.15s; }
        .search-input:focus { border-color: #f0a500; }
        .search-input::placeholder { color: #3a3d50; }

        .filter-tabs { display: flex; gap: 6px; }
        .tab { background: #1a1d27; border: 1px solid #2a2d3a; color: #7a7d8e; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Noto Sans TC',sans-serif; transition: all 0.13s; white-space: nowrap; }
        .tab:hover { border-color: #f0a500; color: #f0a500; }
        .tab.active-all { background: rgba(240,165,0,0.12); border-color: #f0a500; color: #f0a500; }
        .tab.active-holding { background: rgba(240,165,0,0.12); border-color: #f0a500; color: #f0a500; }
        .tab.active-sold { background: rgba(61,220,132,0.12); border-color: #3ddc84; color: #3ddc84; }

        .sort-select { background: #1a1d27; border: 1px solid #2a2d3a; color: #9a9db0; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-family: 'Noto Sans TC',sans-serif; outline: none; cursor: pointer; }
        .sort-select:focus { border-color: #f0a500; }

        /* Table */
        .table-wrap { background: #1a1d27; border: 1px solid #2a2d3a; border-radius: 14px; overflow: hidden; }
        .table-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px 14px; border-bottom: 1px solid #2a2d3a; }
        .table-header-title { font-size: 13px; font-weight: 700; color: #9a9db0; letter-spacing: 0.08em; text-transform: uppercase; font-family: 'Space Grotesk',sans-serif; }
        .table-count { font-size: 12px; color: #5a5d70; }
        table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        thead th { background: #141620; padding: 10px 16px; text-align: left; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #5a5d70; font-weight: 500; font-family: 'Space Grotesk',sans-serif; white-space: nowrap; }
        thead th.right { text-align: right; }
        thead th.center { text-align: center; }
        tbody tr { border-bottom: 1px solid #1e2130; transition: background 0.12s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #1e2230; }
        td { padding: 13px 16px; vertical-align: middle; }
        td.right { text-align: right; font-family: 'Space Grotesk',sans-serif; }
        td.center { text-align: center; }
        .item-name { font-weight: 500; color: #e8e8e8; font-size: 14px; }
        .item-note { font-size: 11px; color: #5a5d70; margin-top: 2px; }
        .item-date { font-size: 10px; color: #3a3d50; margin-top: 2px; font-family: 'Space Grotesk',sans-serif; }
        .price-val { color: #c8cad8; font-family: 'Space Grotesk',sans-serif; }
        .price-target { color: #8a8db0; font-family: 'Space Grotesk',sans-serif; }
        .price-sell { color: #e8e8e8; font-family: 'Space Grotesk',sans-serif; font-weight: 500; }
        .profit-pos { color: #3ddc84; font-weight: 700; font-family: 'Space Grotesk',sans-serif; }
        .profit-neg { color: #ff6b6b; font-weight: 700; font-family: 'Space Grotesk',sans-serif; }
        .profit-zero { color: #9a9db0; font-family: 'Space Grotesk',sans-serif; }
        .badge { display: inline-block; font-size: 10.5px; font-weight: 600; padding: 3px 9px; border-radius: 20px; letter-spacing: 0.05em; font-family: 'Space Grotesk',sans-serif; }
        .badge-sold { background: rgba(61,220,132,0.12); color: #3ddc84; }
        .badge-holding { background: rgba(240,165,0,0.12); color: #f0a500; }
        .action-btn { background: transparent; border: 1px solid #2a2d3a; color: #7a7d8e; border-radius: 6px; padding: 5px 11px; font-size: 12px; cursor: pointer; font-family: 'Noto Sans TC',sans-serif; transition: all 0.13s; margin-left: 4px; }
        .action-btn:hover { border-color: #f0a500; color: #f0a500; }
        .action-btn.del:hover { border-color: #ff6b6b; color: #ff6b6b; }
        .tfoot-row td { background: #141620; border-top: 2px solid #2a2d3a; font-weight: 700; font-size: 13px; color: #f0a500; padding: 14px 16px; font-family: 'Space Grotesk',sans-serif; }
        .tfoot-row td.label-cell { color: #7a7d8e; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
        .empty { text-align: center; padding: 52px 24px; }
        .empty-icon { font-size: 36px; margin-bottom: 12px; }
        .empty-text { font-size: 14px; color: #5a5d70; }
        .empty-sub { font-size: 12px; color: #3a3d50; margin-top: 6px; }

        /* highlight search match */
        .hl { background: rgba(240,165,0,0.25); border-radius: 2px; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal { background: #1a1d27; border: 1px solid #2a2d3a; border-radius: 16px; padding: 28px 28px 24px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; }
        .modal-title { font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 20px; }
        .form-group { margin-bottom: 14px; }
        .form-label { display: block; font-size: 12px; color: #9a9db0; margin-bottom: 6px; letter-spacing: 0.05em; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-input { width: 100%; background: #0f1117; border: 1px solid #2a2d3a; border-radius: 8px; padding: 10px 13px; color: #e8e8e8; font-size: 14px; font-family: 'Noto Sans TC',sans-serif; outline: none; transition: border-color 0.15s; }
        .form-input:focus { border-color: #f0a500; }
        .form-input::placeholder { color: #3a3d50; }
        .form-actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
        .btn-cancel { background: transparent; border: 1px solid #2a2d3a; color: #9a9db0; border-radius: 8px; padding: 9px 20px; font-size: 14px; cursor: pointer; font-family: 'Noto Sans TC',sans-serif; }
        .btn-cancel:hover { border-color: #f0a500; color: #f0a500; }
        .btn-save { background: #f0a500; color: #0f1117; border: none; border-radius: 8px; padding: 9px 22px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Noto Sans TC',sans-serif; }
        .btn-save:hover { background: #ffc233; }
        .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }

        @media (max-width: 600px) {
          .header-title { font-size: 22px; }
          td, thead th { padding: 10px 10px; }
          .action-btn { padding: 4px 8px; font-size: 11px; }
          .controls { gap: 8px; }
        }
      `}</style>

      {savedToast && <div className="toast">✓ 已自動儲存</div>}

      <div className="app">
        {/* Header */}
        <div className="header">
          <div>
            <div className="header-tag">二手交易</div>
            <div className="header-title">買賣<span>利潤</span>記錄</div>
            <div className="header-save-hint">💾 資料已自動儲存在此裝置</div>
          </div>
          <button className="btn-add" onClick={() => { setShowForm(true); setEditId(null); setForm({ name: "", buyPrice: "", targetPrice: "", sellPrice: "", note: "", date: "" }); }}>
            ＋ 新增商品
          </button>
        </div>

        {/* Summary */}
        <div className="summary-grid">
          <div className="card">
            <div className="card-label">總買入成本</div>
            <div className="card-value accent">{formatNTD(totals.totalBuy)}</div>
            <div className="card-sub">{items.length} 件商品</div>
          </div>
          <div className="card">
            <div className="card-label">預計賣出總額</div>
            <div className="card-value">{formatNTD(totals.totalTarget)}</div>
          </div>
          <div className="card">
            <div className="card-label">實際賣出總額</div>
            <div className="card-value">{formatNTD(totals.totalSell)}</div>
            <div className="card-sub">{totals.soldCount} 件已售出</div>
          </div>
          <div className="card">
            <div className="card-label">實際獲得利潤</div>
            <div className={`card-value ${totals.totalProfit > 0 ? "pos" : totals.totalProfit < 0 ? "neg" : ""}`}>
              {totals.soldCount === 0 ? "—" : (totals.totalProfit >= 0 ? "+" : "") + formatNTD(totals.totalProfit)}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="搜尋商品名稱或備註…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-tabs">
            <button className={`tab ${filterStatus === "all" ? "active-all" : ""}`} onClick={() => setFilterStatus("all")}>全部 {items.length}</button>
            <button className={`tab ${filterStatus === "holding" ? "active-holding" : ""}`} onClick={() => setFilterStatus("holding")}>持有中 {items.filter(i => getStatus(i) === "holding").length}</button>
            <button className={`tab ${filterStatus === "sold" ? "active-sold" : ""}`} onClick={() => setFilterStatus("sold")}>已售出 {totals.soldCount}</button>
          </div>
          <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-header">
            <span className="table-header-title">商品清單</span>
            <span className="table-count">顯示 {displayItems.length} / 共 {items.length} 筆</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>商品名稱</th>
                  <th className="right">買入價格</th>
                  <th className="right">目標賣出</th>
                  <th className="right">實際賣出</th>
                  <th className="right">獲得利潤</th>
                  <th className="center">狀態</th>
                  <th className="center">操作</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty">
                        <div className="empty-icon">{search ? "🔍" : "📦"}</div>
                        <div className="empty-text">{search ? `找不到「${search}」的結果` : "尚未新增任何商品"}</div>
                        <div className="empty-sub">{search ? "試試其他關鍵字" : "點擊「新增商品」開始記錄"}</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayItems.map((item, idx) => {
                    const profit = getProfit(item);
                    const status = getStatus(item);
                    return (
                      <tr key={item.id}>
                        <td style={{ color: "#3a3d50", fontFamily: "'Space Grotesk',sans-serif", fontSize: 12 }}>{idx + 1}</td>
                        <td>
                          <div className="item-name">{item.name}</div>
                          {item.note && <div className="item-note">{item.note}</div>}
                          {item.date && <div className="item-date">{item.date}</div>}
                        </td>
                        <td className="right"><span className="price-val">{formatNTD(item.buyPrice)}</span></td>
                        <td className="right"><span className="price-target">{formatNTD(item.targetPrice)}</span></td>
                        <td className="right"><span className="price-sell">{item.sellPrice !== "" && item.sellPrice !== null && item.sellPrice !== undefined ? formatNTD(item.sellPrice) : <span style={{ color: "#3a3d50" }}>未售出</span>}</span></td>
                        <td className="right">
                          {profit === null ? <span style={{ color: "#3a3d50" }}>—</span> : (
                            <span className={profitColor(profit)}>{profit >= 0 ? "+" : ""}{formatNTD(profit)}</span>
                          )}
                        </td>
                        <td className="center">
                          <span className={`badge ${status === "sold" ? "badge-sold" : "badge-holding"}`}>
                            {status === "sold" ? "已售出" : "持有中"}
                          </span>
                        </td>
                        <td className="center" style={{ whiteSpace: "nowrap" }}>
                          <button className="action-btn" onClick={() => handleEdit(item)}>編輯</button>
                          <button className="action-btn del" onClick={() => handleDelete(item.id)}>刪除</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {displayItems.length > 0 && (() => {
                const dBuy = displayItems.reduce((s,i) => s+(Number(i.buyPrice)||0),0);
                const dTarget = displayItems.reduce((s,i) => s+(Number(i.targetPrice)||0),0);
                const dSell = displayItems.reduce((s,i) => s+(Number(i.sellPrice)||0),0);
                const dSold = displayItems.filter(i => getStatus(i)==="sold");
                const dProfit = dSold.reduce((s,i)=>s+(Number(i.sellPrice)-Number(i.buyPrice)),0);
                return (
                  <tfoot>
                    <tr className="tfoot-row">
                      <td colSpan={2} className="label-cell">篩選合計</td>
                      <td className="right">{formatNTD(dBuy)}</td>
                      <td className="right">{formatNTD(dTarget)}</td>
                      <td className="right">{formatNTD(dSell)}</td>
                      <td className="right" style={{ color: dProfit >= 0 ? "#3ddc84" : "#ff6b6b" }}>
                        {dSold.length > 0 ? (dProfit >= 0 ? "+" : "") + formatNTD(dProfit) : "—"}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>

        {/* Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}>
            <div className="modal">
              <div className="modal-title">{editId !== null ? "✏️ 編輯商品" : "＋ 新增二手商品"}</div>
              <div className="form-group">
                <label className="form-label">商品名稱 *</label>
                <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="例：iPhone 14 Pro、Nike Air Max..." />
              </div>
              <div className="form-group form-row">
                <div>
                  <label className="form-label">買入價格 *</label>
                  <input className="form-input" name="buyPrice" type="number" value={form.buyPrice} onChange={handleChange} placeholder="0" />
                </div>
                <div>
                  <label className="form-label">目標賣出價格</label>
                  <input className="form-input" name="targetPrice" type="number" value={form.targetPrice} onChange={handleChange} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">實際賣出價格（賣出後填寫）</label>
                <input className="form-input" name="sellPrice" type="number" value={form.sellPrice} onChange={handleChange} placeholder="尚未售出可留空" />
              </div>
              <div className="form-group form-row">
                <div>
                  <label className="form-label">新增日期</label>
                  <input className="form-input" name="date" type="date" value={form.date} onChange={handleChange} />
                </div>
                <div>
                  <label className="form-label">備註</label>
                  <input className="form-input" name="note" value={form.note} onChange={handleChange} placeholder="例：蝦皮購入、九成新..." />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-cancel" onClick={handleCancel}>取消</button>
                <button className="btn-save" onClick={handleSubmit} disabled={!form.name || form.buyPrice === ""}>
                  {editId !== null ? "儲存修改" : "新增商品"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
