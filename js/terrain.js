/* 真实地形三维：现状 / 方案实施后。数据见 data/geo.js（高程、卫星影像、OpenStreetMap 地物）与 data/plan.js（方案要素） */
(function () {
  var WT = window.WT = window.WT || {};

  function decode(T) {
    var bin = atob(T.heights), n = bin.length / 2, out = new Float32Array(n);
    for (var i = 0; i < n; i++) out[i] = T.hmin + (bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) / 10;
    return out;
  }

  var MAJOR_TEMPLES = ['塔院寺', '显通寺', '菩萨顶', '黛螺顶', '殊像寺', '五爷庙', '罗睺寺', '碧山寺', '广宗寺', '圆照寺', '南山寺', '镇海寺', '集福寺', '普寿寺'];
  var SOUND = { '塔院寺': '晨钟', '显通寺': '早课', '菩萨顶': '佛乐', '黛螺顶': '山风', '殊像寺': '诵经' };
  var CRAFT_VILLAGES = ['杨柏峪村', '台怀村', '东庄村', '新房村', '杨林村', '光明寺村', '清凉社村', '车沟村', '黄土咀村', '日照寺村'];
  var PEAK_GLYPH = { '东台': '晨', '北台': '雪', '中台': '石', '西台': '月', '南台': '花' };

  WT.createTerrain = function (container, opt) {
    opt = opt || {};
    var THREE = window.THREE, G = window.WT_GEO, P = window.WT_PLAN;
    var area = opt.area || 'region', T = G[area];
    var EX = area === 'region' ? 1.6 : 1.0;
    var nx = T.nx, nz = T.nz, dx = T.width / (nx - 1), dz = T.depth / (nz - 1), BASE = T.hmin;
    var H0 = decode(T), H = Float32Array.from(H0);
    var small = Math.min(window.innerWidth, window.innerHeight) < 700;
    var isRegion = area === 'region';

    function hRaw(x, z) {
      var fi = Math.max(0, Math.min(nx - 1.001, (x - T.x0) / dx)), fj = Math.max(0, Math.min(nz - 1.001, (z - T.z0) / dz));
      var i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j, k = j * nx + i;
      return H[k] * (1 - u) * (1 - v) + H[k + 1] * u * (1 - v) + H[k + nx] * (1 - u) * v + H[k + nx + 1] * u * v;
    }
    function hAt(x, z) { return (hRaw(x, z) - BASE) * EX; }

    // ---------- 渲染器与场景 ----------
    var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(opt.shot ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isRegion; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    var labelsEl = document.createElement('div'); labelsEl.className = 'wt-labels'; container.appendChild(labelsEl);

    var scene = new THREE.Scene();
    var SKY_DAY = new THREE.Color(0xc4d5e1), SKY_NIGHT = new THREE.Color(0x0b1220);
    scene.background = SKY_DAY.clone();
    scene.fog = new THREE.Fog(SKY_DAY.clone(), isRegion ? 26000 : 4500, isRegion ? 60000 : 11000);
    var camera = new THREE.PerspectiveCamera(38, 1, isRegion ? 20 : 2, isRegion ? 120000 : 30000);
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = 1.45;
    controls.minDistance = isRegion ? 800 : 25; controls.maxDistance = isRegion ? 48000 : 9000;
    controls.screenSpacePanning = true;

    var hemi = new THREE.HemisphereLight(0xffffff, 0x56606a, 0.9); scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xfff1dc, 0.7); scene.add(sun); scene.add(sun.target);

    // ---------- 地形 ----------
    var geo = new THREE.PlaneGeometry(T.width, T.depth, nx - 1, nz - 1);
    geo.rotateX(-Math.PI / 2); geo.translate(T.x0 + T.width / 2, 0, T.z0 + T.depth / 2);
    var pos = geo.attributes.position;
    function applyHeights() {
      for (var k = 0; k < pos.count; k++) pos.setY(k, (H[k] - BASE) * EX);
      pos.needsUpdate = true; geo.computeVertexNormals();
    }
    applyHeights();
    var texKey = 'sat_' + area + '_' + (isRegion && !small ? 2048 : 1024);
    var texUrl = opt.texture || (window.WT_TEX && window.WT_TEX[texKey]) || ('img/' + texKey + '.jpg');
    var terrainMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(1.22, 1.22, 1.18) });
    var terrain = new THREE.Mesh(geo, terrainMat); terrain.receiveShadow = true; scene.add(terrain);
    var ready = new Promise(function (res) {
      new THREE.TextureLoader().load(texUrl, function (tx) {
        tx.anisotropy = renderer.capabilities.getMaxAnisotropy(); terrainMat.map = tx; terrainMat.needsUpdate = true; res();
      }, undefined, function () { res(); });
    });

    // ---------- 现状地物（OpenStreetMap） ----------
    var current = new THREE.Group(); scene.add(current);
    function inBox(p, m) { return p[0] > T.x0 + m && p[0] < T.x0 + T.width - m && p[1] > T.z0 + m && p[1] < T.z0 + T.depth - m; }
    function clipLines(lines) {
      var out = [];
      lines.forEach(function (l) { var cur = []; l.forEach(function (p) { if (inBox(p, 5)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } }); if (cur.length > 1) out.push(cur); });
      return out;
    }
    function addBuildings() {
      var P3 = [], C3 = [], wall = new THREE.Color(), roof = new THREE.Color();
      function tri(a, b, c, col) { P3.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); for (var i = 0; i < 3; i++) C3.push(col.r, col.g, col.b); }
      G.osm.buildings.forEach(function (b) {
        var pts = b.p, n = pts.length; if (n < 3 || !inBox(pts[0], 5)) return;
        var base = Infinity; pts.forEach(function (p) { base = Math.min(base, hAt(p[0], p[1])); }); base -= 0.4;
        var top = base + b.h * (isRegion ? 1.6 : 1);
        if (b.t) { wall.setHex(0xa65a40); roof.setHex(0x6e6150); } else { wall.setHex(0xd6d0c4); roof.setHex(0x5c656d); }
        for (var k = 0; k < n; k++) {
          var a = pts[k], c = pts[(k + 1) % n];
          tri([a[0], base, a[1]], [c[0], base, c[1]], [c[0], top, c[1]], wall);
          tri([a[0], base, a[1]], [c[0], top, c[1]], [a[0], top, a[1]], wall);
        }
        if (b.t && n === 4) {
          // 寺院殿宇：四角轮廓做成两坡屋顶，屋脊沿长边
          var e0 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), e1 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
          var q = e0 >= e1 ? [0, 1, 2, 3] : [1, 2, 3, 0], P = q.map(function (i) { return pts[i]; });
          var short = Math.min(e0, e1), rh = short * 0.32;
          var m03 = [(P[0][0] + P[3][0]) / 2, (P[0][1] + P[3][1]) / 2], m12 = [(P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2];
          var r0 = [m03[0], top + rh, m03[1]], r1 = [m12[0], top + rh, m12[1]];
          var A = [P[0][0], top, P[0][1]], B = [P[1][0], top, P[1][1]], Cc = [P[2][0], top, P[2][1]], Dd = [P[3][0], top, P[3][1]];
          tri(A, B, r1, roof); tri(A, r1, r0, roof); tri(Cc, Dd, r0, roof); tri(Cc, r0, r1, roof);
          tri(B, Cc, r1, roof); tri(Dd, A, r0, roof);
        } else {
          var contour = pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
          var faces = THREE.ShapeUtils.triangulateShape(contour, []);
          faces.forEach(function (f) { tri([pts[f[0]][0], top, pts[f[0]][1]], [pts[f[1]][0], top, pts[f[1]][1]], [pts[f[2]][0], top, pts[f[2]][1]], roof); });
        }
      });
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C3, 3));
      g.computeVertexNormals();
      var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      m.castShadow = true; m.receiveShadow = true; current.add(m);
    }
    function densify(line, step) {
      var out = [];
      for (var i = 0; i < line.length - 1; i++) {
        var a = line[i], b = line[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / step));
        for (var k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
      }
      out.push(line[line.length - 1]); return out;
    }
    function ribbon(lines, width, color, yOff, step, parent, opacity) {
      var P3 = [], I = [], base = 0;
      lines.forEach(function (line) {
        var pts = densify(line, step); if (pts.length < 2) return;
        for (var i = 0; i < pts.length; i++) {
          var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
          var tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz) || 1, nxv = -tz / L * width / 2, nzv = tx / L * width / 2;
          var y = hAt(pts[i][0], pts[i][1]) + yOff;
          P3.push(pts[i][0] + nxv, y, pts[i][1] + nzv, pts[i][0] - nxv, y, pts[i][1] - nzv);
          if (i > 0) { var q = base + (i - 1) * 2; I.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
        }
        base += pts.length * 2;
      });
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); g.setIndex(I); g.computeVertexNormals();
      var m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: opacity < 1, opacity: opacity || 1, depthWrite: !(opacity < 1), polygonOffset: true, polygonOffsetFactor: -2 }));
      (parent || current).add(m); return m;
    }
    function polyline(lines, color, yOff, step, opacity, parent) {
      var P3 = [];
      lines.forEach(function (line) {
        var pts = densify(line, step);
        for (var i = 0; i < pts.length - 1; i++) {
          P3.push(pts[i][0], hAt(pts[i][0], pts[i][1]) + yOff, pts[i][1], pts[i + 1][0], hAt(pts[i + 1][0], pts[i + 1][1]) + yOff, pts[i + 1][1]);
        }
      });
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3));
      var m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity }));
      (parent || current).add(m); return m;
    }
    addBuildings();
    var major = clipLines(G.osm.roads.filter(function (r) { return r.c === 2; }).map(function (r) { return r.p; }));
    var minor = clipLines(G.osm.roads.filter(function (r) { return r.c === 1; }).map(function (r) { return r.p; }));
    ribbon(major, isRegion ? 34 : 9, 0xf3e7c6, isRegion ? 4 : 0.35, isRegion ? 80 : 8);
    ribbon(minor, isRegion ? 18 : 5, 0xe8e0cf, isRegion ? 3 : 0.3, isRegion ? 80 : 8, current, 0.9);
    polyline(clipLines(G.osm.paths.map(function (p) { return p.p; })), 0xfff6e0, isRegion ? 5 : 0.6, isRegion ? 80 : 8, isRegion ? 0.5 : 0.75);
    polyline(clipLines(G.osm.water), 0x7fb6e0, isRegion ? 4 : 0.5, isRegion ? 80 : 8, 0.8);

    // 大白塔（塔院寺，原点；塔高约 56 米）
    (function () {
      var white = new THREE.MeshLambertMaterial({ color: 0xf6f3ec }), y0 = hAt(0, 0), s = isRegion ? 2.2 : 1;
      var g = new THREE.Group(); g.position.set(0, y0, 0); g.scale.setScalar(s); scene.add(g);
      var b = new THREE.Mesh(new THREE.BoxGeometry(22, 7, 22), white); b.position.y = 3.5; g.add(b);
      var pts = []; for (var i = 0; i <= 14; i++) { var t = i / 14; pts.push(new THREE.Vector2(10.5 * Math.sin(t * Math.PI * 0.62) + 2 * (1 - t), t * 20)); }
      var bell = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), white); bell.position.y = 7; g.add(bell);
      var neck = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 4, 16), white); neck.position.y = 28; g.add(neck);
      var sp = new THREE.Mesh(new THREE.ConeGeometry(2.6, 22, 16), new THREE.MeshLambertMaterial({ color: 0xc9a54e })); sp.position.y = 41; g.add(sp);
      [b, bell, neck, sp].forEach(function (m) { m.castShadow = true; });
    })();

    // ---------- 方案要素 ----------
    var proposal = new THREE.Group(); proposal.visible = false; scene.add(proposal);
    // 方案分组：g13 = 方案一、三共有（四合院），g2 = 方案二，g3 = 方案三，g23 = 方案二、三共有（五台与朝台径）
    var PG = { g13: new THREE.Group(), g2: new THREE.Group(), g3: new THREE.Group(), g23: new THREE.Group() };
    Object.keys(PG).forEach(function (k) { proposal.add(PG[k]); });
    var PLAN_OF = { g13: [1, 3], g2: [2], g3: [3], g23: [2, 3] };
    var GOLD = 0xd9b45a, ZHU = 0xcf5a40;
    var siteA = P.sites[0];
    var courtyard = null, lampsPts = null, lampData = null, beams = [], walkers = [], routeCurve = null;
    var pad = null, hall = null;

    function beam(x, z, r, hgt, parent) {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.6, hgt, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.set(x, hAt(x, z) + hgt / 2, z); (parent || proposal).add(m); beams.push(m); return m;
    }
    function pavilion(x, z, s, parent) {
      var g = new THREE.Group(); g.position.set(x, hAt(x, z), z); g.scale.setScalar(s); (parent || proposal).add(g);
      var base = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 1.2, 6), new THREE.MeshLambertMaterial({ color: 0x8d8678 })); base.position.y = 0.6; g.add(base);
      var body = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3.4, 6), new THREE.MeshLambertMaterial({ color: 0xe9e2d2 })); body.position.y = 2.9; g.add(body);
      var roof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 2.6, 6), new THREE.MeshLambertMaterial({ color: 0x3f474c })); roof.position.y = 5.9; g.add(roof);
      return g;
    }
    function branch(x, z, s, parent) {
      var c = WT.buildCourtyard(THREE, { plaza: false }); c.group.scale.setScalar(s); c.group.position.set(x, hAt(x, z) + 1, z); parent.add(c.group); return c;
    }
    function soundHall(x, y, z, parent) {
      var g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
      var stone = new THREE.MeshLambertMaterial({ color: 0xa79f8f }), grass = new THREE.MeshLambertMaterial({ color: 0x7f8f6c });
      [34, 29, 24, 19, 14].forEach(function (r, i) { var c = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.6, 1.8, 48), i % 2 ? stone : grass); c.position.y = 0.9 + i * 1.8; c.castShadow = true; c.receiveShadow = true; g.add(c); });
      var dome = new THREE.Mesh(new THREE.SphereGeometry(10, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xcfb072, emissive: 0x000000 }));
      dome.position.y = 9; dome.castShadow = true; g.add(dome); g.userData.dome = dome; return g;
    }
    function ring(x, z, r, color, width) {
      var pts = []; for (var i = 0; i <= 72; i++) { var a = i / 72 * Math.PI * 2; pts.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); }
      return ribbon([pts], width, color, isRegion ? 6 : 0.8, isRegion ? 60 : 4, proposal);
    }

    if (isRegion) {
      G.osm.peaks.forEach(function (p) { beam(p.p[0], p.p[1], 45, 1600, PG.g23); pavilion(p.p[0], p.p[1], 9, PG.g2); branch(p.p[0], p.p[1], 2.4, PG.g3); });
      beam(siteA.p[0], siteA.p[1], 55, 1800);
      var rp = P.route;
      routeCurve = new THREE.CatmullRomCurve3(rp.map(function (p) { return new THREE.Vector3(p[0], hAt(p[0], p[1]) + 14, p[1]); }));
      ribbon([rp], 46, ZHU, 10, 60, PG.g23);
      for (var w = 0; w < 18; w++) {
        var dot = new THREE.Mesh(new THREE.SphereGeometry(55, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
        dot.userData.t = w / 18; PG.g23.add(dot); walkers.push(dot);
      }
      G.osm.villages.forEach(function (v) {
        if (CRAFT_VILLAGES.indexOf(v.n) < 0) return;
        var m = new THREE.Mesh(new THREE.SphereGeometry(70, 14, 10), new THREE.MeshBasicMaterial({ color: GOLD }));
        m.position.set(v.p[0], hAt(v.p[0], v.p[1]) + 70, v.p[1]); PG.g23.add(m);
      });
    } else {
      // 场地平整：在候选A整理出一块台地
      var cx = siteA.p[0], cz = siteA.p[1];
      var padY = 0, cnt = 0;
      for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) {
        var x = T.x0 + i * dx, z = T.z0 + j * dz;
        if (Math.abs(x - cx) < 34 && z - cz > -30 && z - cz < 70) { padY += H0[j * nx + i]; cnt++; }
      }
      padY /= cnt;
      pad = { cx: cx, cz: cz, y: padY };
      courtyard = WT.buildCourtyard(THREE, { plaza: true, plazaColor: 0x8f8a80 });
      courtyard.group.position.set(cx, (padY - BASE) * EX + 0.05, cz);
      courtyard.group.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      PG.g13.add(courtyard.group);
      hall = soundHall(cx, (padY - BASE) * EX + 0.05, cz + 4, PG.g2);
      // 停车场（约60个车位，生态铺装）
      var park = new THREE.Mesh(new THREE.PlaneGeometry(44, 26), new THREE.MeshLambertMaterial({ color: 0x8e9a88 }));
      park.rotation.x = -Math.PI / 2; park.position.set(cx, (padY - BASE) * EX + 0.08, cz + 52); park.receiveShadow = true; proposal.add(park);
      for (var s = 0; s < 12; s++) {
        var line = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 9), new THREE.MeshBasicMaterial({ color: 0xf5f1e6 }));
        line.rotation.x = -Math.PI / 2; line.position.set(cx - 19 + s * 3.4, (padY - BASE) * EX + 0.1, cz + 45); proposal.add(line);
        var line2 = line.clone(); line2.position.z = cz + 59; proposal.add(line2);
      }
      // 连接主路的入口道路
      var best = null, bd = Infinity;
      major.forEach(function (l) { l.forEach(function (p) { var d = Math.hypot(p[0] - cx, p[1] - (cz + 66)); if (d < bd) { bd = d; best = p; } }); });
      if (best) ribbon([[[cx, cz + 64], [(cx + best[0]) / 2, (cz + 64 + best[1]) / 2], best]], 7, GOLD, 0.45, 4, proposal);
      (function () {
        var seed = 3; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
        var pm = [new THREE.MeshLambertMaterial({ color: 0x2f4a3b, flatShading: true }), new THREE.MeshLambertMaterial({ color: 0x3d5a46, flatShading: true })];
        var tm = new THREE.MeshLambertMaterial({ color: 0x5a4636 });
        var near = function (x, z) { return major.concat(minor).some(function (l) { return l.some(function (p) { return Math.hypot(p[0] - x, p[1] - z) < 14; }); }); };
        for (var k = 0; k < 260; k++) {
          var a = rnd() * 6.283, r = 50 + rnd() * 220, x = cx + Math.cos(a) * r, z = cz + 20 + Math.sin(a) * r;
          if (Math.abs(x - cx) < 40 && z > cz - 36 && z < cz + 78) continue;
          if (near(x, z)) continue;
          var s = 1.6 + rnd() * 1.4, y = hAt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); current.add(g);
          var tr = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 5), tm); tr.position.y = 0.8; g.add(tr);
          for (var q = 0; q < 3; q++) { var c = new THREE.Mesh(new THREE.ConeGeometry(1.9 - q * 0.45, 2.2, 7), pm[k % 2]); c.position.y = 1.9 + q * 1.15; c.castShadow = true; g.add(c); }
        }
      })();
      P.sites.forEach(function (st) { ring(st.p[0], st.p[1], st.rec ? 72 : 60, st.rec ? GOLD : 0x8fb3c9, st.rec ? 3.5 : 3); });
      beam(cx, cz, 6, 260);
      // 千灯（夜景）
      var N = 1000, gL = new THREE.BufferGeometry(), arr = new Float32Array(N * 3); lampData = [];
      for (var q = 0; q < N; q++) lampData.push({ a: Math.random() * 6.283, r: Math.sqrt(Math.random()) * 30, y: Math.random() * 160, v: 3 + Math.random() * 7 });
      gL.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      lampsPts = new THREE.Points(gL, new THREE.PointsMaterial({ color: 0xffc860, size: 1.6, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
      lampsPts.visible = false; proposal.add(lampsPts);
      sun.position.set(cx + 220, (padY - BASE) + 420, cz + 300); sun.target.position.set(cx, (padY - BASE), cz);
      var sc = sun.shadow.camera; sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160; sc.near = 10; sc.far = 1500;
      sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.castShadow = true;
    }
    if (isRegion) { sun.position.set(9000, 16000, 14000); sun.target.position.set(0, 0, 0); }

    function updateLamps(dt) {
      if (!lampsPts) return;
      var a = lampsPts.geometry.attributes.position.array, base = (pad.y - BASE) * EX + 10;
      for (var i = 0; i < lampData.length; i++) {
        var L = lampData[i]; L.y += L.v * dt; L.a += dt * 0.05; if (L.y > 170) L.y = 0;
        var sp = 1 + L.y / 60;
        a[i * 3] = pad.cx + Math.cos(L.a) * L.r * sp; a[i * 3 + 1] = base + L.y; a[i * 3 + 2] = pad.cz + Math.sin(L.a) * L.r * sp;
      }
      lampsPts.geometry.attributes.position.needsUpdate = true;
    }

    function setPad(on) {
      if (!pad) return;
      for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) {
        var k = j * nx + i, x = T.x0 + i * dx, z = T.z0 + j * dz;
        var ddx = Math.max(0, Math.abs(x - pad.cx) - 34), ddz = Math.max(0, (pad.cz - 30) - z, z - (pad.cz + 70));
        var d = Math.hypot(ddx, ddz);
        if (!on || d > 28) { H[k] = H0[k]; continue; }
        var t = d / 28; t = t * t * (3 - 2 * t);
        H[k] = pad.y + (H0[k] - pad.y) * t;
      }
      applyHeights();
    }

    // ---------- 标注 ----------
    var labels = [];
    function label(text, x, z, lift, cls, prop, data, pri, maxD, plans) {
      var el = document.createElement(data ? 'button' : 'div');
      if (data) el.type = 'button';
      el.className = 'wt-lbl ' + (cls || ''); el.innerHTML = text;
      if (data && opt.onSelect) el.addEventListener('click', function () { opt.onSelect(data); });
      labelsEl.appendChild(el);
      var L = { el: el, pos: new THREE.Vector3(x, hAt(x, z) + lift, z), prop: prop, plans: plans, pri: pri || 5, maxD: maxD || Infinity, w: 0, h: 0 };
      labels.push(L); labels.sort(function (a, b) { return b.pri - a.pri; }); return L;
    }
    if (isRegion) {
      G.osm.peaks.forEach(function (p) {
        var k = p.n.slice(0, 2);
        label(p.n + ' <small>' + p.ele + 'm</small>', p.p[0], p.p[1], 260, 'pk', false, null, 7);
        label('<i>' + PEAK_GLYPH[k] + '</i>' + k + '驿', p.p[0], p.p[1], 1750, 'prop', true, { kind: 'peak', name: k, glyph: PEAK_GLYPH[k] }, 8, null, [2]);
        label('<i>' + PEAK_GLYPH[k] + '</i>' + k + '分馆', p.p[0], p.p[1], 1750, 'prop', true, { kind: 'peak', name: k, glyph: PEAK_GLYPH[k] }, 8, null, [3]);
      });
      label('台怀镇', 0, 0, 380, 'town', false, null, 9);
      label('<i>心</i>四合院心馆', siteA.p[0], siteA.p[1], 1950, 'prop main', true, { kind: 'heart' }, 10, null, [1]);
      label('<i>心</i>千灯声殿心馆', siteA.p[0], siteA.p[1], 1950, 'prop main', true, { kind: 'heart' }, 10, null, [2]);
      label('<i>心</i>四合院主馆', siteA.p[0], siteA.p[1], 1950, 'prop main', true, { kind: 'heart' }, 10, null, [3]);
      label('朝台径 · 约' + Math.round(P.legs.reduce(function (a, l) { return a + l.km; }, 0)) + '公里', -8800, 3500, 260, 'route', true, null, 5, Infinity, [2, 3]);
      G.osm.villages.forEach(function (v) { if (CRAFT_VILLAGES.indexOf(v.n) >= 0 && ['光明寺村', '清凉社村', '日照寺村', '黄土咀村', '车沟村'].indexOf(v.n) >= 0) label('一村一艺 · ' + v.n, v.p[0], v.p[1], 220, 'craft', true, null, 5, Infinity, [2, 3]); });
      label('↓ 往五台山站（雄忻高铁）', P.station[0], P.station[1] - 600, 200, 'route', true);
    } else {
      var seen = {};
      G.osm.temples.forEach(function (t) {
        if (MAJOR_TEMPLES.indexOf(t.n) < 0 || seen[t.n]) return; seen[t.n] = 1;
        label(t.n, t.p[0], t.p[1], 26, 'temple', false, null, t.n === '塔院寺' || t.n === '显通寺' || t.n === '菩萨顶' ? 6 : 4, 2600);
        if (SOUND[t.n]) label('声音地图 · ' + SOUND[t.n], t.p[0], t.p[1], 60, 'sound', true, null, 3, 1500, [2, 3]);
      });
      G.osm.villages.forEach(function (v) {
        if (CRAFT_VILLAGES.indexOf(v.n) < 0) return;
        label(v.n, v.p[0], v.p[1], 20, 'village', false, null, 3, 3200);
        label('一村一艺工坊', v.p[0], v.p[1], 48, 'craft', true, null, 2, 1800, [2, 3]);
      });
      P.sites.forEach(function (st) {
        label((st.rec ? '<i>荐</i>' : '') + st.n, st.p[0], st.p[1], st.rec ? 110 : 70, 'site' + (st.rec ? ' rec' : ''), true, { kind: 'site', site: st }, st.rec ? 8 : 7);
      });
      label('<i>心</i>四合院心馆', siteA.p[0], siteA.p[1], 34, 'prop main', true, { kind: 'heart' }, 9, 1400, [1]);
      label('<i>心</i>千灯声殿心馆', siteA.p[0], siteA.p[1], 34, 'prop main', true, { kind: 'heart' }, 9, 1400, [2]);
      label('<i>心</i>四合院主馆', siteA.p[0], siteA.p[1], 34, 'prop main', true, { kind: 'heart' }, 9, 1400, [3]);
      label('生态停车 · 约60位', siteA.p[0] + 30, siteA.p[1] + 52, 8, 'small', true, null, 2, 500);
      label('大白塔 · 塔院寺', 0, 0, 72, 'town', false, null, 9);
    }

    // ---------- 相机预设 ----------
    var PRESETS = isRegion ? {
      overview: [[-1400, 900, -1800], [8200, 7400, 12200]],
      north: [[-2200, 1300, -5200], [-600, 5200, 9800]],
      west: [[-4500, 1400, -2000], [-17000, 7000, 6500]],
      heart: [[siteA.p[0], 500, siteA.p[1]], [siteA.p[0] + 3800, 3600, siteA.p[1] + 5200]]
    } : (function () {
      var cx = siteA.p[0], cz = siteA.p[1], y = pad ? (pad.y - BASE) : hAt(cx, cz);
      return {
        aerial: [[-200, 160, 300], [2300, 2300, 3900]],
        town: [[0, hAt(0, 0) + 20, 0], [620, hAt(0, 0) + 520, 820]],
        site: [[cx, y + 4, cz + 4], [cx + 135, y + 105, cz + 175]],
        eye: [[cx, y + 7, cz - 4], [cx + 14, y + 2.2, cz + 78]],
        top: [[cx, y, cz + 10], [cx + 1, y + 330, cz + 40]],
        compare: [[500, 120, 500], [1700, 2600, 5600]]
      };
    })();
    var fly = null;
    function goto(name, instant) {
      var p = PRESETS[name]; if (!p) return;
      var tgt = new THREE.Vector3().fromArray(p[0]), cam = new THREE.Vector3().fromArray(p[1]);
      if (instant) { controls.target.copy(tgt); camera.position.copy(cam); fly = null; }
      else fly = { tgt: tgt, pos: cam };
    }
    goto(opt.preset || (isRegion ? 'overview' : 'aerial'), true);
    controls.autoRotate = !opt.shot && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && opt.autoRotate !== false;
    controls.autoRotateSpeed = 0.3;

    // ---------- 状态 ----------
    var state = { proposal: false, night: false, labels: true, plan: opt.plan || 3 };
    function refreshPlan() {
      Object.keys(PG).forEach(function (k) { PG[k].visible = PLAN_OF[k].indexOf(state.plan) >= 0; });
      labels.forEach(function (l) { l.el.dataset.off = l.prop && (!state.proposal || (l.plans && l.plans.indexOf(state.plan) < 0)) ? '1' : ''; });
    }
    function setPlan(n) { state.plan = n; refreshPlan(); }
    function setProposal(on) {
      state.proposal = on; proposal.visible = on; setPad(on);
      refreshPlan();
      if (courtyard) courtyard.setNight(on && state.night);
      if (lampsPts) lampsPts.visible = on && state.night;
    }
    function setNight(on) {
      state.night = on;
      scene.background.copy(on ? SKY_NIGHT : SKY_DAY); scene.fog.color.copy(on ? SKY_NIGHT : SKY_DAY);
      hemi.intensity = on ? 0.42 : 0.9; hemi.color.set(on ? 0x8ea2c8 : 0xffffff); sun.intensity = on ? 0.18 : 0.7; sun.color.set(on ? 0x9fb4e0 : 0xfff1dc);
      if (on) terrainMat.color.setRGB(0.62, 0.7, 0.95); else terrainMat.color.setRGB(1.22, 1.22, 1.18);
      beams.forEach(function (b) { b.material.opacity = on ? 0.55 : 0.32; });
      if (courtyard) courtyard.setNight(on && state.proposal);
      if (lampsPts) lampsPts.visible = on && state.proposal;
      if (hall) hall.userData.dome.material.emissive.set(on ? 0xc89540 : 0x000000);
    }
    function setLabels(on) { state.labels = on; labelsEl.hidden = !on; }
    setProposal(!!opt.proposal); setNight(!!opt.night); setLabels(opt.labels !== false);

    function stopAuto() { controls.autoRotate = false; if (opt.onInteract) opt.onInteract(); }
    renderer.domElement.addEventListener('pointerdown', stopAuto);
    renderer.domElement.addEventListener('wheel', stopAuto, { passive: true });

    // ---------- 尺寸与循环 ----------
    function resize() {
      var w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 560 ? 50 : 38; camera.updateProjectionMatrix();
    }
    var ro = new ResizeObserver(resize); ro.observe(container); resize();
    var visible = true, io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }); io.observe(container);
    var v = new THREE.Vector3(), clock = new THREE.Clock(), raf = 0, frames = 0;
    function loop() {
      raf = requestAnimationFrame(loop);
      var dt = Math.min(clock.getDelta(), 0.05);
      if (!visible && !opt.shot) return;
      step(dt);
    }
    function step(dt) {
      if (!isRegion) beams.forEach(function (b) { b.visible = camera.position.distanceTo(b.position) > 420; });
      if (fly) { controls.target.lerp(fly.tgt, 0.07); camera.position.lerp(fly.pos, 0.07); if (camera.position.distanceTo(fly.pos) < (isRegion ? 20 : 0.5)) fly = null; }
      controls.update();
      if (state.proposal && routeCurve && !opt.shot) walkers.forEach(function (d) { d.userData.t = (d.userData.t + dt * 0.004) % 1; d.position.copy(routeCurve.getPointAt(d.userData.t)); });
      if (state.proposal && routeCurve && opt.shot && frames === 0) walkers.forEach(function (d) { d.position.copy(routeCurve.getPointAt(d.userData.t)); });
      if (state.proposal && state.night) updateLamps(opt.shot ? 0.9 : dt);
      renderer.render(scene, camera);
      frames++;
      var w = container.clientWidth, h = container.clientHeight;
      if (state.labels) {
        var placed = [];
        labels.forEach(function (l) {
          if (l.el.dataset.off) { l.el.hidden = true; return; }
          var dist = camera.position.distanceTo(l.pos);
          v.copy(l.pos).project(camera);
          var x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h, hide = v.z > 1 || dist > l.maxD || x < -20 || x > w + 20 || y < -10 || y > h + 10;
          if (!hide) {
            if (!l.w) { l.el.hidden = false; l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; }
            var box = [x - l.w / 2 - 2, y - l.h - 2, x + l.w / 2 + 2, y + 2];
            for (var q = 0; q < placed.length; q++) { var o = placed[q]; if (box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1]) { hide = true; break; } }
            if (!hide) placed.push(box);
          }
          l.el.hidden = hide;
          if (!hide) l.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%)';
        });
      }
    }
    if (!opt.manual) loop();

    return {
      ready: ready, goto: goto, setProposal: setProposal, setPlan: setPlan, setNight: setNight, setLabels: setLabels,
      presets: Object.keys(PRESETS), state: state, courtyard: courtyard,
      setAutoRotate: function (on) { controls.autoRotate = on; },
      // 逐帧控制（大屏与视频录制用）：手动设定相机后渲染一帧
      setView: function (pos, tgt) { fly = null; camera.position.set(pos[0], pos[1], pos[2]); controls.target.set(tgt[0], tgt[1], tgt[2]); },
      frame: function (dt) { controls.autoRotate = false; step(dt || 1 / 30); },
      presetData: PRESETS, height: hAt,
      dispose: function () {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); controls.dispose(); renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        if (labelsEl.parentNode) labelsEl.parentNode.removeChild(labelsEl);
      }
    };
  };
})();
