/*  app.js — PSCBOX DIAPHRAGM 공개 UI (원본 입력 화면 + 숨은 서버 엔진).
 *
 *  원본 bim_pscbox_diaphragm_test.js 의 입력 UI(치수칸·커버·단면타입·개구부 카드·
 *  철근 표)를 그대로 재현하되, 계산(단면 기하·철근 배치)은 하지 않는다 —
 *  입력을 모아 시트 행으로 만들어 rebar_api.php(서버 /config 숨은 엔진)로 보내고,
 *  돌려받은 좌표만 Konva 로 그린다. 알고리즘은 브라우저에 한 줄도 없다.
 *
 *  서버 contract :  POST rebar_api.php  { sheet:[[cell,...],...] }
 *    → { ok, section:{outer,cells,openings,ducts,dims}, bars2d, lbars2d, hoops, mesh2d, anim, hoopAnim, log }
 */
(function () {
  'use strict';
  var API = 'rebar_api.php';

  // ── 치수 스키마 (adefs_box12cell: key, 기본값, 라벨?) · 공개 UI 데이터 (알고리즘 아님) ──
  var ADEFS = [
    ['TH', 3000], ['SLL', 2, 'SLL (%)'], ['SLR', -2, 'SLR (%)'], ['SLB', 0, 'SLB (%)'],
    ['WL', 6800], ['WTL', 4500], ['WCAL1', 1000], ['WCAL2', 1000], ['WR', 6800], ['WTR', 4500], ['WCAR1', 1000], ['WCAR2', 1000],
    ['TCAL', 250], ['TCAL1', 600], ['TCAL2', 350], ['TCAR', 250], ['TCAR1', 600], ['TCAR2', 350],
    ['TTS', 280], ['WTHUL1', 600], ['WTHUL2', 600], ['TTHL1', 800], ['TTHL2', 480],
    ['WTCHUL1', 500], ['WTCHUL2', 500], ['TTHCL1', 700], ['TTHCL2', 450], ['WTCHUR1', 500], ['WTCHUR2', 500], ['TTHCR1', 700], ['TTHCR2', 450],
    ['WTHUR1', 600], ['WTHUR2', 600], ['TTHR1', 800], ['TTHR2', 480],
    ['TWEBL', 450], ['TWEBC', 350], ['TWEBR', 450],
    ['WBL', 3800], ['WBR', 3800], ['TBEL', 600], ['TBER', 600], ['TBS', 300],
    ['WBHUL1', 500], ['WBHUL2', 500], ['TBHL1', 750], ['TBHL2', 450],
    ['WBCHUL1', 400], ['WBCHUL2', 400], ['TBHCL1', 650], ['TBHCL2', 420], ['WBCHUR1', 400], ['WBCHUR2', 400], ['TBHCR1', 650], ['TBHCR2', 420],
    ['WBHUR1', 500], ['WBHUR2', 500], ['TBHR1', 750], ['TBHR2', 450],
    ['R_WTL', 300, 'R_WTL (0, if not necessary)'], ['R_WTR', 300, 'R_WTR (0, if not necessary)'],
    ['R_WTIL', 300, 'R_WTIL (0, if not necessary)'], ['R_WTIR', 300, 'R_WTIR (0, if not necessary)'],
    ['R_WBL', 300, 'R_WBL (0, if not necessary)'], ['R_WBR', 300, 'R_WBR (0, if not necessary)']
  ];
  var DIM_LAYOUT = [
    { t: 'single', l: 'TH' }, { t: 'free', l: 'SLL', r: 'SLR' }, { t: 'single', l: 'SLB' },
    { t: 'single', l: 'TTS' }, { t: 'single', l: 'TBS' },
    { t: 'sym', l: 'WL', r: 'WR' }, { t: 'sym', l: 'WTL', r: 'WTR' }, { t: 'sym', l: 'WBL', r: 'WBR' },
    { t: 'sym', l: 'WCAL1', r: 'WCAR1' }, { t: 'sym', l: 'WCAL2', r: 'WCAR2' },
    { t: 'sym', l: 'WTHUL1', r: 'WTHUR1' }, { t: 'sym', l: 'WTHUL2', r: 'WTHUR2' },
    { t: 'sym', l: 'WBHUL1', r: 'WBHUR1' }, { t: 'sym', l: 'WBHUL2', r: 'WBHUR2' },
    { t: 'sym', l: 'TCAL', r: 'TCAR' }, { t: 'sym', l: 'TCAL1', r: 'TCAR1' }, { t: 'sym', l: 'TCAL2', r: 'TCAR2' },
    { t: 'sym', l: 'TTHL1', r: 'TTHR1' }, { t: 'sym', l: 'TTHL2', r: 'TTHR2' },
    { t: 'sym', l: 'TBHL1', r: 'TBHR1' }, { t: 'sym', l: 'TBHL2', r: 'TBHR2' },
    { t: 'sym', l: 'TBEL', r: 'TBER' }, { t: 'sym', l: 'TWEBL', r: 'TWEBR' },
    { t: 'sym', l: 'R_WTL', r: 'R_WTR' }, { t: 'sym', l: 'R_WTIL', r: 'R_WTIR' }, { t: 'sym', l: 'R_WBL', r: 'R_WBR' },
    { t: 'group', label: '2 Cell only' },
    { t: 'sym', l: 'WTCHUL1', r: 'WTCHUR1' }, { t: 'sym', l: 'WTCHUL2', r: 'WTCHUR2' },
    { t: 'sym', l: 'WBCHUL1', r: 'WBCHUR1' }, { t: 'sym', l: 'WBCHUL2', r: 'WBCHUR2' },
    { t: 'sym', l: 'TTHCL1', r: 'TTHCR1' }, { t: 'sym', l: 'TTHCL2', r: 'TTHCR2' },
    { t: 'sym', l: 'TBHCL1', r: 'TBHCR1' }, { t: 'sym', l: 'TBHCL2', r: 'TBHCR2' },
    { t: 'single', l: 'TWEBC' }
  ];
  var OPEN_DEF = { shape: 'HEX', B: 800, H: 1000, CTTX: 150, CTTY: 200, CTBX: 150, CTBY: 150, X: 0, Y: 500 };
  var SEG_DEF = 20000, DIA_DEF = 2000;
  var OP_SHAPES = [['RECT', 'Rectangle'], ['HEX', 'Hexagon'], ['OCT', 'Octagon']];

  // ── 상태 ──
  var stage, layer, barLayer, elevStage, elevLayer, animTimer = null, elevTimer = null;
  var _excelData = null, _last = null, _busy = false;

  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value : ''; }
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ── UI 조립 ───────────────────────────────────────────────────────────────
  var defByKey = {}, lblByKey = {};
  ADEFS.forEach(function (d) {
    defByKey[d[0]] = String(d[1]);
    lblByKey[d[0]] = ((d.length > 2) ? d[2] : d[0]).replace('(0, if not necessary)', '<small>(0=X)</small>');
  });
  function dimInput(key, extra) {
    return '<input type="text" spellcheck="false" class="form-input" id="' + key + '_s" value="' + esc(defByKey[key]) + '" onchange="PXDIA.redraw()"' + (extra || '') + '>';
  }
  function dimRowsHTML() {
    return DIM_LAYOUT.map(function (it) {
      if (it.t === 'group') return '<tr class="px-2cell-hdr"><td colspan="5">' + it.label + '</td></tr>';
      if (it.t === 'single') return '<tr><td class="px-dim">' + lblByKey[it.l] + '</td><td>' + dimInput(it.l) + '</td><td class="px-symc"></td><td class="px-dim"></td><td></td></tr>';
      if (it.t === 'free') return '<tr><td class="px-dim">' + lblByKey[it.l] + '</td><td>' + dimInput(it.l) + '</td><td class="px-symc"></td>' +
        '<td class="px-dim">' + lblByKey[it.r] + '</td><td>' + dimInput(it.r) + '</td></tr>';
      return '<tr><td class="px-dim">' + lblByKey[it.l] + '</td>' +
        '<td><input type="text" spellcheck="false" class="form-input" id="' + it.l + '_s" value="' + esc(defByKey[it.l]) + '" ' +
        'oninput="PXDIA.onSymLeft(\'' + it.l + '\',\'' + it.r + '\')" onchange="PXDIA.redraw()"></td>' +
        '<td class="px-symc"><input type="checkbox" id="asym_' + it.r + '" title="Check to enter the right side independently (asymmetric)" ' +
        'onchange="PXDIA.onAsymToggle(\'' + it.l + '\',\'' + it.r + '\',this.checked)"></td>' +
        '<td class="px-dim">' + lblByKey[it.r] + '</td>' +
        '<td><input type="text" spellcheck="false" class="form-input" id="' + it.r + '_s" value="' + esc(defByKey[it.l]) + '" disabled onchange="PXDIA.redraw()"></td></tr>';
    }).join('');
  }
  //  Opening 입력칸 (오른쪽 열 — 치수표 아래) : shape·B·H·코너컷·위치
  function openingInputsHTML() {
    function orow(k, label, hint, v) {
      return '<div class="op-row"><span>' + label + (hint ? ' <i>' + hint + '</i>' : '') + '</span>' +
        '<input type="text" spellcheck="false" id="op1_' + k + '" value="' + v + '" onchange="PXDIA.redraw()"></div>';
    }
    var opts = OP_SHAPES.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === OPEN_DEF.shape ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
    return '<div class="op-fields">' +
      '<div class="op-row"><span>Shape</span><select id="op1_shape" onchange="PXDIA.redraw()">' + opts + '</select></div>' +
      orow('B', 'B', 'width', OPEN_DEF.B) + orow('H', 'H', 'height at centre', OPEN_DEF.H) +
      '<div class="op-sub">Corner cut</div>' +
      orow('CTTX', 'Cttx', '', OPEN_DEF.CTTX) + orow('CTTY', 'Ctty', '', OPEN_DEF.CTTY) +
      orow('CTBX', 'Ctbx', '', OPEN_DEF.CTBX) + orow('CTBY', 'Ctby', '', OPEN_DEF.CTBY) +
      '<div class="op-sub">Position</div>' +
      orow('X', 'X', 'from centre', OPEN_DEF.X) + orow('Y', 'Y', 'from slab top', OPEN_DEF.Y) +
      '</div>';
  }
  //  Dimension 카드 안에 들어갈 Opening 섹션 : 제목+고려 체크박스 → (체크 시) 그림(좌)+입력(우)
  function openingSectionHTML() {
    return '      <div style="margin-top:16px;border-top:1px dashed var(--hair,#e2e8f0);padding-top:12px;">' +
      '        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">' +
      '          <span class="draw-card-title">OPENING</span>' +
      '          <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:#334155;cursor:pointer;font-weight:500;"><input type="checkbox" id="opConsider" checked onchange="PXDIA.onOpConsider()"> 고려 (consider)</label>' +
      '          <span class="draw-card-desc" style="margin:0;">셀당 하나 · 2 Cell 은 중심에서 &#8723;X 로 양쪽에. RECT/HEX/OCT · Y 는 하부슬래브 상단 기준.</span>' +
      '        </div>' +
      '        <div id="openingBody" class="px-split" style="margin-top:10px;">' +
      '          <div class="px-guide" style="flex:1 1 0;min-width:0;"><div id="stage_open" style="width:100%;height:300px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;"></div></div>' +
      '          <div class="px-tblwrap" style="flex:1 1 0;min-width:0;max-height:420px;padding:10px 14px;">' + openingInputsHTML() + '</div>' +
      '        </div>' +
      '      </div>';
  }
  function mountHTML() {
    return '<div class="px-root">' +
      '  <div class="px-menubar">' +
      '    <span class="px-mb-label">Excel :</span>' +
      '    <button type="button" class="px-btn" onclick="PXDIA.loadExcel()">&#8682; Load Excel</button>' +
      '    <button type="button" class="px-btn px-btn-lite" onclick="PXDIA.toggleLoadLog()">&#128220; View Log</button>' +
      '    <input type="file" id="excelFileInput" accept=".xlsx,.xls" style="display:none;">' +
      '    <span id="pxStatus" style="margin-left:8px;font-size:12.5px;color:#64748b;"></span>' +
      '  </div>' +
      '  <div id="pxLoadLog" class="px-logpanel" style="display:none;"></div>' +

      '  <div class="draw-card">' +
      '    <div class="draw-card-header"><div><span class="draw-card-title">Dimension (mm)</span> <span class="draw-card-desc">PSC box girder &mdash; 1 / 2 cell · 서버 엔진이 단면·철근을 계산</span></div></div>' +
      '    <div class="draw-card-body">' +
      '      <div class="px-radio px-optrow">' +
      '        <div class="px-opthalf px-optsec"><b>Section Type :</b>' +
      '          <label><input type="radio" name="box12cell_ncell" value="1" checked onchange="PXDIA.onCellType()"> 1 Cell</label>' +
      '          <label><input type="radio" name="box12cell_ncell" value="2" onchange="PXDIA.onCellType()"> 2 Cell</label>' +
      '        </div>' +
      '        <div class="px-opthalf px-optseg"><b>Segment Length (mm) :</b>' +
      '          <label><input type="text" spellcheck="false" class="form-input px-seg" id="segLen_s" value="' + SEG_DEF + '" onchange="PXDIA.redraw()"></label>' +
      '        </div>' +
      '        <div class="px-opthalf" style="flex:0 0 auto;flex-wrap:nowrap;white-space:nowrap;"><b>Cover Depth (mm) :</b>' +
      '          <label>Deck <input type="text" spellcheck="false" class="form-input px-cover" id="cover_deck_s" value="50" onchange="PXDIA.redraw()"></label>' +
      '          <label>Exterior <input type="text" spellcheck="false" class="form-input px-cover" id="cover_ext_s" value="40" onchange="PXDIA.redraw()"></label>' +
      '          <label>Interior <input type="text" spellcheck="false" class="form-input px-cover" id="cover_int_s" value="30" onchange="PXDIA.redraw()"></label>' +
      '        </div>' +
      '      </div>' +
      '      <div class="px-split">' +
      '        <div class="px-guide" id="box12cell_guide" style="flex:1 1 0;min-width:0;"></div>' +
      '        <div class="px-tblwrap" id="box12cell_vartable" style="max-height:680px;">' +
      '          <table class="px-tbl dim-tbl"><thead><tr><th>Dimension</th><th>Value / Formula</th><th class="px-symh" title="Check to enter the right side independently">&#8646;</th><th>Dimension</th><th>Value / Formula</th></tr></thead>' +
      '          <tbody>' + dimRowsHTML() + '</tbody></table>' +
      '        </div>' +
      '      </div>' +
      openingSectionHTML() +
      '    </div>' +
      '  </div>' +

      '  <div class="draw-card">' +
      '    <div class="draw-card-header"><div><span class="draw-card-title">REBAR LAYOUT</span> <span class="draw-card-desc">단면 · 철근을 서버(숨은 엔진)에서 계산해 그린다 — 그림만 받는다</span></div></div>' +
      '    <div class="draw-card-body">' +
      '      <div id="stage2d"></div>' +
      '      <div id="elevWrap" style="display:none;margin-top:10px;"><div style="font-size:12px;color:#64748b;margin:2px 0 4px;">교축방향 폐합철근 (입면)</div><div id="stage_elev"></div></div>' +
      '    </div>' +
      '  </div>' +

      '  <div class="draw-card">' +
      '    <div class="draw-card-header"><div><span class="draw-card-title">REBAR</span> <span class="draw-card-desc">trebar / lrebar / crebar / srebar &mdash; [Load Excel] 로 입력</span></div></div>' +
      '    <div class="draw-card-body"><div id="rebarBody"></div></div>' +
      '  </div>' +
      '</div>';
  }

  // ── 철근 입력표 (읽기전용 — 불러온 엑셀 행을 보여준다) ──────────────────────
  function renderRebarTable() {
    var body = el('rebarBody');
    if (!body) return;
    var SCHEMA = [
      ['trebar', 'id', 'code', 'dia', 'init (x, y, rot)', 'set', 'segs (len)', 'angs', 'nors', 'barStart', 'barEnd', 'radius', 'z'],
      ['lrebar', 'id', 'dia', 'num', 'init (x, y, rot)', 'range (-, +)', 'nors', 'ctc', 'ctcmax', 'ctcmin', 'gap', 'path', 'z'],
      ['crebar', 'id', 'dia', 'plane', 'at (cell/all/range)', 'set', 'lap', 'from', 'to', 'ctc', '', 'ctcmin, ctcmax', ''],
      ['srebar', 'id', 'code', 'dia', 'init (x, y, rot)', 'range (-, +)', 'num', 'ctc', 'len', 'seat', '', 'ctcmin, ctcmax', 'z'],
      ['duct', 'id', 'shape', 'D / B', 'H', 'x', 'y', 'ref', 'clr', '', '', '', '']
    ];
    var ncol = SCHEMA[0].length;
    var rows = [];
    (_excelData || []).forEach(function (r) {
      var t = firstTok(r).toLowerCase();
      if (t === 'trebar' || t === 'lrebar' || t === 'crebar' || t === 'srebar' || t === 'duct') rows.push(r);
    });
    var h = '<div class="rebar-table-wrap"><table class="rebar-table"><thead>';
    SCHEMA.forEach(function (row) {
      h += '<tr class="rebar-schema-row">';
      for (var i = 0; i < ncol; i++) h += '<th class="' + (i === 0 ? 'rs-type' : '') + '">' + esc(row[i]) + '</th>';
      h += '</tr>';
    });
    h += '</thead><tbody>';
    if (rows.length) {
      rows.forEach(function (r) {
        h += '<tr>';
        for (var i = 0; i < ncol; i++) h += '<td>' + esc(r[i]) + '</td>';
        h += '</tr>';
      });
    } else {
      h += '<tr><td colspan="' + ncol + '" style="text-align:center;color:#94a3b8;padding:14px;">[Load Excel] 로 철근 데이터를 불러오세요 — 또는 단면만 그립니다.</td></tr>';
    }
    body.innerHTML = h + '</tbody></table></div>';
  }
  function firstTok(r) { if (!r) return ''; for (var i = 0; i < r.length; i++) { var t = String(r[i] == null ? '' : r[i]).trim(); if (t !== '') return t; } return ''; }

  // ── 핸들러 ────────────────────────────────────────────────────────────────
  var PX = {
    mount: function (rootId) {
      var root = el(rootId); if (!root) return;
      root.innerHTML = mountHTML();
      initStages();
      renderRebarTable();
      this.redraw();
    },
    onCellType: function () { this.redraw(); },
    onOpConsider: function () {
      var c = el('opConsider'), body = el('openingBody');
      if (body) body.style.display = (c && c.checked) ? '' : 'none';
      this.redraw();
    },
    onSymLeft: function (lk, rk) {
      var cb = el('asym_' + rk); if (cb && cb.checked) return;
      var li = el(lk + '_s'), ri = el(rk + '_s'); if (li && ri) ri.value = li.value;
    },
    onAsymToggle: function (lk, rk, on) {
      var ri = el(rk + '_s'); if (ri) ri.disabled = !on;
      if (!on) { var li = el(lk + '_s'); if (li && ri) ri.value = li.value; this.redraw(); }
    },
    loadExcel: function () { var f = el('excelFileInput'); if (f) f.click(); },
    toggleLoadLog: function () { var p = el('pxLoadLog'); if (p) p.style.display = (p.style.display === 'none' || !p.style.display) ? 'block' : 'none'; },
    redraw: function () { solve(gatherRows()); }
  };
  window.PXDIA = PX;

  // ── 입력 → 시트 행 ─────────────────────────────────────────────────────────
  function gatherRows() {
    var rows = [];
    var nc = document.querySelector('input[name="box12cell_ncell"]:checked');
    rows.push(['type', (nc && nc.value === '2') ? '2c' : '1c']);
    ADEFS.forEach(function (d) { rows.push(['dim', d[0], val(d[0] + '_s')]); });
    rows.push(['cover', val('cover_deck_s'), val('cover_ext_s'), val('cover_int_s')]);
    rows.push(['diathk', val('diaThk_s')]);
    var consider = el('opConsider');
    if (consider && !consider.checked) rows.push(['open', 'none']);   // 고려 안 함 → 개구부 없음
    else rows.push(['open', val('op1_shape'), val('op1_B'), val('op1_H'), val('op1_CTTX'), val('op1_CTTY'), val('op1_CTBX'), val('op1_CTBY'), val('op1_X'), val('op1_Y')]);
    // 불러온 엑셀의 철근·덕트 행만 통과 (치수/커버/개구부는 화면 입력이 기준)
    (_excelData || []).forEach(function (r) {
      var t = firstTok(r).toLowerCase();
      if (t === 'trebar' || t === 'lrebar' || t === 'crebar' || t === 'srebar' || t === 'duct') rows.push(r);
    });
    return rows;
  }

  // ── 엑셀 → 화면 입력칸 채우기 ──────────────────────────────────────────────
  function cellAt(row, c) { return (row && row[c] != null) ? String(row[c]).trim() : ''; }
  function populateFromRows(rows) {
    var keyByLower = {}; ADEFS.forEach(function (d) { keyByLower[d[0].toLowerCase()] = d[0]; });
    rows.forEach(function (r) {
      if (!r) return;
      var n = r.length, hc = -1, kind = '';
      for (var c = 0; c < n; c++) { var t = cellAt(r, c).toLowerCase(); if (t === 'type' || t === 'dim' || t === 'cover' || t === 'open' || t === 'diathk' || t === 'dia_thk') { hc = c; kind = t; break; } }
      if (hc < 0) return;
      if (kind === 'type') {
        var v = cellAt(r, hc + 1).toLowerCase(), two = (v === '2c' || v === '2');
        var rb = document.querySelector('input[name="box12cell_ncell"][value="' + (two ? '2' : '1') + '"]'); if (rb) rb.checked = true;
      } else if (kind === 'dim') {
        var key = keyByLower[cellAt(r, hc + 1).toLowerCase()];
        if (key) { var e = el(key + '_s'); if (e) { var raw = cellAt(r, hc + 2); e.value = (raw === '' || raw === '-') ? '0' : raw; } }
      } else if (kind === 'cover') {
        ['cover_deck_s', 'cover_ext_s', 'cover_int_s'].forEach(function (id, k) { var vv = cellAt(r, hc + 1 + k); if (vv !== '') { var e = el(id); if (e) e.value = vv; } });
      } else if (kind === 'diathk') {
        var e2 = el('diaThk_s'); if (e2) e2.value = cellAt(r, hc + 1);
      } else if (kind === 'open') {
        var sv = cellAt(r, hc + 1).toLowerCase();
        var consEl = el('opConsider');
        if (sv === 'none' || sv === '-') { if (consEl) consEl.checked = false; }
        else {
          if (consEl) consEl.checked = true;
          var shapeMap = { rect: 'RECT', rectangle: 'RECT', hex: 'HEX', hexagon: 'HEX', oct: 'OCT', octagon: 'OCT' };
          var at = hc + 1;
          if (/^\d+$/.test(cellAt(r, at)) && cellAt(r, at) !== '') at++;   // 옛 형식의 셀 번호 건너뛰기
          var sh = shapeMap[cellAt(r, at).toLowerCase()]; if (sh) { var se = el('op1_shape'); if (se) se.value = sh; }
          var flds = ['B', 'H', 'CTTX', 'CTTY', 'CTBX', 'CTBY', 'X', 'Y'];
          for (var k2 = 0; k2 < flds.length; k2++) { var vv2 = cellAt(r, at + 1 + k2); var fe = el('op1_' + flds[k2]); if (fe && vv2 !== '') fe.value = vv2; }
        }
      }
    });
    // sym 미러 (비대칭 체크 안 된 쌍은 좌측값으로 우측 채움)
    DIM_LAYOUT.forEach(function (it) {
      if (it.t === 'sym') { var cb = el('asym_' + it.r); var li = el(it.l + '_s'), ri = el(it.r + '_s'); if (li && ri && !(cb && cb.checked)) ri.value = li.value; }
    });
    // 엑셀이 정한 개구부 고려 여부에 맞춰 OPENING 본문 펼침/접기 동기화
    var oc = el('opConsider'), ob = el('openingBody');
    if (ob) ob.style.display = (oc && oc.checked) ? '' : 'none';
  }

  // ── 서버 호출 ──────────────────────────────────────────────────────────────
  function setStatus(msg, bad) { var s = el('pxStatus'); if (s) { s.textContent = msg; s.style.color = bad ? '#dc2626' : '#64748b'; } }
  function solve(rows) {
    if (_busy) return; _busy = true;
    setStatus('서버에서 계산 중…');
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sheet: rows }) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _busy = false;
        if (!data || !data.ok) { setStatus((data && data.error) || '계산 실패', true); return; }
        draw(data);
        drawGuide(data);
        drawOpening(data);
        fillLog(data.log);
        var nb = (data.bars2d || []).length, nl = (data.lbars2d || []).length, nh = (data.hoops || []).length, nm = (data.mesh2d || []).length;
        setStatus('완료 — trebar ' + nb + ' · lrebar ' + nl + ' · 폐합 ' + nh + ' · 면철근망 ' + nm + (data.stub ? ' (stub)' : ''));
      })
      .catch(function (e) { _busy = false; setStatus('서버 연결 실패: ' + e.message, true); });
  }
  function fillLog(lines) { var p = el('pxLoadLog'); if (p) p.innerHTML = (lines || []).map(function (l) { return '<div>' + esc(l) + '</div>'; }).join(''); }

  //  치수선 가이드 — 서버가 준 기하(geo)+치수(ap)로 공개 drawer(pscDrawGuide)가 그린다.
  function drawGuide(data) {
    var host = el('box12cell_guide'); if (!host) return;
    if (typeof window.pscDrawGuide !== 'function' || !data.geo || !data.ap) {
      if (!host.innerHTML) host.innerHTML = '<div style="padding:16px;color:#94a3b8;font-size:12px;">가이드 도면 로딩 중…</div>';
      return;
    }
    try { window.pscDrawGuide('box12cell_guide', data.ap, data.geo); } catch (e) { /* 가이드 실패는 치명적 아님 */ }
  }

  // ── 엑셀 읽기 ─────────────────────────────────────────────────────────────
  function onFile(file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var wb = XLSX.read(ev.target.result, { type: 'array' });
        var ws = wb.Sheets['input'] || wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
        _excelData = rows;
        populateFromRows(rows);
        renderRebarTable();
        PX.redraw();
      } catch (e) { setStatus('엑셀 읽기 실패: ' + e.message, true); }
    };
    reader.readAsArrayBuffer(file);
  }

  // ════════════════ 그리기 (서버 좌표만 — 알고리즘 없음) ════════════════════
  function initStages() {
    var host = el('stage2d'); if (!host) return;
    stage = new Konva.Stage({ container: 'stage2d', width: host.clientWidth || 600, height: 420 });
    layer = new Konva.Layer(); barLayer = new Konva.Layer();
    stage.add(layer); stage.add(barLayer);
    var ehost = el('stage_elev');
    if (ehost) { elevStage = new Konva.Stage({ container: 'stage_elev', width: host.clientWidth || 600, height: 220 }); elevLayer = new Konva.Layer(); elevStage.add(elevLayer); }
    var ohost = el('stage_open');
    if (ohost) { openStage = new Konva.Stage({ container: 'stage_open', width: ohost.clientWidth || 400, height: 300 }); openLayer = new Konva.Layer(); openStage.add(openLayer); }
    var fi = el('excelFileInput'); if (fi) fi.addEventListener('change', function (e) { if (e.target.files[0]) onFile(e.target.files[0]); });
    window.addEventListener('resize', function () {
      if (!stage || !host) return;
      stage.width(host.clientWidth || 600);
      if (elevStage) elevStage.width(host.clientWidth || 600);
      if (openStage && ohost) openStage.width(ohost.clientWidth || 400);
      if (_last) draw(_last);
    });
  }
  //  Opening 그림 — 단면 외곽(옅게) + 개구부(강조) 를 제 캔버스에 맞춰
  function drawOpening(data) {
    if (!openStage) return;
    openLayer.destroyChildren();
    var sec = (data && data.section) || {}, ops = sec.openings || [], outer = sec.outer || [];
    var c = el('opConsider');
    if (!ops.length || (c && !c.checked)) { openLayer.draw(); return; }
    var all = []; outer.forEach(function (p) { all.push(p); }); ops.forEach(function (op) { op.forEach(function (p) { all.push(p); }); });
    if (!all.length) { openLayer.draw(); return; }
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    all.forEach(function (p) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; });
    var W = openStage.width(), H = openStage.height(), pad = 22;
    var s = Math.min((W - 2 * pad) / Math.max(1, maxx - minx), (H - 2 * pad) / Math.max(1, maxy - miny));
    var cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    var T = function (p) { return [W / 2 + (p[0] - cx) * s, H / 2 - (p[1] - cy) * s]; };
    if (outer.length) openLayer.add(new Konva.Line({ points: polyPoints(outer, T), stroke: '#cbd5e1', strokeWidth: 1.5, closed: true }));
    (sec.cells || []).forEach(function (cc) { openLayer.add(new Konva.Line({ points: polyPoints(cc, T), stroke: '#e2e8f0', strokeWidth: 1, closed: true })); });
    ops.forEach(function (op) { openLayer.add(new Konva.Line({ points: polyPoints(op, T), stroke: '#2563eb', strokeWidth: 2, closed: true, fill: 'rgba(37,99,235,0.08)' })); });
    openLayer.draw();
  }
  function fitView(pts) {
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    pts.forEach(function (p) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; });
    var W = stage.width(), H = stage.height(), pad = 28;
    var s = Math.min((W - 2 * pad) / Math.max(1, maxx - minx), (H - 2 * pad) / Math.max(1, maxy - miny));
    var cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    var T = function (p) { return [W / 2 + (p[0] - cx) * s, H / 2 - (p[1] - cy) * s]; };
    T.s = s; return T;
  }
  function polyPoints(pts, T) { var a = []; pts.forEach(function (p) { var q = T(p); a.push(q[0], q[1]); }); return a; }
  function stopAnim() { if (animTimer) { clearInterval(animTimer); animTimer = null; } }

  function draw(data) {
    _last = data; stopAnim();
    if (!layer) return;
    layer.destroyChildren(); barLayer.destroyChildren();
    var sec = data.section || {}, all = [];
    (sec.outer || []).forEach(function (p) { all.push(p); });
    (sec.openings || []).forEach(function (op) { op.forEach(function (p) { all.push(p); }); });
    (data.bars2d || []).forEach(function (b) { (b.pts || []).forEach(function (p) { all.push(p); }); });
    (data.lbars2d || []).forEach(function (b) { (b.dots || []).forEach(function (p) { all.push(p); }); });
    (data.mesh2d || []).forEach(function (b) { (b.pts || []).forEach(function (p) { all.push(p); }); });
    (data.anim || []).forEach(function (a) { (a.frames || []).forEach(function (fr) { fr.forEach(function (s) { all.push([s[0], s[1]]); if (s.length >= 4) all.push([s[2], s[3]]); }); }); });
    if (!all.length) { layer.draw(); barLayer.draw(); drawElev(data); return; }
    var T = fitView(all);
    if (sec.outer) layer.add(new Konva.Line({ points: polyPoints(sec.outer, T), stroke: '#0f172a', strokeWidth: 2, closed: true }));
    (sec.cells || []).forEach(function (c) { layer.add(new Konva.Line({ points: polyPoints(c, T), stroke: '#334155', strokeWidth: 1, closed: true })); });
    (sec.openings || []).forEach(function (op) { layer.add(new Konva.Line({ points: polyPoints(op, T), stroke: '#64748b', strokeWidth: 1.5, dash: [6, 4], closed: true })); });
    (sec.ducts || []).forEach(function (d) {
      if (d.shape === 'circ') { var c = T([d.x, d.y]); layer.add(new Konva.Circle({ x: c[0], y: c[1], radius: T.s * d.D / 2, stroke: '#cbd5e1', strokeWidth: 1 })); }
      else if (d.pts) { layer.add(new Konva.Line({ points: polyPoints(d.pts, T), stroke: '#cbd5e1', strokeWidth: 1, closed: true })); }
    });
    (data.mesh2d || []).forEach(function (b) { layer.add(new Konva.Line({ points: polyPoints(b.pts || [], T), stroke: '#ea580c', strokeWidth: 1.4, lineCap: 'round', opacity: 0.9 })); });
    layer.draw();
    if (data.anim && data.anim.length) playAnim(data, T);
    else { drawBarsFinal(data.bars2d || [], T); drawLbarsFinal(data.lbars2d || [], T); barLayer.draw(); }
    drawElev(data);
  }
  function drawBarsFinal(bars2d, T) { bars2d.forEach(function (b) { barLayer.add(new Konva.Line({ points: polyPoints(b.pts || [], T), stroke: '#f97316', strokeWidth: 1.8, lineJoin: 'round' })); }); }
  function drawLbarsFinal(lbars2d, T) {
    lbars2d.forEach(function (b) {
      var r = Math.max(1.2, T.s * (b.dia || 13) / 2);
      (b.dots || []).forEach(function (p) { var c = T(p); barLayer.add(new Konva.Circle({ x: c[0], y: c[1], radius: r, fill: '#f59e0b', stroke: '#b45309', strokeWidth: Math.max(0.6, r * 0.18) })); });
    });
  }
  function playAnim(data, T) {
    var anim = data.anim, finalT = {}, finalL = {};
    (data.bars2d || []).forEach(function (b) { finalT[b.id] = b; });
    (data.lbars2d || []).forEach(function (b) { finalL[b.id] = b; });
    var maxTick = 0; anim.forEach(function (a) { maxTick = Math.max(maxTick, (a.start || 0) + (a.frames || []).length); });
    var tick = 0;
    function render() {
      barLayer.destroyChildren();
      anim.forEach(function (a) {
        var start = a.start || 0, frames = a.frames || [], local = tick - start, isL = (a.kind === 'lrebar');
        if (local < 0) return;
        if (local < frames.length) {
          if (isL) { var r = Math.max(1.2, T.s * (a.dia || 13) / 2); frames[local].forEach(function (s) { var c = T([s[0], s[1]]); barLayer.add(new Konva.Circle({ x: c[0], y: c[1], radius: r, fill: '#fbbf24', stroke: '#b45309', strokeWidth: Math.max(0.6, r * 0.18) })); }); }
          else { frames[local].forEach(function (s) { var p1 = T([s[0], s[1]]), p2 = T([s[2], s[3]]); barLayer.add(new Konva.Line({ points: [p1[0], p1[1], p2[0], p2[1]], stroke: '#fb923c', strokeWidth: 1.6, lineCap: 'round' })); }); }
        } else {
          if (isL) { var b = finalL[a.id]; if (b) drawLbarsFinal([b], T); }
          else { var bt = finalT[a.id]; if (bt) barLayer.add(new Konva.Line({ points: polyPoints(bt.pts || [], T), stroke: '#f97316', strokeWidth: 1.8, lineJoin: 'round' })); }
        }
      });
      barLayer.draw(); tick++;
      if (tick > maxTick + 2) stopAnim();
    }
    render(); animTimer = setInterval(render, 45);
  }
  function stopElevAnim() { if (elevTimer) { clearInterval(elevTimer); elevTimer = null; } }
  function elevPoly(pts, T) { var a = []; (pts || []).forEach(function (p) { var q = T(p); a.push(q[0], q[1]); }); return a; }
  function drawElev(data) {
    if (!elevStage) return;
    stopElevAnim(); elevLayer.destroyChildren();
    var hoops = data.hoops || [], wrap = el('elevWrap');
    if (!hoops.length) { if (wrap) wrap.style.display = 'none'; elevLayer.draw(); return; }
    if (wrap) wrap.style.display = 'block';
    var all = [];
    hoops.forEach(function (h) { (h.pts || []).forEach(function (p) { all.push(p); }); });
    (data.hoopAnim || []).forEach(function (a) { (a.frames || []).forEach(function (fr) { fr.forEach(function (s) { all.push([s[0], s[1]]); if (s.length >= 4) all.push([s[2], s[3]]); }); }); });
    if (!all.length) { elevLayer.draw(); return; }
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    all.forEach(function (p) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; });
    var W = elevStage.width(), H = elevStage.height(), pad = 22;
    var s = Math.min((W - 2 * pad) / Math.max(1, maxx - minx), (H - 2 * pad) / Math.max(1, maxy - miny));
    var cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    var T = function (p) { return [W / 2 + (p[0] - cx) * s, H / 2 - (p[1] - cy) * s]; };
    var anim = data.hoopAnim || [];
    if (anim.length) {
      var finalById = {}; hoops.forEach(function (h) { finalById[h.id] = h; });
      var maxTick = 0; anim.forEach(function (a) { maxTick = Math.max(maxTick, (a.start || 0) + (a.frames || []).length); });
      var tick = 0;
      var render = function () {
        elevLayer.destroyChildren();
        anim.forEach(function (a) {
          var start = a.start || 0, frames = a.frames || [], local = tick - start;
          if (local < 0) return;
          if (local < frames.length) { frames[local].forEach(function (seg) { var p1 = T([seg[0], seg[1]]), p2 = T([seg[2], seg[3]]); elevLayer.add(new Konva.Line({ points: [p1[0], p1[1], p2[0], p2[1]], stroke: '#e11d48', strokeWidth: 1.5, lineCap: 'round' })); }); }
          else { var h = finalById[a.id]; if (h) elevLayer.add(new Konva.Line({ points: elevPoly(h.pts, T), stroke: '#be123c', strokeWidth: 1.8, lineJoin: 'round' })); }
        });
        elevLayer.draw();
        if (++tick > maxTick + 2) stopElevAnim();
      };
      render(); elevTimer = setInterval(render, 45);
    } else {
      hoops.forEach(function (h) { elevLayer.add(new Konva.Line({ points: elevPoly(h.pts, T), stroke: '#be123c', strokeWidth: 1.8, lineJoin: 'round' })); });
      elevLayer.draw();
    }
  }

  document.addEventListener('DOMContentLoaded', function () { PX.mount('mount-draw-pscboxdia'); });
})();
