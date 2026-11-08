/*  pscbox.guide.js — 치수선 가이드 도면 (원본 draw_box12cell_guide 에서 그리기만).
 *  비밀 geo_box12cell 호출은 제거 — 서버(/config)가 계산한 기하(GEO)를 받아 그린다.
 *  RWSVG(bim_draw_test_core.js) 가 먼저 로드돼 있어야 한다.  pscDrawGuide(divId, ap, GEO).
 */
(function(){
window.pscDrawGuide = function(sdivid, ap, GEO){

	var odiv = document.getElementById(sdivid);
	if (!odiv) return;


	var o = GEO;   // 서버(/config 숨은 엔진)가 계산해 준 기하
	if (!o || !o.points || !o.points.length) return;   // geo 가 비면 그리지 않는다 (옛 그림 유지 · 크래시 방지)
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

// ============================================================================
//  개구부(OPENING) 그림 — 입력값/서버 기하로만 그린다 (엔진 비밀 없음).
//  구멍상세 pscDrawHoleDetail(divId, o, slope) · 단면내 위치 pscDrawDiaFace(divId, ap, GEO, o).
//  원본 bim_pscbox_diaphragm_test.js 의 _drawOpeningPreview / _drawDiaView 를 옮긴 것.
//  o = { on, shape, B, H, cttx, ctty, ctbx, ctby, X, Y }
// ============================================================================

// 실제로 접히는 양 (RECT 없음 · HEX 위만 · OCT 위·아래)
function _opCuts(o){
	var h = o.B/2, H = o.H;
	var lim = function(v,m){ return Math.max(0, Math.min(Number(v)||0, m)); };
	var top = (o.shape === 'RECT') ? {x:0,y:0} : {x:lim(o.cttx,h-1), y:lim(o.ctty,H-1)};
	var bot = (o.shape === 'OCT')  ? {x:lim(o.ctbx,h-1), y:lim(o.ctby,H-1)} : {x:0,y:0};
	if (top.y + bot.y > H-1){ var s=(H-1)/(top.y+bot.y); top.y*=s; bot.y*=s; }
	return {top:top, bot:bot};
}
// 개구부 윤곽 (원점 = 하단 중앙). 반시계 닫힌 폴리곤. slope(%) 로 상·하단면 경사.
function _opPoly(o, slope){
	var h = o.B/2, H = o.H, c = _opCuts(o);
	var pts = [[-h+c.bot.x,0],[h-c.bot.x,0],[h,c.bot.y],[h,H-c.top.y],
	           [h-c.top.x,H],[-h+c.top.x,H],[-h,H-c.top.y],[-h,c.bot.y]];
	pts = pts.filter(function(p,i){ var q=pts[(i+pts.length-1)%pts.length];
		return Math.abs(p[0]-q[0])>1e-9 || Math.abs(p[1]-q[1])>1e-9; });
	var k = (Number(slope)||0)/100;
	if (!k) return pts;
	return pts.map(function(p){ return [p[0], p[1]+p[0]*k]; });
}
// 단면 좌표계에 앉힌 개구부 (1 Cell 하나, 2 Cell ∓|X| 둘)
function _opAt(ap, o){
	if (!o.on || !(o.B>0) || !(o.H>0)) return [];
	var two = Number(ap.NCELL) === 2;
	var xs = two ? [-Math.abs(o.X), Math.abs(o.X)] : [o.X];
	var slb = Number(ap.SLB) || 0;
	return xs.map(function(x0){
		var slabTop = -Number(ap.TH) + Number(ap.TBS) + x0*slb/100;
		var y0 = slabTop + o.Y;
		return { o:o, x0:x0, y0:y0, slope:slb,
		         pts: _opPoly(o, slb).map(function(p){ return [p[0]+x0, p[1]+y0]; }) };
	});
}
// 셀(격벽면) 폴리곤 — 해치 범위
function _cellPolys(P, two){
	var pick = function(names){ var out=[]; for(var i=0;i<names.length;i++){ var p=P[names[i]]; if(p) out.push([p.x,p.y]); } return (out.length>=3)?out:null; };
	if (!two){
		return [pick(['PTSC','PTHR3','PTHR2','PTHR1','PBHR1','PBHR2','PBHR3','PBSC','PBHL3','PBHL2','PBHL1','PTHL1','PTHL2','PTHL3'])].filter(Boolean);
	}
	return [
		pick(['PTHL3','PTHCL3','PTHCL2','PTHCL1','PBHCL1','PBHCL2','PBHCL3','PBHL3','PBHL2','PBHL1','PTHL1','PTHL2']),
		pick(['PTHCR3','PTHR3','PTHR2','PTHR1','PBHR1','PBHR2','PBHR3','PBHCR3','PBHCR2','PBHCR1','PTHCR1','PTHCR2'])
	].filter(Boolean);
}
// 45° 해치선 y=x+c 가 폴리곤을 지나는 x 구간 (짝수 개 → 둘씩)
function _hatchCuts(poly, c){
	var out=[];
	for (var i=0;i<poly.length;i++){
		var a=poly[i], b=poly[(i+1)%poly.length];
		var fa=a[1]-a[0]-c, fb=b[1]-b[0]-c;
		if ((fa>0)===(fb>0)) continue;
		var t=fa/(fa-fb); out.push(a[0]+(b[0]-a[0])*t);
	}
	return out.sort(function(p,q){ return p-q; });
}

// 구멍상세 — 개구부 하나를 제 비율대로 (잘린 모서리 점선 + Cttx/Ctty/Ctbx/Ctby 이름)
window.pscDrawHoleDetail = function(divId, o, slope){
	var box = document.getElementById(divId);
	if (!box) return;
	if (!o || !o.on || !(o.B>0) || !(o.H>0)){ box.innerHTML = '<svg viewBox="0 0 100 100"></svg><div style="text-align:center;color:#94a3b8;font-size:12px;">&mdash;</div>'; return; }
	var h=o.B/2, H=o.H, c=_opCuts(o);
	var k=(Number(slope)||0)/100;
	var sh=function(x,y){ return [x, y+x*k]; };
	var SS=function(x,y){ var p=sh(x,y); return p[0].toFixed(0)+','+(-p[1]).toFixed(0); };
	var rc=[sh(-h,0),sh(h,0),sh(h,H),sh(-h,H)];
	var xs=rc.map(function(p){return p[0];}), ys=rc.map(function(p){return p[1];});
	var x1=Math.min.apply(null,xs), x2=Math.max.apply(null,xs);
	var y1=Math.min.apply(null,ys), y2=Math.max.apply(null,ys);
	var w=x2-x1, hh=y2-y1, span=Math.max(w,hh);
	var fs=span/10.5, sw=span/46;
	var padL=fs*0.5, padR=fs*3.1, padY=fs*1.4;
	var text=function(x,y,dx,dy,anchor,str){ var p=sh(x,y);
		return '<text x="'+(p[0]+dx).toFixed(0)+'" y="'+(-p[1]+dy).toFixed(0)+'" font-size="'+fs.toFixed(0)+'" fill="#64748b" text-anchor="'+anchor+'">'+str+'</text>'; };
	var mark=function(cut,top){
		if (!(cut.x>0) && !(cut.y>0)) return '';
		var ye=top?H:0, yi=top?H-cut.y:cut.y;
		var s='<polyline points="'+SS(h-cut.x,ye)+' '+SS(h,ye)+' '+SS(h,yi)+'" fill="none" stroke="#94a3b8" stroke-width="'+sw.toFixed(1)+'" stroke-dasharray="'+(sw*3).toFixed(1)+' '+(sw*2.2).toFixed(1)+'"/>';
		if (cut.x>0) s+=text(h-cut.x/2, ye, 0, top?-fs*0.35:fs*1.0, 'middle', top?'Cttx':'Ctbx');
		if (cut.y>0) s+=text(h, (ye+yi)/2, fs*0.3, fs*0.34, 'start', top?'Ctty':'Ctby');
		return s;
	};
	var d=_opPoly(o, slope).map(function(p){ return p[0].toFixed(0)+','+(-p[1]).toFixed(0); }).join(' ');
	box.innerHTML =
		'<svg viewBox="'+(x1-padL).toFixed(0)+' '+(-y2-padY).toFixed(0)+' '+(w+padL+padR).toFixed(0)+' '+(hh+2*padY).toFixed(0)+'" preserveAspectRatio="xMidYMid meet" style="max-width:100%;max-height:100%;width:auto;height:auto;flex:0 1 auto;min-height:0;display:block;">'+
		mark(c.top,true)+mark(c.bot,false)+
		'<polygon points="'+d+'" fill="#eff6ff" stroke="#2563eb" stroke-width="'+sw.toFixed(1)+'" stroke-linejoin="round"/>'+
		'</svg><div style="text-align:center;color:#64748b;font-size:12px;margin-top:4px;">'+Math.round(o.B)+' &times; '+Math.round(o.H)+'</div>';
};

// 단면내 위치 (Diaphragm face) — 외곽 + 셀 해치(개구부 뚫림) + 개구부 외곽(빨강) + B·H·X·Y
window.pscDrawDiaFace = function(divId, ap, GEO, o){
	var box = document.getElementById(divId);
	if (!box || typeof window.RWSVG === 'undefined') return;
	var P={}; (GEO.points||[]).forEach(function(p){ P[p.name]=p[p.name]; });
	if (!P.PTL || !P.PBC) return;
	var two = Number(ap.NCELL) === 2;
	var S = Math.max(P.PTR.x-P.PTL.x, P.PTC.y-P.PBC.y);
	var rec = new window.RWSVG.MockViewer();
	rec.addLayer('c','cyan','solid',1);
	rec.addLayer('f','cyan','faint',1);
	rec.addLayer('o','red','solid',1);
	rec.addLayer('h','gray','hidden',1);
	GEO.lines.forEach(function(l){ rec.addLine(0,l.x1,l.y1,l.x2,l.y2,'c'); });
	GEO.arcs.forEach(function(a){ rec.addArc(0,a.x,a.y,a.r,a.angb,a.ange,'c'); });
	var ops = _opAt(ap, o);
	var Sy = Math.max(1, P.PTC.y-P.PBC.y);
	var xlev = Math.max(P.PTL.y, P.PTC.y, P.PTR.y) + Sy*0.12;
	// 해치 — 셀 안이면서 개구부 밖인 구간만
	_cellPolys(P, two).forEach(function(poly){
		var cs=poly.map(function(p){return p[1]-p[0];});
		var cmin=Math.min.apply(null,cs)-1, cmax=Math.max.apply(null,cs)+1;
		for (var cc=cmin;cc<=cmax;cc+=S*0.030){
			var inn=_hatchCuts(poly,cc);
			for (var i=0;i+1<inn.length;i+=2){
				var spans=[[inn[i],inn[i+1]]];
				ops.forEach(function(op){
					var cut=_hatchCuts(op.pts,cc);
					for (var k=0;k+1<cut.length;k+=2){
						var next=[];
						spans.forEach(function(sp){
							if (cut[k+1]<=sp[0]||cut[k]>=sp[1]){ next.push(sp); return; }
							if (cut[k]>sp[0]) next.push([sp[0],cut[k]]);
							if (cut[k+1]<sp[1]) next.push([cut[k+1],sp[1]]);
						});
						spans=next;
					}
				});
				spans.forEach(function(sp){ if (sp[1]-sp[0]>S*0.004) rec.addLine(0,sp[0],sp[0]+cc,sp[1],sp[1]+cc,'f'); });
			}
		}
	});
	// 개구부 외곽 + 치수
	ops.forEach(function(op){
		var pts=op.pts;
		for (var k=0;k<pts.length;k++){ var a=pts[k],b=pts[(k+1)%pts.length]; rec.addLine(0,a[0],a[1],b[0],b[1],'o'); }
		var xs=pts.map(function(p){return p[0];}), ys=pts.map(function(p){return p[1];});
		var xmin=Math.min.apply(null,xs), xmax=Math.max.apply(null,xs);
		var ymin=Math.min.apply(null,ys);
		var faceAt=function(x,top){ var best=null;
			for (var k2=0;k2<pts.length;k2++){ var a2=pts[k2],b2=pts[(k2+1)%pts.length];
				if ((a2[0]-x)*(b2[0]-x)<=0 && Math.abs(b2[0]-a2[0])>1e-9){
					var y=a2[1]+(b2[1]-a2[1])*(x-a2[0])/(b2[0]-a2[0]);
					best=(best===null)?y:(top?Math.max(best,y):Math.min(best,y));
				}
			}
			return best;
		};
		var cx=op.x0, yT=faceAt(cx,true), yB=faceAt(cx,false);
		if (yT===null || yB===null) return;
		var slabTop=-Number(ap.TH)+Number(ap.TBS)+cx*(Number(ap.SLB)||0)/100;
		var Bo=Math.max(1,op.o.B), Ho=Math.max(1,op.o.H);
		rec.addLine(0,0,xlev+Sy*0.03,0,ymin-Ho*0.5,'h');            // 단면 중심선
		if (Math.abs(cx)>1) rec.addLine(0,cx,xlev+Sy*0.03,cx,ymin-Ho*0.5,'h');
		rec.addDimLinear(0,xmin,yT,xmax,yT,Ho*0.30,'B');
		rec.addDimLinear(0,cx,yB,cx,yT,-Bo*0.75,'H');
		rec.addDimLinear(0,Math.min(0,cx),xlev,Math.max(0,cx),xlev,0,'X',{la:(cx<0?-1:1)*18});
		rec.addDimLinear(0,cx,slabTop,cx,yB,Bo*0.75,'Y');
	});
	var W = Math.round(box.getBoundingClientRect().width) || box.clientWidth || 470;
	var H = Math.round(W*9/16);                 // 그림칸 16:9 고정
	box.innerHTML = window.RWSVG.renderSVG(rec, W, H);
};
})();
