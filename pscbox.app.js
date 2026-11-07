/*  app.js — PSCBOX DIAPHRAGM 공개 껍데기.
 *
 *  하는 일은 셋뿐이다 (중요한 계산은 서버 PHP 가 한다) :
 *    1. 엑셀을 읽어 시트 행을 얻는다 (SheetJS, 브라우저)
 *    2. 그 행을 rebar_api.php 로 보낸다
 *    3. 돌려받은 좌표를 Konva 로 그린다
 *
 *  단면 기하 · 철근 벤딩 · PF 엔진은 전부 서버에 있고, 여기는 결과 좌표만 본다.
 *
 *  ── 서버와 주고받는 꼴 (contract) ──────────────────────────────────────
 *  보냄  POST rebar_api.php   { "sheet": [[cell,...], ...] }
 *  받음  {
 *    ok,
 *    section:{ outer:[[x,y]..], cells:[[[x,y]..]..], openings:[[[x,y]..]..],
 *              ducts:[{shape:'circ',x,y,D}|{shape:'poly',pts:[[x,y]..]}], dims:{KEY:VAL} },
 *    bars2d:[ {id,dia,pts:[[x,y]..],z} ],
 *    log:[...]
 *  }
 *  (y 는 화면에서 위가 +y 가 되도록 그릴 때 뒤집는다.)
 */
(function () {
  'use strict';
  var API = 'rebar_api.php';
  var stage, layer;

  function el(id) { return document.getElementById(id); }
  function setStatus(msg, bad) { var s = el('status'); s.textContent = msg; s.className = bad ? 'badge err' : 'badge'; }

  // ── Konva 준비 ─────────────────────────────────────────────────────────
  function initStage() {
    var host = el('stage2d');
    stage = new Konva.Stage({ container: 'stage2d', width: host.clientWidth || 600, height: 360 });
    layer = new Konva.Layer();
    stage.add(layer);
    window.addEventListener('resize', function () {
      if (!stage) return;
      stage.width(host.clientWidth || 600);
      if (window._last) draw(window._last);
    });
  }

  //  모든 좌표의 경계상자 → 화면에 맞추는 스케일·이동 (y 뒤집음)
  function fitView(pts) {
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    pts.forEach(function (p) {
      if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0];
      if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1];
    });
    var W = stage.width(), H = stage.height(), pad = 28;
    var sx = (W - 2 * pad) / Math.max(1, maxx - minx);
    var sy = (H - 2 * pad) / Math.max(1, maxy - miny);
    var s = Math.min(sx, sy);
    var cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    var T = function (p) {
      return [W / 2 + (p[0] - cx) * s, H / 2 - (p[1] - cy) * s];   // y 뒤집음
    };
    T.s = s;   // 길이 스케일 (덕트 반지름 등에 쓴다)
    return T;
  }

  function polyPoints(pts, T) { var a = []; pts.forEach(function (p) { var q = T(p); a.push(q[0], q[1]); }); return a; }

  // ── 그리기 ─────────────────────────────────────────────────────────────
  function draw(data) {
    window._last = data;
    layer.destroyChildren();
    var sec = data.section || {};
    var all = [];
    (sec.outer || []).forEach(function (p) { all.push(p); });
    (sec.openings || []).forEach(function (op) { op.forEach(function (p) { all.push(p); }); });
    (data.bars2d || []).forEach(function (b) { (b.pts || []).forEach(function (p) { all.push(p); }); });
    if (!all.length) { layer.draw(); return; }
    var T = fitView(all);

    // 콘크리트 외곽
    if (sec.outer) layer.add(new Konva.Line({ points: polyPoints(sec.outer, T), stroke: '#0f172a', strokeWidth: 2, closed: true }));
    // 셀
    (sec.cells || []).forEach(function (c) {
      layer.add(new Konva.Line({ points: polyPoints(c, T), stroke: '#334155', strokeWidth: 1, closed: true }));
    });
    // 개구부
    (sec.openings || []).forEach(function (op) {
      layer.add(new Konva.Line({ points: polyPoints(op, T), stroke: '#64748b', strokeWidth: 1.5, dash: [6, 4], closed: true }));
    });
    // 덕트
    (sec.ducts || []).forEach(function (d) {
      if (d.shape === 'circ') {
        var c = T([d.x, d.y]); var r = T.s * d.D / 2;
        layer.add(new Konva.Circle({ x: c[0], y: c[1], radius: r, stroke: '#cbd5e1', strokeWidth: 1 }));
      } else if (d.pts) {
        layer.add(new Konva.Line({ points: polyPoints(d.pts, T), stroke: '#cbd5e1', strokeWidth: 1, closed: true }));
      }
    });
    // 철근
    (data.bars2d || []).forEach(function (b) {
      layer.add(new Konva.Line({ points: polyPoints(b.pts || [], T), stroke: '#f97316', strokeWidth: 1.6, lineJoin: 'round' }));
    });
    layer.draw();
  }

  // ── 표 · 로그 ───────────────────────────────────────────────────────────
  function fillTable(dims) {
    var tb = el('dimTable').querySelector('tbody');
    tb.innerHTML = '';
    var keys = Object.keys(dims || {});
    if (!keys.length) { tb.innerHTML = '<tr><td>—</td><td>없음</td></tr>'; return; }
    keys.forEach(function (k) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + k + '</td><td>' + dims[k] + '</td>';
      tb.appendChild(tr);
    });
  }
  function fillLog(lines) { el('log').textContent = (lines || []).join('\n'); }

  // ── 서버에 보내기 ────────────────────────────────────────────────────────
  function solve(rows) {
    setStatus('서버에서 계산 중…');
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sheet: rows }) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok) { setStatus((data && data.error) || '계산 실패', true); return; }
        draw(data);
        fillTable((data.section || {}).dims);
        fillLog(data.log);
        var n = (data.bars2d || []).length;
        var msg;
        if (data.stub) msg = '샘플/stub — 엔진 미배포';
        else if (data.engine === 'section') msg = '단면 OK (서버 엔진) — 철근 배치는 포팅 중';
        else msg = '완료 — 철근 ' + n + ' 가닥';
        setStatus(msg);
      })
      .catch(function (e) { setStatus('서버 연결 실패: ' + e.message, true); });
  }

  // ── 엑셀 읽기 ────────────────────────────────────────────────────────────
  function readExcel(file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var wb = XLSX.read(ev.target.result, { type: 'array' });
        var name = el('sheetName').value.trim() || wb.SheetNames[0];
        var ws = wb.Sheets[name] || wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
        solve(rows);
      } catch (e) { setStatus('엑셀 읽기 실패: ' + e.message, true); }
    };
    reader.readAsArrayBuffer(file);
  }

  // ── 버튼 ─────────────────────────────────────────────────────────────────
  function wire() {
    el('btnLoad').addEventListener('click', function () { el('fileInput').click(); });
    el('fileInput').addEventListener('change', function (e) { if (e.target.files[0]) readExcel(e.target.files[0]); });
    el('btnRegen').addEventListener('click', function () { if (window._lastRows) solve(window._lastRows); else solve([]); });
    el('btnLog').addEventListener('click', function () { var l = el('log'); l.style.display = l.style.display === 'block' ? 'none' : 'block'; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initStage();
    wire();
    solve([]);   // 빈 시트 → 서버가 샘플(stub)을 돌려준다
  });
})();
