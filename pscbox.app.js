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
  //  3D 뷰 모듈(공개, 엔진 없음 — 서버 2D 결과를 교축 z 로 편다). jsDelivr 로 받는다.
  //  호스트 페이지가 window.PSC_BASE(= 커밋 고정 jsDelivr 베이스)를 주면 3D 모듈도 같은 버전으로.
  var MOD3D = (window.PSC_BASE || 'https://cdn.jsdelivr.net/gh/macroBIM/public@main/') + 'bim_pscboxdia_3d.js';
  var OP_SHAPES = [['RECT', 'Rectangle'], ['HEX', 'Hexagon'], ['OCT', 'Octagon']];

  // ── 상태 ──
  var stage, layer, barLayer, elevStage, elevLayer, animTimer = null, elevTimer = null;
  var _excelData = null, _last = null, _busy = false, _queued = null;
  //  2D 뷰(줌/팬) — 스테이지를 스케일하지 않고 **다시 그린다**. 그래서 선 두께가
  //  같이 커지지 않고(외곽선은 크리스프 2px 유지) 간격·철근만 커진다 = CAD 식 줌.
  var _view = { k: 1, dx: 0, dy: 0 };

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
  //  Dimension 카드 안 Opening 섹션 : 제목+고려 체크박스 → (체크 시) 3칸: 구멍상세 · 단면내 위치 · 입력태그
  function openingSectionHTML() {
    //  원본 pscbox-ui.css 의 기존 클래스 그대로 — op-wrap + 3칸(op-view, 각 1/3) 동일 너비.
    //  그림칸은 16:9, 세 칸 모두 같은 폭.
    var box169 = 'aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;overflow:hidden;';
    var box169col = 'aspect-ratio:16/9;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;overflow:hidden;';
    return '      <div style="margin-top:16px;border-top:1px dashed var(--hair,#e2e8f0);padding-top:12px;">' +
      '        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:10px;">' +
      '          <span class="draw-card-title">OPENING</span>' +
      '          <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:#334155;cursor:pointer;font-weight:500;"><input type="checkbox" id="opConsider" checked onchange="PXDIA.onOpConsider()"> 고려 (consider)</label>' +
      '          <span class="draw-card-desc" style="margin:0;">셀당 하나 · 2 Cell 은 중심에서 &#8723;X 로 양쪽에. RECT/HEX/OCT · Y 는 하부슬래브 상단 기준.</span>' +
      '        </div>' +
      '        <div class="op-wrap" id="openingBody">' +
      '          <div class="op-view"><h4>구멍상세 (hole detail)</h4><div id="op_detail" style="' + box169col + '"></div></div>' +
      '          <div class="op-view"><h4>단면내 위치 (diaphragm face)</h4><div id="op_face" style="' + box169 + '"></div></div>' +
      '          <div class="op-view"><h4>입력태그 (inputs)</h4><div style="padding:11px 12px;">' + openingInputsHTML() + '</div></div>' +
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
      '    <div class="draw-card-header"><div><span class="draw-card-title">REBAR LAYOUT</span> <span class="draw-card-desc">단면 · 철근을 서버(숨은 엔진)에서 계산해 그린다 — 그림만 받는다</span></div>' +
      '      <div class="engine-ctrls"><button type="button" class="engine-btn engine-btn-lite active" id="btnView3D" onclick="PXDIA.toggle3D()">&#9634; 3D</button></div>' +
      '    </div>' +
      '    <div class="draw-card-body" style="padding:0;">' +
      '      <div class="phys-split">' +
      '        <div class="phys-pane"><span class="phys-cap">2D &mdash; SECTION</span>' +
      '          <div id="stage2d" style="width:100%;aspect-ratio:16/9;background:#41699b;overflow:hidden;cursor:grab;"></div></div>' +
      '        <div class="phys-pane" id="pane3d"><span class="phys-cap">3D &mdash; DIAPHRAGM</span>' +
      '          <div class="view3d-bar" id="view3dBar">' + view3dBarHTML() + '</div>' +
      '          <div id="render3dContainer" style="width:100%;aspect-ratio:16/9;background:#41699b;overflow:hidden;cursor:grab;"></div></div>' +
      '      </div>' +
      '      <div id="elevWrap" style="display:none;padding:10px 14px;"><div style="font-size:12px;color:#64748b;margin:2px 0 4px;">교축방향 폐합철근 (입면)</div><div id="stage_elev"></div></div>' +
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
    _view3D: 'iso', _proj3D: 'persp', _is3D: true,
    mount: function (rootId) {
      var root = el(rootId); if (!root) return;
      root.innerHTML = mountHTML();
      initStages();
      renderRebarTable();
      this._mark3DBar();
      this.redraw();
    },
    //  3D 켜고/끄기 — 끄면 2D 가 한 줄을 다 쓴다
    toggle3D: function () {
      var pane = el('pane3d'), btn = el('btnView3D'); if (!pane) return;
      var on = pane.style.display === 'none';
      pane.style.display = on ? '' : 'none';
      if (btn) btn.classList.toggle('active', on);
      this._is3D = on;
      if (on && _last) draw3D(_last);
    },
    //  시점 : 장면이 서 있으면 카메라만 옮기고, 아니면 다시 그린다
    view3D: function (name) {
      this._view3D = name; this._mark3DBar();
      var st = this._st3D();
      if (st && typeof st.setView === 'function') { st.setView(name); return; }
      if (_last) draw3D(_last);
    },
    //  투영 : persp(투시) · ortho(정사). 보던 각도는 유지
    proj3D: function (kind) {
      this._proj3D = (kind === 'ortho') ? 'ortho' : 'persp'; this._mark3DBar();
      var st = this._st3D();
      if (st && typeof st.setProjection === 'function') { st.setProjection(this._proj3D); return; }
      if (_last) draw3D(_last);
    },
    _st3D: function () { var h = el('render3dContainer'); return (h && h._pscdia3d) || null; },
    _mark3DBar: function () {
      var bar = el('view3dBar'); if (!bar) return;
      var self = this;
      Array.prototype.forEach.call(bar.querySelectorAll('[data-v]'), function (b) { b.classList.toggle('active', b.getAttribute('data-v') === self._view3D); });
      Array.prototype.forEach.call(bar.querySelectorAll('[data-p]'), function (b) { b.classList.toggle('active', b.getAttribute('data-p') === self._proj3D); });
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
    //  진행 중이면 요청을 버리지 않고 "최신 입력"만 대기열에 둔다 — 끝나면 그걸로 다시 그린다.
    //  (엑셀 로드가 초기 계산과 겹치면 옛 버전은 if(_busy)return 으로 버려져 그림이 안 바뀌었다.)
    if (_busy) { _queued = rows; return; }
    _busy = true;
    setStatus('서버에서 계산 중…');
    var done = function () {
      _busy = false;
      if (_queued) { var q = _queued; _queued = null; solve(q); }   // 대기 중 최신 입력으로 재계산
    };
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sheet: rows }) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok) { setStatus((data && data.error) || '계산 실패', true); done(); return; }
        draw(data);
        drawGuide(data);
        drawOpening(data);
        draw3D(data);
        fillLog(data.log);
        var nb = (data.bars2d || []).length, nl = (data.lbars2d || []).length, nh = (data.hoops || []).length, nm = (data.mesh2d || []).length;
        setStatus('완료 — trebar ' + nb + ' · lrebar ' + nl + ' · 폐합 ' + nh + ' · 면철근망 ' + nm + (data.stub ? ' (stub)' : ''));
        done();
      })
      .catch(function (e) { setStatus('서버 연결 실패: ' + e.message, true); done(); });
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
  //  그림칸은 폭에 맞춰 16:9 비율을 유지한다 (원본 renderView 의 aspect 와 같은 규칙).
  var AR169 = 16 / 9;
  function sizeStage169(hostEl, st) {
    if (!hostEl || !st) return;
    var w = hostEl.clientWidth || 600, h = Math.max(180, Math.round(w / AR169));
    hostEl.style.height = h + 'px';
    st.width(w); st.height(h);
  }
  //  휠 줌 + 드래그 팬 + 더블클릭 리셋 (원본 철근도와 같은 조작). 선·점 두께는 stage 배율로 같이 커진다.
  //  2D 철근도 줌/팬 — **스테이지를 스케일하지 않고 다시 그린다**(_view). 그래서
  //  외곽선·격자는 크리스프 2px/1px 를 유지하고, 간격·철근(지름비례)만 커진다.
  //  (stage.scale 로 하면 선 두께까지 같이 커져 「이미지 확대」처럼 보인다.)
  function attachZoomPan2D(st) {
    if (!st || st._zp2) return; st._zp2 = true;
    var cont = st.container(); try { cont.style.cursor = 'grab'; } catch (e) {}
    var panning = false, lastX = 0, lastY = 0, raf = 0;
    function redraw() { if (_last) draw(_last, true); }   // noAnim: 줌/팬은 최종상태를 다시 그릴 뿐
    function schedule() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; redraw(); }); }
    cont.addEventListener('wheel', function (e) {
      e.preventDefault();
      var rect = cont.getBoundingClientRect();
      var px = e.clientX - rect.left, py = e.clientY - rect.top;
      var W = st.width(), H = st.height();
      var r = e.deltaY > 0 ? 1 / 1.12 : 1.12;
      var nk = Math.max(0.4, Math.min(80, _view.k * r)); r = nk / _view.k;
      //  포인터 아래 모형점이 제자리에 있도록 팬을 보정 (W/2·H/2 가 fitView 의 중심)
      _view.dx = px - W / 2 - (px - W / 2 - _view.dx) * r;
      _view.dy = py - H / 2 - (py - H / 2 - _view.dy) * r;
      _view.k = nk;
      redraw();
    }, { passive: false });
    cont.addEventListener('mousedown', function (e) { panning = true; lastX = e.clientX; lastY = e.clientY; try { cont.style.cursor = 'grabbing'; } catch (x) {} });
    window.addEventListener('mousemove', function (e) { if (!panning) return; _view.dx += (e.clientX - lastX); _view.dy += (e.clientY - lastY); lastX = e.clientX; lastY = e.clientY; schedule(); });
    window.addEventListener('mouseup', function () { if (panning) { panning = false; try { cont.style.cursor = 'grab'; } catch (x) {} } });
    cont.addEventListener('dblclick', function () { _view.k = 1; _view.dx = 0; _view.dy = 0; redraw(); });
  }
  //  입면(elev) 스테이지 — 보조라 예전 방식(스테이지 스케일) 그대로.
  function attachStageZoomPan(st) {
    if (!st || st._zp) return; st._zp = true;
    st.draggable(true);
    try { st.container().style.cursor = 'grab'; } catch (e) {}
    st.on('wheel', function (e) {
      e.evt.preventDefault();
      var old = st.scaleX() || 1;
      var ptr = st.getPointerPosition();
      if (!ptr) { var rect = st.container().getBoundingClientRect(); ptr = { x: e.evt.clientX - rect.left, y: e.evt.clientY - rect.top }; }
      var mp = { x: (ptr.x - st.x()) / old, y: (ptr.y - st.y()) / old };
      var ns = Math.max(0.4, Math.min(80, e.evt.deltaY > 0 ? old / 1.12 : old * 1.12));
      st.scale({ x: ns, y: ns }); st.position({ x: ptr.x - mp.x * ns, y: ptr.y - mp.y * ns }); st.batchDraw();
    });
    st.on('dblclick dbltap', function () { st.scale({ x: 1, y: 1 }); st.position({ x: 0, y: 0 }); st.batchDraw(); });
  }
  function initStages() {
    var host = el('stage2d'); if (!host) return;
    stage = new Konva.Stage({ container: 'stage2d', width: host.clientWidth || 600, height: 420 });
    layer = new Konva.Layer(); barLayer = new Konva.Layer();
    stage.add(layer); stage.add(barLayer);
    sizeStage169(host, stage);
    attachZoomPan2D(stage);
    var ehost = el('stage_elev');
    if (ehost) { elevStage = new Konva.Stage({ container: 'stage_elev', width: host.clientWidth || 600, height: 220 }); elevLayer = new Konva.Layer(); elevStage.add(elevLayer); attachStageZoomPan(elevStage); }
    var fi = el('excelFileInput'); if (fi) fi.addEventListener('change', function (e) { if (e.target.files[0]) onFile(e.target.files[0]); });
    window.addEventListener('resize', function () {
      if (!stage || !host) return;
      sizeStage169(host, stage);
      if (elevStage) elevStage.width(host.clientWidth || 600);
      if (_last) { draw(_last); drawOpening(_last); }
    });
  }
  // ── 3D 뷰 (오른쪽 칸) ───────────────────────────────────────────────────────
  //  시점·투영 버튼 바 (원본 bim_pscbox_diaphragm_test 의 view3d-bar 와 동일)
  function view3dBarHTML() {
    var vb = ['iso', 'front', 'back', 'top', 'bottom', 'left', 'right'].map(function (v) {
      return '<button type="button" data-v="' + v + '" onclick="PXDIA.view3D(\'' + v + '\')">' + v.toUpperCase() + '</button>';
    }).join('');
    var pb = [['persp', 'PERSP'], ['ortho', 'ORTHO']].map(function (p) {
      return '<button type="button" data-p="' + p[0] + '" onclick="PXDIA.proj3D(\'' + p[0] + '\')">' + p[1] + '</button>';
    }).join('');
    return vb + '<span class="view3d-sep"></span>' + pb;
  }
  //  서버 2D 결과 → 3D 모듈 cfg (모듈이 교축 z 로 편다). 엔진 비밀 없음.
  function collect3D(data) {
    var sec = data.section || {};
    var tre = (data.bars2d || []).map(function (b) { return { id: b.id, dia: b.dia, pts: b.pts }; });
    var lre = [];
    (data.lbars2d || []).forEach(function (b) { (b.dots || []).forEach(function (p) { lre.push({ id: b.id, dia: b.dia, x: p[0], y: p[1] }); }); });
    var hoops = (data.hoops || []).map(function (h) { return { plane: h.plane, at: h.at, pts: h.pts, dia: h.dia }; });
    return {
      outer: sec.outer || [], cells: sec.cells || [], openings: sec.openings || [],
      segLen: SEG_DEF, diaT: DIA_DEF, treCtc: 150,
      trebar: tre, lrebar: lre, hoops: hoops
    };
  }
  function draw3D(data) {
    if (!data) return;
    var pane = el('pane3d'); if (pane && pane.style.display === 'none') return;
    if (!el('render3dContainer')) return;
    if (!window.RWSVG || typeof window.RWSVG.render3d !== 'function') return;
    var cfg = collect3D(data);
    cfg.view = PX._view3D; cfg.proj = PX._proj3D;
    try { window.RWSVG.render3d('render3dContainer', 'render_pscboxdia_3d', MOD3D, [cfg]); } catch (e) {}
  }

  //  입력칸 → 개구부 입력 객체 (구멍상세·단면내위치 그림이 쓴다)
  function readOpeningInput() {
    var c = el('opConsider');
    var num = function (id) { var v = parseFloat(val(id)); return isFinite(v) ? v : 0; };
    return {
      on: !c || c.checked,
      shape: val('op1_shape') || OPEN_DEF.shape,
      B: num('op1_B'), H: num('op1_H'),
      cttx: num('op1_CTTX'), ctty: num('op1_CTTY'),
      ctbx: num('op1_CTBX'), ctby: num('op1_CTBY'),
      X: num('op1_X'), Y: num('op1_Y')
    };
  }
  //  형상에 따라 쓰이지 않는 코너컷 칸을 잠근다 (RECT 없음 · HEX 위만 · OCT 위·아래)
  function syncOpeningInputs(o) {
    ['CTTX', 'CTTY'].forEach(function (k) { var e = el('op1_' + k); if (e) e.disabled = !o.on || o.shape === 'RECT'; });
    ['CTBX', 'CTBY'].forEach(function (k) { var e = el('op1_' + k); if (e) e.disabled = !o.on || o.shape !== 'OCT'; });
    ['op1_shape', 'op1_B', 'op1_H', 'op1_X', 'op1_Y'].forEach(function (id) { var e = el(id); if (e) e.disabled = !o.on; });
  }
  //  Opening 그림 — 구멍상세(op_detail) + 단면내 위치(op_face). 서버 ap/geo + 입력값으로만 (공개 drawer).
  function drawOpening(data) {
    var o = readOpeningInput();
    syncOpeningInputs(o);
    var c = el('opConsider');
    if (c && !c.checked) return;                 // 고려 안 함 → openingBody 숨김 상태
    var slope = (data && data.ap && Number(data.ap.SLB)) || 0;
    if (typeof window.pscDrawHoleDetail === 'function') { try { window.pscDrawHoleDetail('op_detail', o, slope); } catch (e) {} }
    if (typeof window.pscDrawDiaFace === 'function' && data && data.ap && data.geo) { try { window.pscDrawDiaFace('op_face', data.ap, data.geo, o); } catch (e) {} }
  }
  function fitView(pts) {
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    pts.forEach(function (p) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; });
    var W = stage.width(), H = stage.height(), pad = 28;
    var s0 = Math.min((W - 2 * pad) / Math.max(1, maxx - minx), (H - 2 * pad) / Math.max(1, maxy - miny));
    var s = s0 * _view.k;   // 줌은 배율로 들어가 **다시 그린다** (스테이지 스케일 아님)
    var cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    var dx = _view.dx, dy = _view.dy;
    var T = function (p) { return [W / 2 + (p[0] - cx) * s + dx, H / 2 - (p[1] - cy) * s + dy]; };
    T.s = s; T.W = W; T.H = H;
    //  화면좌표 → 모형좌표 (격자가 보이는 영역 전체를 채우도록)
    T.inv = function (sx, sy) { return [cx + (sx - W / 2 - dx) / s, cy - (sy - H / 2 - dy) / s]; };
    return T;
  }
  function polyPoints(pts, T) { var a = []; pts.forEach(function (p) { var q = T(p); a.push(q[0], q[1]); }); return a; }
  function stopAnim() { if (animTimer) { clearInterval(animTimer); animTimer = null; } }

  //  격자 — 원본처럼 **보이는 화면 전체**를 채운다 (내용 상자만이 아니라). 원점 십자는 밝게.
  function drawGrid(T) {
    if (!T || !T.inv) return;
    var W = T.W, H = T.H;
    //  화면 네 귀퉁이를 모형좌표로 되돌려 보이는 영역을 구한다
    var c0 = T.inv(0, 0), c1 = T.inv(W, H);
    var minx = Math.min(c0[0], c1[0]), maxx = Math.max(c0[0], c1[0]);
    var miny = Math.min(c0[1], c1[1]), maxy = Math.max(c0[1], c1[1]);
    var span = Math.max(maxx - minx, maxy - miny), step = 1000;
    while (span / step > 30) step *= 2;                 // 너무 촘촘하지 않게
    while (span / step < 8 && step > 125) step /= 2;    // 확대하면 더 촘촘하게
    var x0 = Math.floor(minx / step) * step, x1 = Math.ceil(maxx / step) * step;
    var y0 = Math.floor(miny / step) * step, y1 = Math.ceil(maxy / step) * step;
    var fine = 'rgba(255,255,255,0.10)', axis = 'rgba(255,255,255,0.34)';
    for (var x = x0; x <= x1 + 0.5; x += step) {
      var a = T([x, y0]), b = T([x, y1]);
      layer.add(new Konva.Line({ points: [a[0], a[1], b[0], b[1]], stroke: Math.abs(x) < 0.5 ? axis : fine, strokeWidth: 1 }));
    }
    for (var y = y0; y <= y1 + 0.5; y += step) {
      var c = T([x0, y]), d = T([x1, y]);
      layer.add(new Konva.Line({ points: [c[0], c[1], d[0], d[1]], stroke: Math.abs(y) < 0.5 ? axis : fine, strokeWidth: 1 }));
    }
  }
  function draw(data, noAnim) {
    if (data !== _last) { _view.k = 1; _view.dx = 0; _view.dy = 0; }   // 새 계산이면 뷰 리셋 (줌/팬 재그리기는 같은 _last 라 유지)
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
    drawGrid(T);   // 보이는 화면 전체를 채우는 격자 + 원점 십자
    //  원본 격벽 2D 팔레트(#41699b 바탕) : 외곽·개구부 흰선, 덕트 분홍(#FF61E6)
    if (sec.outer) layer.add(new Konva.Line({ points: polyPoints(sec.outer, T), stroke: '#ffffff', strokeWidth: 2, closed: true, lineJoin: 'round' }));
    (sec.cells || []).forEach(function (c) { layer.add(new Konva.Line({ points: polyPoints(c, T), stroke: 'rgba(255,255,255,0.45)', strokeWidth: 1, closed: true })); });
    (sec.openings || []).forEach(function (op) { layer.add(new Konva.Line({ points: polyPoints(op, T), stroke: '#ffffff', strokeWidth: 2, closed: true, lineJoin: 'round' })); });
    (sec.ducts || []).forEach(function (d) {
      if (d.shape === 'circ') { var c = T([d.x, d.y]); layer.add(new Konva.Circle({ x: c[0], y: c[1], radius: T.s * d.D / 2, stroke: '#FF61E6', strokeWidth: 1.5 })); }
      else if (d.pts) { layer.add(new Konva.Line({ points: polyPoints(d.pts, T), stroke: '#FF61E6', strokeWidth: 1.5, closed: true })); }
    });
    (data.mesh2d || []).forEach(function (b) { layer.add(new Konva.Line({ points: polyPoints(b.pts || [], T), stroke: '#ea580c', strokeWidth: 1.4, lineCap: 'round', opacity: 0.9 })); });
    layer.draw();
    if (!noAnim && data.anim && data.anim.length) playAnim(data, T);
    else { drawBarsFinal(data.bars2d || [], T); drawTiesFinal(data.ties2d || [], T); drawLbarsFinal(data.lbars2d || [], T); barLayer.draw(); }
    drawElev(data);
  }
  //  철근 스타일 — 원본과 동일 : 실제 지름(mm) × 화면배율 로 선 두께.
  //  원본은 **선택(focus) 된 철근만** #FF3D00 글로우를 입힌다 — 기본은 심선 하나뿐(glowOp=0).
  //  색 : trebar 보라 #8A2BE2 · srebar 갈고리 **청록 #0E9F9F** · lrebar 금색 점.
  var TRE_COLOR = '#8A2BE2', SRE_COLOR = '#0E9F9F';
  function barW(dia, T) { return Math.max(0.8, (dia > 0 ? dia : 5) * T.s); }
  function addBar(pts, dia, T, core, glowOp) {
    var w = barW(dia, T);
    if (glowOp) barLayer.add(new Konva.Line({ points: pts, stroke: '#FF3D00', strokeWidth: w * 2.1, lineCap: 'round', lineJoin: 'round', opacity: glowOp }));
    barLayer.add(new Konva.Line({ points: pts, stroke: core, strokeWidth: w, lineCap: 'round', lineJoin: 'round' }));
  }
  function drawBarsFinal(bars2d, T) { bars2d.forEach(function (b) { addBar(polyPoints(b.pts || [], T), b.dia, T, TRE_COLOR, 0); }); }
  //  srebar 갈고리(ㄷ·∩) — 스터럽. 원본과 같은 청록(#0E9F9F).
  function drawTiesFinal(ties2d, T) { ties2d.forEach(function (b) { addBar(polyPoints(b.pts || [], T), b.dia, T, SRE_COLOR, 0); }); }
  function drawLbarsFinal(lbars2d, T) {
    lbars2d.forEach(function (b) {
      var r = Math.max(1.2, T.s * (b.dia || 13) / 2);
      (b.dots || []).forEach(function (p) { var c = T(p); barLayer.add(new Konva.Circle({ x: c[0], y: c[1], radius: r, fill: '#FFD700', stroke: '#B8860B', strokeWidth: Math.max(0.6, r * 0.18) })); });
    });
  }
  function playAnim(data, T) {
    var anim = data.anim, finalT = {}, finalL = {};
    (data.bars2d || []).forEach(function (b) { finalT[b.id] = b; });
    (data.lbars2d || []).forEach(function (b) { finalL[b.id] = b; });
    var maxTick = 0; anim.forEach(function (a) { maxTick = Math.max(maxTick, (a.start || 0) + (a.frames || []).length); });
    //  빽빽한 데이터(수백 개)면 settle 프레임이 수천 틱 → 15초+ 걸려 종방향 점철근이 끝에야 나왔다.
    //  전체를 ~3초(약 70프레임) 안에 끝내도록 틱을 건너뛴다.
    var step = Math.max(1, Math.ceil(maxTick / 70));
    var tick = 0;
    function render() {
      barLayer.destroyChildren();
      anim.forEach(function (a) {
        var start = a.start || 0, frames = a.frames || [], local = tick - start, isL = (a.kind === 'lrebar');
        if (local < 0) return;
        if (local < frames.length) {
          if (isL) { var r = Math.max(1.2, T.s * (a.dia || 13) / 2); frames[local].forEach(function (s) { var c = T([s[0], s[1]]); barLayer.add(new Konva.Circle({ x: c[0], y: c[1], radius: r, fill: '#FFD700', stroke: '#B8860B', strokeWidth: Math.max(0.6, r * 0.18), opacity: 0.85 })); }); }
          else { frames[local].forEach(function (s) { var p1 = T([s[0], s[1]]), p2 = T([s[2], s[3]]); addBar([p1[0], p1[1], p2[0], p2[1]], a.dia, T, TRE_COLOR, 0); }); }
        } else {
          if (isL) { var b = finalL[a.id]; if (b) drawLbarsFinal([b], T); }
          else { var bt = finalT[a.id]; if (bt) addBar(polyPoints(bt.pts || [], T), bt.dia, T, TRE_COLOR, 0); }
        }
      });
      //  lrebar(금색 점)·ties(갈고리)는 이제 바로 최종 자리로 온다(anim 없음) — 매 프레임 같이 그려 유지한다.
      drawTiesFinal(data.ties2d || [], T);
      drawLbarsFinal(data.lbars2d || [], T);
      barLayer.draw(); tick += step;
      if (tick > maxTick + step) stopAnim();
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

  //  스크립트가 늦게(비동기 로더로) 들어와도 마운트되도록 readyState 를 본다.
  function _boot() { PX.mount('mount-draw-pscboxdia'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot);
  else _boot();
})();
