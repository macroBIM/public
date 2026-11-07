/*  pscbox.guide.js — 치수선 가이드 도면 (원본 draw_box12cell_guide 에서 그리기만).
 *  비밀 geo_box12cell 호출은 제거 — 서버(/config)가 계산한 기하(GEO)를 받아 그린다.
 *  RWSVG(bim_draw_test_core.js) 가 먼저 로드돼 있어야 한다.  pscDrawGuide(divId, ap, GEO).
 */
(function(){
window.pscDrawGuide = function(sdivid, ap, GEO){

	var odiv = document.getElementById(sdivid);
	if (!odiv) return;


	var o = GEO;   // 서버(/config 숨은 엔진)가 계산해 준 기하
	var P = {};
	o.points.forEach(function(op){ P[op.name] = op[op.name]; });

	var xmin = Math.min(P.PTL.x, P.PBL.x), xmax = Math.max(P.PTR.x, P.PBR.x);
	var ytop = Math.max(P.PTL.y, P.PTC.y, P.PTR.y);
	var ybot = Math.min(P.PBL.y, P.PBC.y, P.PBR.y);
	var S = Math.max(xmax - xmin, ytop - ybot);

	var rec = new window.RWSVG.MockViewer();
	rec.addLayer('c', 'cyan', 'solid', 1);
	rec.addLayer('h', 'gray', 'hidden', 1);

	// ── 단면 외곽 (직선 + 실제 아크) ──
	o.lines.forEach(function(l){ rec.addLine(0, l.x1, l.y1, l.x2, l.y2, 'c'); });
	o.arcs.forEach(function(a){ rec.addArc(0, a.x, a.y, a.r, a.angb, a.ange, 'c'); });

	// ── 헬퍼 ──
	function ytopf(x){ return x * (x <= 0 ? ap.SLL : ap.SLR) / 100; }
	function ybotf(x){ return -ap.TH + x * ap.SLB / 100; }
	function dimH(x1, x2, yat, gut, label, lp){
		if (x2 < x1){ var t = x1; x1 = x2; x2 = t; }
		rec.addDimLinear(0, x1, yat, x2, yat, gut - yat, label, { lp: lp || 0 });
	}
	function dimV(x, ya, yb, gut, label, lp){
		rec.addDimLinear(0, x, Math.min(ya, yb), x, Math.max(ya, yb), x - gut, label, { lp: lp || 0 });
	}
	// 두께 치수 : 해당 점 x 에서 표면선~점 사이를 gap 0 으로 직접 표기 (라벨은 선에 나란히 회전)
	function thk(x, ya, yb, label){
		rec.addDimLinear(0, x, Math.min(ya, yb), x, Math.max(ya, yb), 0, label);
	}
	// 슬래브 하면 점의 두께가 TTS 와 같을 때만 'TTS' 라벨 (1 cell 하면 보정으로 커진 곳은 값만)
	function ttsLbl(pt){
		return (Math.abs((ytopf(pt.x) - pt.y) - ap.TTS) < 0.5) ? 'TTS' : '';
	}

	// ── 상부 치수행 (안쪽부터 헌치폭 → 캔틸레버/복부폭 → 전폭) ──
	var g1 = ytop + S*0.05, g2 = ytop + S*0.10, g3 = ytop + S*0.15;

	var two = !!P.PTHCL1;		// 1 cell 모드에서는 중앙복부 관련 점이 등록되지 않음

	dimH(P.PTHL1.x,  P.PTHL2.x,  ytop, g1, 'WTHUL1');
	dimH(P.PTHL2.x,  P.PTHL3.x,  ytop, g1, 'WTHUL2', 14);
	if (two){
		dimH(P.PTHCL3.x, P.PTHCL2.x, ytop, g1, 'WTCHUL2', 14);
		dimH(P.PTHCL2.x, P.PTHCL1.x, ytop, g1, 'WTCHUL1');
		dimH(P.PTHCR1.x, P.PTHCR2.x, ytop, g1, 'WTCHUR1', 28);
		dimH(P.PTHCR2.x, P.PTHCR3.x, ytop, g1, 'WTCHUR2', 14);
	}
	dimH(P.PTHR3.x,  P.PTHR2.x,  ytop, g1, 'WTHUR2', 14);
	dimH(P.PTHR2.x,  P.PTHR1.x,  ytop, g1, 'WTHUR1');

	dimH(P.PTCL3.x, P.PTCL2.x, ytop, g2, 'WCAL2', 14);
	dimH(P.PTCL2.x, P.PTCL1.x, ytop, g2, 'WCAL1');
	dimH(P.PTCL1.x, 0,         ytop, g2, 'WTL');
	dimH(0,         P.PTCR1.x, ytop, g2, 'WTR');
	dimH(P.PTCR1.x, P.PTCR2.x, ytop, g2, 'WCAR1');
	dimH(P.PTCR2.x, P.PTCR3.x, ytop, g2, 'WCAR2', 14);

	dimH(P.PTL.x, 0,       ytop, g3, 'WL');
	dimH(0,       P.PTR.x, ytop, g3, 'WR');

	// ── 하부 헌치 폭 (상부 헌치와 동일한 체계) ──
	var gb1 = ybot - S*0.02;
	dimH(P.PBHL1.x,  P.PBHL2.x,  ybot, gb1, 'WBHUL1');
	dimH(P.PBHL2.x,  P.PBHL3.x,  ybot, gb1, 'WBHUL2', 14);
	if (two){
		dimH(P.PBHCL3.x, P.PBHCL2.x, ybot, gb1, 'WBCHUL2', 14);
		dimH(P.PBHCL2.x, P.PBHCL1.x, ybot, gb1, 'WBCHUL1');
		dimH(P.PBHCR1.x, P.PBHCR2.x, ybot, gb1, 'WBCHUR1', 28);
		dimH(P.PBHCR2.x, P.PBHCR3.x, ybot, gb1, 'WBCHUR2', 14);
	}
	dimH(P.PBHR3.x,  P.PBHR2.x,  ybot, gb1, 'WBHUR2', 14);
	dimH(P.PBHR2.x,  P.PBHR1.x,  ybot, gb1, 'WBHUR1');

	// ── 하부 폭 ──
	var gb = ybot - S*0.065;
	dimH(P.PBL.x, 0,       ybot, gb, 'WBL');
	dimH(0,       P.PBR.x, ybot, gb, 'WBR');

	// ── 전체 높이 / 단부 두께 ──
	dimV(xmax,    0,        -ap.TH,   xmax + S*0.085, 'TH');
	dimV(P.PTL.x, P.PTL.y,  P.PTCL.y, xmin - S*0.04,  'TCAL');
	dimV(P.PTR.x, P.PTR.y,  P.PTCR.y, xmax + S*0.04,  'TCAR');
	dimV(P.PBL.x, P.PBEL.y, P.PBL.y,  P.PBL.x - S*0.035, 'TBEL');
	dimV(P.PBR.x, P.PBER.y, P.PBR.y,  P.PBR.x + S*0.035, 'TBER');

	// ── 상부 두께 (상부면 → 각 점) ──
	[
		[P.PTCL1, 'TCAL1'], [P.PTCL2, 'TCAL2'],
		[P.PTHL1, 'TTHL1'], [P.PTHL2, 'TTHL2'], [P.PTHL3, ttsLbl(P.PTHL3)],
		[P.PTHCL2, 'TTHCL2'], [P.PTHCL1, 'TTHCL1'], [P.PTHCL3, 'TTS'],
		[P.PTHCR2, 'TTHCR2'], [P.PTHCR1, 'TTHCR1'], [P.PTHCR3, 'TTS'],
		[P.PTHR1, 'TTHR1'], [P.PTHR2, 'TTHR2'], [P.PTHR3, ttsLbl(P.PTHR3)],
		[P.PTCR1, 'TCAR1'], [P.PTCR2, 'TCAR2']
	].forEach(function(d){ if (!d[0]) return; thk(d[0].x, ytopf(d[0].x), d[0].y, d[1]); });
	if (P.PTSC) thk(0, 0, P.PTSC.y, (Math.abs(-P.PTSC.y - ap.TTS) < 0.5) ? 'TTS' : '');	// 1 cell : 슬래브 중앙 두께 (TTS 초과시 값만)

	// ── 하부 두께 (하부면 → 각 점) ──
	[
		[P.PBHL1, 'TBHL1'], [P.PBHL2, 'TBHL2'], [P.PBHL3, 'TBS'],
		[P.PBHCL2, 'TBHCL2'], [P.PBHCL1, 'TBHCL1'], [P.PBHCL3, 'TBS'],
		[P.PBHCR2, 'TBHCR2'], [P.PBHCR1, 'TBHCR1'], [P.PBHCR3, 'TBS'],
		[P.PBHR1, 'TBHR1'], [P.PBHR2, 'TBHR2'], [P.PBHR3, 'TBS']
	].forEach(function(d){ if (!d[0]) return; thk(d[0].x, d[0].y, ybotf(d[0].x), d[1]); });
	if (P.PBSC) thk(0, P.PBSC.y, ybotf(0), 'TBS');	// 1 cell : 하부슬래브 중앙 두께

	// ── 복부 두께 : 경사복부는 내측선 중앙점에서 외측선으로의 수선 → 측정값이 정확히 TWEBL/TWEBR ──
	function webDim(O1, O2, I1, I2, label){
		var dx = O2.x - O1.x, dy = O2.y - O1.y, dl = Math.hypot(dx, dy) || 1;
		var nx = -dy / dl, ny = dx / dl;					// 외측선의 단위 법선
		var pm = { x: (I1.x + I2.x) / 2, y: (I1.y + I2.y) / 2 };	// 내측선 중앙점
		var dist = (pm.x - O1.x) * nx + (pm.y - O1.y) * ny;	// 수직 거리 = 복부 두께
		var q = { x: pm.x - nx * dist, y: pm.y - ny * dist };	// 외측선 위 수선의 발
		rec.addDimLinear(0, q.x, q.y, pm.x, pm.y, 0, label);
	}
	webDim(P.PTCL1, P.PBEL, P.PTHL1, P.PBHL1, 'TWEBL');
	webDim(P.PTCR1, P.PBER, P.PTHR1, P.PBHR1, 'TWEBR');
	if (two){
		var ymC = (P.PTHCL1.y + P.PBHCL1.y) / 2;
		rec.addDimLinear(0, -ap.TWEBC/2, ymC, ap.TWEBC/2, ymC, 0, 'TWEBC');
	}

	// ── 필렛 반경 (geo 의 arcs 순서 = R_WTL, R_WTR, R_WBL, R_WBR, R_WTIL, R_WTIR 중 0 이 아닌 것) ──
	var frad = [
		['R_WTL', ap.R_WTL], ['R_WTR', ap.R_WTR], ['R_WBL', ap.R_WBL],
		['R_WBR', ap.R_WBR], ['R_WTIL', ap.R_WTIL], ['R_WTIR', ap.R_WTIR]
	].filter(function(d){ return d[1] !== 0; });
	o.arcs.forEach(function(a, i){
		if (i >= frad.length) return;
		var a2 = a.ange; if (a2 <= a.angb) a2 += 360;
		// 라벨이 두께 치수와 겹치지 않도록 배치.
		// 외측 필렛 : geo_fillet 중심이 단면 바깥이므로 중심 너머(lt<0)로 연장 → 바깥 빈 공간
		// 내측 필렛(R_WTIL/R_WTIR) : 셀 내부의 넓은 빈 공간에 수평 라벨 + 지시선(lx/ly)
		var inner = (frad[i][0] === 'R_WTIL' || frad[i][0] === 'R_WTIR');
		var bottom = (frad[i][0] === 'R_WBL' || frad[i][0] === 'R_WBR');
		if (inner){
			var toCell = (frad[i][0] === 'R_WTIL') ? 1 : -1;		// 셀 안쪽 방향
			rec.addDimRadius(0, a.x, a.y, a.r, (a.angb + a2) / 2, frad[i][0] + '=',
				{ lx: a.x + toCell * S * 0.0675, ly: a.y - S * 0.027 });
		}else{
			// 하부 외측(R_WBL/R_WBR)은 지시선을 두 배 길게 빼서 라벨을 여유 공간에
			rec.addDimRadius(0, a.x, a.y, a.r, (a.angb + a2) / 2, frad[i][0] + '=', { lt: bottom ? -5.0 : -2.5 });
		}
	});

	// ── 슬로프 표기 (파랑 텍스트) ──
	// 슬로프 표기 : 변수 텍스트 아래에 라벨 전체를 감싸는 길이의 화살표 선
	// (SLL/SLR 는 상부 치수 위트니스가 밀집한 곳을 피해 각 셀 중앙(슬래브 하면 아래)에 표기)
	function slopeNote(x, y, label){
		var L = (label.length + 1.5) * S * 0.008;		// 라벨 글자수 기준 화살표 길이
		rec.addText(0, x, y, label);
		rec.addArrowLine(0, x - L/2, y - S*0.016, x + L/2, y - S*0.016);
	}
	var xcl = (P.PTHL3.x + (two ? P.PTHCL3.x : 0)) / 2;		// 1 cell : 중앙점(0) 기준
	slopeNote(xcl, ytopf(xcl) - ap.TTS - S*0.022, 'SLL=' + ap.SLL + '%');
	var xcr = ((two ? P.PTHCR3.x : 0) + P.PTHR3.x) / 2;
	slopeNote(xcr, ytopf(xcr) - ap.TTS - S*0.022, 'SLR=' + ap.SLR + '%');
	slopeNote(0, ybot - S*0.10, 'SLB=' + ap.SLB + '%');

	// ── 렌더 + 줌/팬 ──
	var W = odiv.clientWidth || 900;
	var Hpx = Math.round(W * 9 / 16);		// 16:9 고정 비율

	odiv.style.position = 'relative';
	odiv.innerHTML = window.RWSVG.renderSVG(rec, W, Hpx) +
		'<button type="button" data-guide-regen title="Reset zoom/pan (double-click also works)" ' +
		'style="position:absolute;top:8px;right:8px;padding:3px 10px;font-size:10.5px;font-weight:700;letter-spacing:.06em;transition:background .12s,border-color .12s,box-shadow .12s,transform .06s;' +
		'color:#fff;background:#2563eb;border:1px solid #2563eb;border-radius:6px;cursor:pointer;">&#8635; REGEN</button>';
	var svg = odiv.querySelector('svg');
	if (svg) window.RWSVG.attachZoomPan(svg);
	var oregen = function(){ pscDrawGuide(sdivid, ap, GEO); };	// 재렌더 = 뷰 초기화
	var obtn = odiv.querySelector('[data-guide-regen]');
	if (obtn) {
		obtn.onclick = oregen;
		// 인라인 스타일 버튼이라 CSS :hover/:active 대신 JS로 클릭감 부여
		obtn.onmouseenter = function(){ obtn.style.background = '#1d4ed8'; obtn.style.borderColor = '#1d4ed8'; obtn.style.boxShadow = '0 2px 8px rgba(37,99,235,.35)'; };
		obtn.onmouseleave = function(){ obtn.style.background = '#2563eb'; obtn.style.borderColor = '#2563eb'; obtn.style.boxShadow = 'none'; obtn.style.transform = 'none'; };
		obtn.onmousedown  = function(){ obtn.style.transform = 'translateY(1px) scale(.96)'; obtn.style.boxShadow = 'none'; };
		obtn.onmouseup    = function(){ obtn.style.transform = 'none'; };
	}
	if (svg) svg.addEventListener('dblclick', oregen);

	// 우측 변수표 높이를 가이드 그림과 동일하게 동기화 (스크롤 표)
	var otbl = document.getElementById('box12cell_vartable');
	if (otbl && svg) {
		var dh = svg.getBoundingClientRect().height || Hpx;
		if (dh > 100) otbl.style.height = Math.round(dh) + 'px';
	}
};
})();
