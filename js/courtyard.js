/* 心馆合院模型：一期“清凉之心”合院式非遗馆（单位：米，坐北朝南，-z 为北） */
(function () {
  var WT = window.WT = window.WT || {};

  WT.ZONES = [
    { id: 'gate', n: 1, hall: '门殿', name: '序厅「清凉之门」', area: 100, kind: '公共服务', time: 8,
      desc: '参观第一站。五座台顶的剪影与晨钟声开场，完成预约核验、导览领取和“朝台印谱”首章盖印。',
      items: ['五台全景序幕：五台山非遗分布导览', '智慧导览与语音讲解领取', '“朝台印谱”领取与首章盖印', '无障碍服务与寄存'], tags: ['数字沙盘', '智慧导览'] },
    { id: 'main', n: 2, hall: '正殿', name: '基本陈列「妙法传灯」', area: 420, kind: '核心展陈', time: 30,
      desc: '以“灯”为意象，四个单元串起五台山非遗全貌，是全馆体量最大的展厅。',
      items: ['圣山遗音：五台山佛乐、五台八大套', '礼俗人间：五台山骡马大会、朝台礼俗', '匠心妙艺：民间传统彩塑、澄泥砚、红灯笼', '康养智慧：素食、药草与康养'], tags: ['实物陈列', '口述影像'] },
    { id: 'digital', n: 3, hall: '东北耳房', name: '数字非遗厅', area: 80, kind: '数字体验', time: 10,
      desc: '馆内只做安静、轻量的数字体验，把看不完、带不走的内容交给线上平台。',
      items: ['“云上清凉”全山非遗声音地图', 'AR“扫码听佛乐”', '传承人影像库检索', '线上文创入口'], tags: ['AR', '数字地图'] },
    { id: 'music', n: 4, hall: '东配殿', name: '特展「梵音禅韵」', area: 170, kind: '专题特展', time: 15,
      desc: '国家级非遗五台山佛乐与五台八大套的专题展，兼作传承体验点。',
      items: ['沉浸式声场还原寺院早晚课', '分主题耳机聆听', '乐谱、法器、乐器实物', '传承人口述影像'], tags: ['沉浸声场', '国家级非遗'] },
    { id: 'study', n: 5, hall: '东南房', name: '研学教室', area: 90, kind: '教育研学', time: 0,
      desc: '面向中小学和高校的小班课堂，每课约45分钟，预约制。',
      items: ['“梵乐体验”课', '彩塑与澄泥砚手作课', '红灯笼制作课', '“非遗夜话”公益讲座'], tags: ['预约制', '非遗美育'] },
    { id: 'court', n: 6, hall: '庭院', name: '活态展演', area: 410, outdoor: true, kind: '室外展演', time: 10,
      desc: '合院中心的开放场地，定时展演，也是“五台山非遗周”的主会场。',
      items: ['佛乐、八大套定时展演', '五台赛戏片段', '节庆非遗市集', '社区非遗角'], tags: ['活态传承', '社区参与'] },
    { id: 'craft', n: 7, hall: '西配殿', name: '「法门秘技」技艺展与工坊', area: 170, kind: '技艺体验', time: 20,
      desc: '一半展览一半工坊，传承人在这里现场演示与授课。',
      items: ['季度轮换：彩塑、澄泥砚、红灯笼、剪纸', '传承人现场演示', '“每周一课”体验工坊', '观众作品临展墙'], tags: ['传承人驻馆', '可触摸'] },
    { id: 'shop', n: 8, hall: '西南房', name: '文创与素斋', area: 90, kind: '文创康养', time: 10,
      desc: '参观的最后一站，把体验变成可以带走的东西。',
      items: ['“五台非遗”文创', '朝台印谱集章兑换', '素斋茶点', '线上线下同款'], tags: ['复合营收'] },
    { id: 'archive', n: 9, hall: '西北耳房', name: '研究档案中心', area: 80, kind: '研究支撑', time: 0,
      desc: '全馆的“后台”，不作常设开放，研究阅览可预约。',
      items: ['传承人影像数据库与口述史', '藏品库房', '专题研究与学术交流', '预约制研究阅览'], tags: ['研究内核'] }
  ];

  WT.LAYOUT = {
    main: { x: 0, z: -16, w: 30, d: 14, rot: 0, h: 7, rh: 4.4, ex: [[6, 1.4, 3, -9, -2], [6, 1.4, 3, -2, -2, 1], [6, 1.4, 3, 5, -2], [6, 1.4, 3, 11, -2, 1], [24, 2.4, 0.4, 0, -6.2]] },
    music: { x: 15.5, z: 0, w: 17, d: 10, rot: -1, h: 5.6, rh: 3.3, ex: [[8, 0.5, 6, 0, 0], [1, 3, 1, -5, -2, 1], [1, 3, 1, 5, -2, 1]] },
    craft: { x: -15.5, z: 0, w: 17, d: 10, rot: 1, h: 5.6, rh: 3.3, ex: [[3, 1, 2, -5, 1, 1], [3, 1, 2, -1, 1, 1], [3, 1, 2, 3, 1, 1], [14, 2, 0.4, 0, -4.2]] },
    digital: { x: 21, z: -16, w: 8, d: 10, rot: 0, h: 4.6, rh: 2.6, ex: [[5, 2.6, 0.3, 0, -4]] },
    archive: { x: -21, z: -16, w: 8, d: 10, rot: 0, h: 4.6, rh: 2.6, ex: [[1.2, 2.6, 6, -2, 0, 1], [1.2, 2.6, 6, 1, 0, 1]] },
    gate: { x: 0, z: 15, w: 10, d: 10, rot: 0, h: 5.2, rh: 3.2, ex: [[6, 2.4, 0.3, 0, -3.6, 1]] },
    study: { x: 11, z: 15, w: 10, d: 9, rot: 2, h: 4.6, rh: 2.8, ex: [[2.4, 0.8, 1.4, -2.5, 0], [2.4, 0.8, 1.4, 1, 0], [2.4, 0.8, 1.4, -2.5, 2.4], [2.4, 0.8, 1.4, 1, 2.4]] },
    shop: { x: -11, z: 15, w: 10, d: 9, rot: 2, h: 4.6, rh: 2.8, ex: [[6, 1.1, 1, 0, -3, 1], [2, 1, 2, -2, 1], [2, 1, 2, 2, 1]] }
  };
  WT.ROUTE = [[0, 30], [0, 21], [0, 9], [0, -7], [9, -8.2], [19, -9.3], [12, -6], [9.4, -2], [9.4, 5], [10.5, 9.6], [4, 7], [0, 3], [-4, 2.5], [-9.4, -1], [-9.4, 5], [-10.5, 9.6], [-4, 10], [0, 9.5], [0, 21], [0, 30]];

  // 构建合院。返回 { group, zones:{id:{bodies,center,top,inner}}, pickables, roofs, setXray, highlight }
  WT.buildCourtyard = function (THREE, opt) {
    opt = opt || {};
    var group = new THREE.Group();
    function mat(c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9, metalness: 0 }, o || {})); }
    var M = {
      plaza: mat(opt.plazaColor || 0xc8c4ba), court: mat(0xd9d5cb), base: mat(0xb3ada0), roof: mat(0x4f585c, { roughness: 0.7 }), ridge: mat(0x3a4144),
      col: mat(0x7a3a2b), door: mat(0x3b2a22), lattice: mat(0x8c5b3b), trunk: mat(0x5a4636),
      pine: mat(0x2f4a3b, { flatShading: true }), vit: mat(0x2c6a6f, { roughness: 0.4 }), vit2: mat(0xb08a3e, { roughness: 0.5 }), stone: mat(0x9c978c),
      lamp: new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffb84a, emissiveIntensity: 0 })
    };
    function box(w, h, d, m, x, y, z, parent) {
      var g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      g.position.set(x, y, z); g.castShadow = true; g.receiveShadow = true; (parent || group).add(g); return g;
    }
    var pickables = [], zones = {}, roofs = [], lamps = [];
    if (opt.plaza !== false) {
      var plaza = new THREE.Mesh(new THREE.PlaneGeometry(60, 64), M.plaza);
      plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.03, 2); plaza.receiveShadow = true; group.add(plaza);
    }
    var court = new THREE.Mesh(new THREE.PlaneGeometry(21, 19.5), M.court);
    court.rotation.x = -Math.PI / 2; court.position.set(0, 0.06, 0.75); court.receiveShadow = true; group.add(court);
    court.userData.zone = 'court'; pickables.push(court);

    function hall(id, o) {
      var g = new THREE.Group(); g.position.set(o.x, 0, o.z); g.rotation.y = o.rot * Math.PI / 2; group.add(g);
      var w = o.w, d = o.d, h = o.h, rh = o.rh, baseH = 0.9;
      var info = { bodies: [], inner: new THREE.Group(), center: new THREE.Vector3(o.x, h / 2, o.z), top: baseH + h + rh + 1.2 };
      var b = box(w + 2.4, baseH, d + 2.6, M.base, 0, baseH / 2, 0.3, g);
      var wall = new THREE.MeshStandardMaterial({ color: 0xe9e5dc, roughness: 0.95, transparent: true, opacity: 1 });
      var body = box(w, h, d, wall, 0, baseH + h / 2, 0, g); info.bodies.push(body);
      var nCol = Math.max(4, Math.round(w / 3.4));
      for (var i = 0; i < nCol; i++) {
        var c = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, h, 10), M.col);
        c.position.set(-w / 2 + 0.4 + i * (w - 0.8) / (nCol - 1), baseH + h / 2, d / 2 + 1.0); c.castShadow = true; g.add(c);
      }
      box(Math.min(3, w * 0.22), h * 0.72, 0.2, M.door, 0, baseH + h * 0.36, d / 2 + 0.05, g);
      var nWin = Math.floor((w - 4) / 3.2);
      for (var k = 0; k < nWin; k++) {
        var wx = (k % 2 ? 1 : -1) * (2.8 + Math.floor(k / 2) * 3.2);
        if (Math.abs(wx) < w / 2 - 1) {
          box(2.2, h * 0.45, 0.15, M.lattice, wx, baseH + h * 0.55, d / 2 + 0.05, g);
          lamps.push(box(1.9, h * 0.36, 0.05, M.lamp, wx, baseH + h * 0.55, d / 2 + 0.14, g));
        }
      }
      // 屋顶：形状 x 轴绕 y 旋转 90° 后对应 -z，前檐写在 x 负方向
      var ov = 2.1, sh = new THREE.Shape();
      sh.moveTo(-(d / 2 + ov + 0.6), 0); sh.lineTo(d / 2 + ov, 0); sh.lineTo(-0.3, rh); sh.closePath();
      var roof = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: w + 2.6, bevelEnabled: false }), M.roof);
      roof.rotation.y = Math.PI / 2; roof.position.set(-(w + 2.6) / 2, baseH + h, 0); roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
      var ridge = box(w + 3.2, 0.5, 0.6, M.ridge, 0, baseH + h + rh, 0.3, g);
      var e1 = box(0.5, 1.3, 0.8, M.ridge, (w + 2.8) / 2, baseH + h + rh + 0.5, 0.3, g);
      var e2 = box(0.5, 1.3, 0.8, M.ridge, -(w + 2.8) / 2, baseH + h + rh + 0.5, 0.3, g);
      roofs.push(roof, ridge, e1, e2);
      info.inner.visible = false; g.add(info.inner);
      (o.ex || []).forEach(function (e) { box(e[0], e[1], e[2], e[5] ? M.vit2 : M.vit, e[3], baseH + e[1] / 2 + 0.02, e[4], info.inner); });
      [b, body, roof, ridge].forEach(function (m) { m.userData.zone = id; pickables.push(m); });
      zones[id] = info;
    }
    Object.keys(WT.LAYOUT).forEach(function (id) { hall(id, WT.LAYOUT[id]); });

    var stage = box(8, 0.6, 5, M.stone, 0, 0.3, 2.5); stage.userData.zone = 'court'; pickables.push(stage);
    zones.court = { bodies: [stage], center: new THREE.Vector3(0, 0, 1), top: 3.2 };
    function pine(x, z, s) {
      var t = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 1.6 * s, 6), M.trunk); t.position.set(x, 0.8 * s, z); t.castShadow = true; group.add(t);
      for (var i = 0; i < 3; i++) {
        var c = new THREE.Mesh(new THREE.ConeGeometry((1.9 - i * 0.45) * s, 2.2 * s, 7), M.pine); c.position.set(x, (1.9 + i * 1.15) * s, z); c.castShadow = true; group.add(c);
      }
    }
    pine(-6.5, -4.5, 1.15); pine(6.5, -4.5, 1.15);
    if (opt.trees) opt.trees.forEach(function (t) { pine(t[0], t[1], t[2]); });
    box(14, 3.6, 1, M.base, 0, 1.8, 27); box(15, 0.6, 1.6, M.roof, 0, 3.9, 27);
    box(1, 2.6, 12, M.base, -25.6, 1.3, -16); box(1, 2.6, 12, M.base, 25.6, 1.3, -16);
    box(5.2, 2.6, 0.8, M.base, 18.8, 1.3, 12); box(5.2, 2.6, 0.8, M.base, -18.8, 1.3, 12);

    var xray = false;
    function setXray(on) {
      xray = on;
      roofs.forEach(function (m) { m.visible = !on; });
      Object.keys(zones).forEach(function (id) {
        var z = zones[id]; if (z.inner) z.inner.visible = on;
        if (id !== 'court') z.bodies.forEach(function (b) { b.material.opacity = on ? 0.22 : 1; b.material.depthWrite = !on; });
      });
    }
    var HL = new THREE.Color(0x2c6a6f), NONE = new THREE.Color(0);
    function highlight(id) {
      Object.keys(zones).forEach(function (k) {
        zones[k].bodies.forEach(function (b) { b.material.emissive.copy(k === id ? HL : NONE); b.material.emissiveIntensity = k === id ? 0.55 : 0; });
      });
    }
    function setNight(on) { M.lamp.emissiveIntensity = on ? 1.6 : 0; }
    return { group: group, zones: zones, pickables: pickables, roofs: roofs, setXray: setXray, highlight: highlight, setNight: setNight };
  };
})();
