"use strict";
// Data is provided by data.js.
const $ = (id) => document.getElementById(id),
  R = D.regions,
  Y = D.years;
const usage = ["전체", "비사업용", "사업용"],
  cars = ["합계", "승용차", "승합차", "화물차", "특수차"];
const idx = new Map(
  D.rows.map((r) => [[r[0], r[1], r[2], r[3]].join(":"), r[4]]),
);
function get(r, u, c, m, y) {
  let a = idx.get([r, u, c, m].join(":"));
  return a ? a[y - 2012] : null;
}
function n(v, d = 1) {
  return v == null || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("ko-KR", {
      maximumFractionDigits: d,
    });
}
function delta(a, b) {
  return a == null || b == null || b === 0 ? null : (a / b - 1) * 100;
}
function pct(v) {
  return v == null ? "—" : (v > 0 ? "+" : "") + n(v, 2) + "%";
}
function esc(x) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(x).replace(/[&<>"']/g, (character) => entities[character]);
}
function svgline(x1, y1, x2, y2, color = "#2d3d56", stroke = 1, dash = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color
    }" stroke-width="${stroke
    }" ${dash ? 'stroke-dasharray="' + dash + '"' : ""}/>`;
}
function text(x, y, s, anchor = "start", color) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor
    }" ${color ? 'fill="' + color + '"' : ""}>${esc(s)}</text>`;
}
function lineChart(id, values, metric) {
  let W = 660,
    H = 300,
    l = 56,
    r = 22,
    t = 21,
    b = 42,
    valid = values.filter((v) => v != null),
    lo = Math.min(...valid),
    hi = Math.max(...valid),
    pad = Math.max((hi - lo) * 0.16, hi * 0.03, 1),
    min = Math.max(0, lo - pad),
    max = hi + pad;
  let X = (i) => l + (i * (W - l - r)) / 13,
    YY = (v) => t + ((max - v) * (H - t - b)) / (max - min);
  let s = "";
  for (let j = 0; j < 5; j++) {
    let yy = t + (j * (H - t - b)) / 4;
    s +=
      svgline(l, yy, W - r, yy, "#30425d", 1, "3 5") +
      text(
        l - 8,
        yy + 4,
        n(max - (j * (max - min)) / 4, metric ? 0 : 1),
        "end",
      );
  }
  Y.forEach((y, i) => {
    if (i % 2 === 0 || i === 13) s += text(X(i), H - 17, y, "middle");
  });
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] == null || values[i] == null) continue;
    s += svgline(
      X(i - 1),
      YY(values[i - 1]),
      X(i),
      YY(values[i]),
      i === 13 ? "#f59e0b" : "#60a5fa",
      2.6,
      i === 13 ? "5 5" : "",
    );
  }
  values.forEach((v, i) => {
    if (v != null)
      s += `<circle cx="${X(i)}" cy="${YY(v)}" r="${i === 13 ? 5 : 3.5
        }" fill="${i === 13 ? "#f59e0b" : "#60a5fa"
        }"><title>${Y[i]}년: ${n(v, metric ? 0 : 2)}</title></circle>`;
  });
  s += svgline(
    X(12) + (X(13) - X(12)) / 2,
    t,
    X(12) + (X(13) - X(12)) / 2,
    H - b,
    "#f59e0b",
    1,
    "4 4",
  );
  $(id).innerHTML = s;
}
function barChart(
  id,
  items,
  {
    w = 500,
    h = 300,
    left = 85,
    maxBars = 10,
    unit = "",
    color = "#60a5fa",
  } = {},
) {
  let list = items.slice(0, maxBars),
    max = Math.max(...list.map((i) => i.value || 0), 1) * 1.1,
    area = w - left - 75,
    row = (h - 24) / Math.max(list.length, 1);
  let s = "";
  list.forEach((a, i) => {
    let cy = 14 + i * row,
      bw = Math.max(0, ((a.value || 0) / max) * area);
    s +=
      text(left - 10, cy + 12, a.label, "end") +
      `<rect x="${left}" y="${cy}" width="${bw}" height="${Math.min(
        19,
        row * 0.65,
      )}" rx="4" fill="${a.color || color}"/>` +
      text(
        left + bw + 7,
        cy + 12,
        a.value == null ? "—" : n(a.value, a.digits ?? 1) + unit,
      );
  });
  $(id).innerHTML = s;
}
function render() {
  let rid = +$("region").value,
    u = +$("usage").value,
    c = +$("vehicle").value,
    m = +$("metric").value,
    y = +$("year").value,
    unit = m ? "천 km" : "km/대",
    vals = Y.map((z) => get(rid, u, c, m, z)),
    cur = get(rid, u, c, m, y),
    last = get(rid, u, c, m, y - 1),
    base = get(rid, u, c, m, 2012);
  $("m1title").textContent = y + "년 주행거리";
  $("m1").textContent = n(cur, m ? 0 : 2);
  $("m1foot").textContent = unit;
  $("m2").textContent = n(last, m ? 0 : 2);
  $("m2foot").textContent = y - 1 + "년 · " + unit;
  $("m3").textContent = pct(delta(cur, last));
  $("m3foot").textContent =
    y === 2025 && !m
      ? "⚠ 산정 방식 변경 · 직접 비교 주의"
      : "전년 대비 단순 증감률";
  $("m4").textContent = pct(delta(cur, base));
  $("m4foot").textContent =
    "2012년 기준 · " + (y === 2025 && !m ? "방식 변경 주의" : "동일 지표");
  lineChart("trend", vals, m);
  let pre = get(rid, u, c, m, 2024),
    old = get(rid, u, c, m, 2012);
  $("trendNarrative").innerHTML =
    `<b>${esc(R[rid].label)} · ${usage[u]} · ${cars[c]}</b>의 ${m ? "연간" : "일평균"} 주행거리는 2012년 ${n(old, m ? 0 : 2)}에서 2024년 ${n(pre, m ? 0 : 2)} ${unit}로 변화했습니다. ${!m ? "2025년 수치는 산정 방식이 달라 별도 해석이 필요합니다." : "2025년 연간 지표는 원본에 제공되지 않습니다."}`;
  let cv = cars
    .slice(1)
    .map((label, i) => ({ label, value: get(rid, u, i + 1, m, y) }));
  barChart("bars", cv, { unit: m ? "" : "", maxBars: 4 });
  let sorted = cv
    .filter((z) => z.value != null)
    .sort((a, b) => b.value - a.value);
  $("vehicleNarrative").textContent = sorted.length
    ? `${y}년 ${R[rid].label}의 선택 조건에서 가장 긴 주행거리를 기록한 차종은 ${sorted[0].label}(${n(sorted[0].value, m ? 0 : 2)} ${unit})입니다.`
    : "선택 조건에 차종별 값이 없습니다.";
  let uv = usage.map((label, i) => ({ label, value: get(rid, i, c, 0, y) }));
  barChart("usageBars", uv, { h: 270, unit: "", maxBars: 3, color: "#2dd4bf" });
  let a = uv[1].value,
    b = uv[2].value;
  $("usageNarrative").textContent =
    a != null && b != null && a > 0
      ? `사업용 ${n(b, 2)} km/대, 비사업용 ${n(a, 2)} km/대이며, 사업용이 약 ${n(b / a, 2)}배입니다. 등록용도별 비교에는 일평균 주행거리만 사용했습니다.`
      : "등록용도별 비교에 필요한 수치가 없습니다.";
  let tbl = "";
  Y.forEach((z, i) => {
    let v = vals[i],
      d = i ? delta(v, vals[i - 1]) : null;
    tbl += `<tr><td>${z}${z === 2025 ? ' <span class="pill">방식 변경</span>' : ""}</td><td>${n(v, m ? 0 : 2)}</td><td class="${d == null ? "muted" : d >= 0 ? "positive" : "negative"
      }">${pct(d)}</td><td class="muted">${m && z === 2025 ? "승인통계 제외" : !m && z === 2025 ? "측정치" : "추정치"}</td></tr>`;
  });
  $("yearTable").innerHTML = tbl;
  let prov = R.filter((z) => z.level === "province")
    .map((z) => ({ id: z.id, label: z.name, value: get(z.id, u, c, m, y) }))
    .filter((z) => z.value != null)
    .sort((a, b) => b.value - a.value);
  barChart("regionBars", prov, {
    w: 560,
    h: 470,
    left: 115,
    maxBars: 12,
    color: "#818cf8",
  });
  $("regionTable").innerHTML =
    prov
      .map(
        (z, i) =>
          `<tr><td>${i + 1}</td><td>${esc(z.label)}</td><td>${n(z.value, m ? 0 : 2)}</td></tr>`,
      )
      .join("") || '<tr><td colspan="3">자료 없음</td></tr>';
  $("regionNarrative").textContent = prov.length
    ? `전체 ${prov.length}개 광역자치단체 중 1위는 ${prov[0].label}(${n(prov[0].value, m ? 0 : 2)} ${unit}), 최하위는 ${prov[prov.length - 1].label}(${n(prov[prov.length - 1].value, m ? 0 : 2)} ${unit})입니다. 순위는 선택한 연도·차종·용도에 따라 달라집니다.`
    : "선택 연도의 지역 비교 자료가 없습니다.";
  let d12 = delta(pre, old),
    rise = delta(cur, last);
  $("insights").innerHTML =
    `<p><b>① 장기 추세:</b> 2012년과 2024년의 선택 조건을 비교하면 ${d12 == null ? "비교 가능한 자료가 없습니다." : `변화율은 <span class="spark">${pct(d12)}</span>입니다.`}</p><p><b>② 최근 값:</b> ${y}년 측정·추정값은 <span class="spark">${n(cur, m ? 0 : 2)} ${unit}</span>입니다. ${y === 2025 && !m ? "2024년 대비 변화율을 실제 운행량 변화로 해석하면 안 됩니다." : ""}</p><p><b>③ 차종 격차:</b> ${sorted.length > 1 ? `${sorted[0].label}와 ${sorted[sorted.length - 1].label}의 차이는 ${n(sorted[0].value - sorted[sorted.length - 1].value, m ? 0 : 2)} ${unit}입니다.` : "차종별 비교 자료가 부족합니다."}</p><p><b>④ 지역 편차:</b> ${prov.length > 1 ? `최상위·최하위 광역지자체의 차이는 ${n(prov[0].value - prov[prov.length - 1].value, m ? 0 : 2)} ${unit}입니다.` : "지역 비교 자료가 없습니다."}</p><p class="muted">이 항목들은 현재 필터의 실제 수치로 자동 생성한 기술통계이며 인과관계나 통계적 유의성을 주장하지 않습니다.</p>`;
}
R.forEach((r) => {
  $("region").add(
    new Option((r.level === "district" ? "　" : "") + r.label, r.id),
  );
});
Y.forEach((y) => $("year").add(new Option(y + "년", y)));
$("region").value = "0";
$("year").value = "2025";
["region", "usage", "vehicle", "metric", "year"].forEach((id) =>
  $(id).addEventListener("change", render),
);
render();

(function () {
  "use strict";
  const source = FUEL_DATA,
    $ = (id) => document.getElementById(id);
  const fuels = ["휘발유", "경유", "LPG", "전기", "전기+휘발유", "수소"];
  const nu = (n, d = 1) =>
    n == null || !Number.isFinite(n)
      ? "—"
      : n.toLocaleString("ko-KR", {
        maximumFractionDigits: d,
      });
  const fuelSel = $("fuelYear");
  for (let y = 2012; y <= 2026; y++) fuelSel.add(new Option(y + "년", y));
  fuelSel.value = "2026";
  function stats(array) {
    let a = array.map((v) => v[3]);
    if (!a.length) return null;
    return {
      n: a.length,
      mean: a.reduce((x, y) => x + y, 0) / a.length,
      eff: a.length / a.reduce((s, x) => s + 1 / x, 0),
    };
  }
  function regionKey() {
    let r = R[+$("region").value];
    const mapping = {
      서울특별시: "서울",
      부산광역시: "부산",
      대구광역시: "대구",
      인천광역시: "인천",
      광주광역시: "광주",
      대전광역시: "대전",
      울산광역시: "울산",
      세종특별자치시: "세종",
      경기도: "경기",
      강원도: "강원",
      강원특별자치도: "강원",
      충청북도: "충북",
      충청남도: "충남",
      전라북도: "전북",
      전북특별자치도: "전북",
      전라남도: "전남",
      경상북도: "경북",
      경상남도: "경남",
      제주특별자치도: "제주",
      제주도: "제주",
    };
    return mapping[r.level === "district" ? r.parent : r.name] || null;
  }
  function price(f, y) {
    let dataset = source.prices[f]?.[String(Math.min(y, 2025))];
    if (!dataset) return null;
    let k = regionKey();
    if (k && dataset[k] != null) return dataset[k];
    if (R[+$("region").value].level !== "national") return null;
    let arr = Object.values(dataset).filter(Number.isFinite);
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  }
  function chart(items, kind) {
    let svg = $("fuelTrend"),
      W = 610,
      H = 310,
      l = 58,
      r = 18,
      t = 30,
      b = 45,
      ys = Array.from(
        {
          length: 15,
        },
        (_, i) => 2012 + i,
      ),
      a = ys.map((y) => ({
        year: y,
        st: stats(items.filter((v) => v[0] === y)),
      })),
      good = a.filter((v) => v.st);
    if (!good.length) {
      svg.innerHTML =
        '<text x="25" y="60">선택한 표본의 연비 자료가 없습니다.</text>';
      return;
    }
    let v = good.map((x) => x.st.mean),
      max = Math.max(...v) * 1.15,
      min = Math.max(0, Math.min(...v) * 0.8);
    if (max === min) max++;
    let X = (i) => l + (i * (W - l - r)) / 14,
      Y = (v) => t + ((max - v) * (H - t - b)) / (max - min);
    let out = "";
    for (let j = 0; j <= 4; j++) {
      let yy = t + (j * (H - t - b)) / 4;
      out += `<line x1="${l}" y1="${yy}" x2="${W - r}" y2="${yy}" stroke="#30425d" stroke-dasharray="3 5"/><text x="${l - 8}" y="${yy + 4}" text-anchor="end">${nu(max - (j * (max - min)) / 4, 1)}</text>`;
    }
    let last = null;
    for (let i = 0; i < a.length; i++) {
      let point = a[i];
      if (i % 2 === 0 || i === 14)
        out += `<text x="${X(i)}" y="${H - 15}" text-anchor="middle">${point.year}</text>`;
      if (!point.st) {
        last = null;
        continue;
      }
      if (last != null)
        out += `<line x1="${X(last)}" y1="${Y(a[last].st.mean)}" x2="${X(i)}" y2="${Y(point.st.mean)}" stroke="#60a5fa" stroke-width="2.5"/>`;
      out += `<circle cx="${X(i)}" cy="${Y(point.st.mean)}" r="4" fill="#60a5fa"><title>${point.year}년: ${nu(point.st.mean, 2)}, ${point.st.n}개 모델</title></circle>`;
      last = i;
    }
    svg.innerHTML = out;
  }
  function renderFuel() {
    let year = +fuelSel.value,
      car = $("fuelCar").value,
      fuel = $("fuelType").value,
      basis = $("fuelBasis").value;
    let filtered = source.cars.filter(
      (v) =>
        (basis === "year" ? v[0] === year : v[0] <= year) &&
        (car === "전체" || v[1] === car) &&
        (fuel === "전체" || v[2] === fuel),
    );
    let homogeneous = fuels.filter((f) => filtered.some((v) => v[2] === f));
    let st = homogeneous.length === 1 ? stats(filtered) : null,
      unit =
        homogeneous[0] === "전기"
          ? "km/kWh"
          : homogeneous[0] === "수소"
            ? "원자료 단위 확인 필요"
            : "km/L";
    $("fuelCount").textContent = nu(filtered.length, 0) + "개";
    $("fuelAvg").textContent = st ? nu(st.mean, 2) : "연료 선택 필요";
    $("fuelHarm").textContent =
      st && homogeneous[0] !== "전기+휘발유" && homogeneous[0] !== "수소"
        ? nu(st.eff, 2)
        : "—";
    $("fuelAvgUnit").textContent = st ? unit : "다른 연료 단위는 합산하지 않음";
    let rid = +$("region").value,
      usage = +$("usage").value,
      driveYear = Math.min(2025, year);
    let carMap = {
      전체: 0,
      승용차: 1,
      승합차: 2,
      화물차: 3,
    };
    let daily = get(rid, usage, carMap[car] ?? 0, 0, driveYear),
      dist = daily == null ? null : daily * 365;
    $("fuelDist").textContent = dist == null ? "—" : nu(dist, 0) + " km";
    $("fuelDistNote").textContent = driveYear + "년 일평균 × 365 (추정)";
    chart(
      source.cars.filter(
        (v) =>
          (car === "전체" || v[1] === car) &&
          v[2] === (fuel === "전체" ? "휘발유" : fuel),
      ),
      "",
    );
    $("fuelRows").innerHTML = fuels
      .filter((f) => fuel === "전체" || fuel === f)
      .map((f) => {
        let rows = filtered.filter((x) => x[2] === f),
          s = stats(rows);
        if (!s)
          return `<tr><td>${f}</td><td colspan="5">선택 연도의 표본 없음</td></tr>`;
        let usable = ["휘발유", "경유", "LPG"].includes(f),
          cc = usable && dist != null ? dist / s.eff : null,
          p = price(f, year),
          cost = cc != null && p != null ? cc * p : null,
          un =
            f === "전기"
              ? "km/kWh"
              : f === "수소"
                ? "표시값"
                : f === "전기+휘발유"
                  ? "혼합표시"
                  : "km/L";
        return `<tr><td>${f}</td><td>${nu(s.n, 0)}</td><td>${nu(s.mean, 2)} ${un}</td><td>${usable ? nu(s.eff, 2) : "—"}</td><td>${cc == null ? "—" : nu(cc, 0) + " L"}</td><td>${cost == null ? "—" : nu(cost, 0) + " 원"}</td></tr>`;
      })
      .join("");
  }
  ["fuelYear", "fuelCar", "fuelType", "fuelBasis", "region", "usage"].forEach(
    (id) => $(id).addEventListener("change", renderFuel),
  );
  renderFuel();
})();

(function () {
  "use strict";
  const fs = FUEL_DATA,
    fuels = ["휘발유", "경유", "LPG"];
  const regNames = {
    서울특별시: "서울",
    부산광역시: "부산",
    대구광역시: "대구",
    인천광역시: "인천",
    광주광역시: "광주",
    대전광역시: "대전",
    울산광역시: "울산",
    세종특별자치시: "세종",
    경기도: "경기",
    강원도: "강원",
    강원특별자치도: "강원",
    충청북도: "충북",
    충청남도: "충남",
    전라북도: "전북",
    전북특별자치도: "전북",
    전라남도: "전남",
    경상북도: "경북",
    경상남도: "경남",
    제주특별자치도: "제주",
    제주도: "제주",
  };
  const names = ["승용차", "승합차", "화물차"];
  const ffmt = (v, d = 1) =>
    v == null || !Number.isFinite(v)
      ? "—"
      : v.toLocaleString("ko-KR", {
        maximumFractionDigits: d,
      });
  for (let y = 2012; y <= 2026; y++)
    document
      .getElementById("fuseYear")
      .add(new Option(y === 2026 ? "2026년 (가정)" : [y, "년"].join(""), y));
  document.getElementById("fuseYear").value = "2025";
  const selected = R.filter(
    (r) => r.level === "national" || r.level === "province",
  );
  selected.forEach((r) =>
    document.getElementById("fuseRegion").add(new Option(r.name, r.id)),
  );
  function eff(y, c, f) {
    const values = fs.cars
      .filter((v) => v[0] <= y && v[1] === c && v[2] === f)
      .map((v) => v[3]);
    if (!values.length) return null;
    return {
      n: values.length,
      arithmetic: values.reduce((a, b) => a + b, 0) / values.length,
      harmonic: values.length / values.reduce((a, b) => a + 1 / b, 0),
    };
  }
  function fuelPrice(y, r, f) {
    const pr = fs.prices[f]?.[String(Math.min(y, 2025))];
    if (!pr) return null;
    if (r.level === "national") {
      let values = Object.values(pr).filter(Number.isFinite);
      return values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
    }
    return pr[regNames[r.name] || regNames[r.parent]] ?? null;
  }
  function calc(y, rr, c, f) {
    let use = Math.min(y, 2025),
      r = R.find((x) => x.id === rr),
      key = names.indexOf(c) + 1,
      d = get(rr, 0, key, 0, use),
      e = eff(y, c, f),
      p = fuelPrice(y, r, f);
    if (!(d > 0) || !e || !(p > 0))
      return {
        y,
        rr,
        d,
        e,
        p,
        dist: null,
        q: null,
        cost: null,
      };
    const dist = d * 365,
      q = dist / e.harmonic;
    return {
      y,
      rr,
      d,
      e,
      p,
      dist,
      q,
      cost: q * p,
    };
  }
  function render() {
    let y = +document.getElementById("fuseYear").value,
      rr = +document.getElementById("fuseRegion").value,
      c = document.getElementById("fuseCar").value,
      f = document.getElementById("fuseFuel").value,
      v = calc(y, rr, c, f);
    let set = (id, v) => (document.getElementById(id).textContent = v);
    set("fuseDaily", v.d == null ? "—" : ffmt(v.d, 2) + " km");
    set("fuseDistance", v.dist == null ? "—" : ffmt(v.dist, 0) + " km");
    set("fuseEfficiency", v.e ? ffmt(v.e.harmonic, 2) + " km/L" : "—");
    set(
      "fuseModels",
      v.e ? ffmt(v.e.n, 0) + "개 출시 모델 · km/L" : "표본 없음",
    );
    set("fusePrice", v.p == null ? "—" : ffmt(v.p, 1) + " 원");
    set("fuseCost", v.cost == null ? "—" : ffmt(Math.round(v.cost), 0) + " 원");
    let title = R.find((x) => x.id === rr).name,
      yearRef = Math.min(2025, y);
    let intro =
      v.cost == null
        ? "선택한 조건에 주행거리·표시연비·연료가격 중 누락된 값이 있어 연료비를 계산할 수 없습니다."
        : `<strong>${y}년 · ${title} · ${c} · ${f}</strong> 기준, 자동차검사 일평균 <b>${ffmt(v.d, 2)}km</b> × 365일 = <b>${ffmt(v.dist, 0)}km/년</b>. 해당 연도까지 출시된 ${ffmt(v.e.n, 0)}개 모델의 유효연비 <b>${ffmt(v.e.harmonic, 2)}km/L</b>를 적용하면 연료가 약 <b>${ffmt(v.q, 0)}L</b> 필요합니다. 지역 연평균 가격 <b>${ffmt(v.p, 1)}원/L</b>를 적용한 <strong>연간 예상 유류비는 ${ffmt(Math.round(v.cost), 0)}원/대</strong>입니다.`;
    document.getElementById("fuseInterpretation").innerHTML =
      intro +
      (y === 2026
        ? '<p class="hint">2026년 출시 차량을 포함한 연비만 2026년 기준이며, 주행거리와 연료가격은 2025년 대체값입니다.</p>'
        : "");
    let list = Array.from(
      {
        length: 15,
      },
      (_, i) => calc(2012 + i, rr, c, f),
    );
    let history = list
      .map(
        (a) =>
          `<tr style="${a.y === y ? "background:#233d55" : ""}"><td>${a.y}${a.y === 2026 ? "*" : ""}</td><td>${ffmt(a.d, 2)}</td><td>${a.e ? ffmt(a.e.n, 0) : "—"}</td><td>${a.e ? ffmt(a.e.harmonic, 2) : "—"}</td><td>${ffmt(a.p, 1)}</td><td>${ffmt(a.q, 0)}</td><td>${ffmt(a.cost, 0)}</td></tr>`,
      )
      .join("");
    document.getElementById("fuseHistory").innerHTML = history;
    let data = list.filter((x) => x.cost != null),
      svg = document.getElementById("fusePlot");
    if (data.length) {
      let mx = Math.max(...data.map((x) => x.cost)) * 1.16,
        W = 610,
        H = 290,
        L = 68,
        T = 23,
        B = 42,
        Ri = 14,
        X = (year) => L + ((year - 2012) * (W - L - Ri)) / 14,
        Y = (cost) => T + (1 - cost / mx) * (H - T - B),
        output = "";
      for (let i = 0; i < 5; i++) {
        let h = T + (i * (H - T - B)) / 4;
        output += `<line x1="${L}" y1="${h}" x2="${W - Ri}" y2="${h}" stroke="#354963" stroke-dasharray="4 4"/><text fill="#b4c5d9" font-size="11" x="${L - 6}" y="${h + 4}" text-anchor="end">${ffmt((mx * (1 - i / 4)) / 10000, 0)}만</text>`;
      }
      for (let year = 2012; year <= 2026; year += 2)
        output += `<text fill="#b4c5d9" font-size="11" x="${X(year)}" y="${H - 12}" text-anchor="middle">${year}</text>`;
      for (let i = 1; i < data.length; i++)
        output += `<line x1="${X(data[i - 1].y)}" y1="${Y(data[i - 1].cost)}" x2="${X(data[i].y)}" y2="${Y(data[i].cost)}" stroke="#76b9ff" stroke-width="2.5"/>`;
      for (let o of data)
        output += `<circle cx="${X(o.y)}" cy="${Y(o.cost)}" r="4" fill="#90d8fc"><title>${o.y}: ${ffmt(o.cost, 0)}원</title></circle>`;
      svg.innerHTML = output;
    } else
      svg.innerHTML =
        '<text x="30" y="60" fill="#c5d5e9">비교 가능한 연도별 값이 없습니다.</text>';
    let regionList = selected
      .filter((r) => r.level === "province")
      .map((r) => ({
        r,
        ...calc(y, r.id, c, f),
      }))
      .filter((x) => x.cost != null)
      .sort((a, b) => b.cost - a.cost);
    document.getElementById("fuseRegionRows").innerHTML = regionList
      .map(
        (x) =>
          `<tr><td>${x.r.name}</td><td>${ffmt(x.d, 2)}</td><td>${ffmt(x.dist, 0)}</td><td>${ffmt(x.e.harmonic, 2)}</td><td>${ffmt(x.p, 1)}</td><td>${ffmt(x.cost, 0)}</td><td>${v.cost != null ? ffmt((x.cost / v.cost - 1) * 100, 1) + "%" : "—"}</td></tr>`,
      )
      .join("");
  }
  ["fuseYear", "fuseRegion", "fuseCar", "fuseFuel"].forEach((id) =>
    document.getElementById(id).addEventListener("change", render),
  );
  render();
})();
