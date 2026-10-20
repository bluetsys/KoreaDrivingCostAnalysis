const fs = require("node:fs");
const { TextDecoder } = require("node:util");
const path = require("node:path");
const XLSX = require("xlsx");

const directory = process.cwd();
const outputPath = path.join(directory, "data.js");
const regions = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];
const regionMeta = [
  { id: 0, name: "전국", parent: "", level: 0, label: "전국" },
];
regions.forEach((name, index) =>
  regionMeta.push({
    id: index + 1,
    name,
    parent: "전국",
    level: 1,
    label: name,
  }),
);

function findFile(pattern, description) {
  const file = fs.readdirSync(directory).find((name) => pattern.test(name));
  if (!file) throw new Error(`${description} 파일을 찾을 수 없습니다.`);
  return path.join(directory, file);
}

function readCsv(filePath) {
  const buffer = fs.readFileSync(filePath);
  let content;
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    content = buffer.toString("utf16le");
  } else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.from(buffer.subarray(2));
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const byte = swapped[i];
      swapped[i] = swapped[i + 1];
      swapped[i + 1] = byte;
    }
    content = swapped.toString("utf16le");
  } else {
    content = new TextDecoder("euc-kr").decode(buffer);
  }
  return parseCsv(content.replace(/^\uFEFF/, ""));
}

function parseCsv(text) {
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) records.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) records.push(row);
  }
  return records;
}

function numberOrNull(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/,/g, "");
  if (!normalized || normalized === "-" || normalized === "..") return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function yearFrom(value) {
  const match = String(value ?? "").match(/20\d{2}|\d{2}/);
  if (!match) return null;
  const year = Number(match[0]);
  return year < 100 ? 2000 + year : year;
}

function normalizeRegion(value) {
  const name = String(value ?? "")
    .trim()
    .replace(/특별자치시|특별자치도|특별시|광역시|자치도|도$/g, "");
  const aliases = {
    강원: "강원",
    전라북: "전북",
    전라남: "전남",
    경상북: "경북",
    경상남: "경남",
  };
  return aliases[name] || name;
}

function makePriceObject(files) {
  const prices = {};

  for (const [fuel, filePath] of files) {
    const rows = readCsv(filePath);
    const header = rows[0] || [];
    const table = {};

    for (const row of rows.slice(1)) {
      const year = yearFrom(row[0]);
      if (!year) continue;

      table[String(year)] ||= {};

      for (let column = 1; column < header.length; column += 1) {
        const rawRegion = String(header[column] || "").trim();
        const region =
          rawRegion === "전남광주" ? "광주" : normalizeRegion(rawRegion);
        const value = numberOrNull(row[column]);

        if (regions.includes(region) && value != null) {
          table[String(year)][region] = value;
        }
      }
    }

    if (!Object.keys(table).length) {
      throw new Error(`${fuel} 가격 CSV에서 연도 데이터를 읽지 못했습니다.`);
    }

    prices[fuel] = table;
  }

  return prices;
}

function loadMileage() {
  const filePath = findFile(/^426_.*\.csv$/i, "자동차 주행거리");
  const rows = readCsv(filePath);
  const header = rows[0] || [];
  const yearColumns = header
    .map((value, index) => ({ index, year: yearFrom(value) }))
    .filter((item) => item.year >= 2012 && item.year <= 2025);
  const years = [...new Set(yearColumns.map((item) => item.year))].sort(
    (a, b) => a - b,
  );
  const usages = ["전체", "비사업용", "사업용"];
  const vehicles = ["합계", "승용차", "승합차", "화물차", "특수차"];
  const metricNames = ["1일 평균주행거리[㎞/대]", "자동차 주행거리[천㎞]"];
  const provinces = [
    "서울",
    "부산",
    "대구",
    "인천",
    "광주",
    "대전",
    "울산",
    "세종",
    "경기",
    "강원",
    "충북",
    "충남",
    "전북",
    "전남",
    "경북",
    "경남",
    "제주",
  ];
  const regionsData = [
    { id: 0, name: "전국", parent: "", level: "national", label: "전국" },
    ...provinces.map((name, index) => ({
      id: index + 1,
      name,
      parent: "전국",
      level: "province",
      label: name,
    })),
  ];
  const regionIds = new Map(
    regionsData.map((region) => [region.name, region.id]),
  );
  const usageIds = new Map(usages.map((name, index) => [name, index]));
  const vehicleIds = new Map(vehicles.map((name, index) => [name, index]));
  const metricIds = new Map([
    [metricNames[0], 0],
    [metricNames[1], 1],
  ]);
  const rowsOut = [];

  for (const row of rows.slice(1)) {
    const rawRegion = String(row[0] || "").trim();
    const regionName =
      rawRegion === "전국" ? "전국" : normalizeRegion(rawRegion);
    const regionId = regionIds.get(regionName);
    const usage = String(row[1] || "").trim();
    const vehicle = String(row[2] || "").trim();
    const rawMetric = String(row[3] || "").trim();
    const metric = rawMetric.includes("1일 평균주행거리")
      ? metricNames[0]
      : rawMetric.includes("자동차 주행거리")
        ? metricNames[1]
        : null;
    const usageId = usageIds.get(usage);
    const vehicleId = vehicleIds.get(vehicle);
    const metricId = metricIds.get(metric);

    if (
      regionId == null ||
      usageId == null ||
      vehicleId == null ||
      metricId == null
    )
      continue;

    const series = years.map((year) => {
      const column = yearColumns.find((item) => item.year === year)?.index;
      const value = column == null ? null : numberOrNull(row[column]);
      return metricId === 1 && value != null ? value / 1000 : value;
    });

    if (series.some((value) => value != null)) {
      rowsOut.push([regionId, usageId, vehicleId, metricId, series]);
    }
  }

  return {
    years,
    regions: regionsData,
    rows: rowsOut,
  };
}
function loadCars() {
  const filePath = findFile(/자동차표시연비.*\.xlsx$/i, "자동차 표시연비 XLSX");
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => /표시연비/.test(String(cell ?? ""))),
  );
  if (headerIndex < 0)
    throw new Error("표시연비 시트에서 열 제목을 찾지 못했습니다.");
  const headers = rows[headerIndex].map((cell) => String(cell ?? "").trim());
  const findColumn = (patterns) =>
    headers.findIndex((header) =>
      patterns.some((pattern) => pattern.test(header)),
    );
  const yearColumn = findColumn([/출시.*연도/, /연식/, /^연도$/]);
  const typeColumn = findColumn([/자동차 종류/, /차종/, /차량.*종류/]);
  const fuelColumn = findColumn([/연료/]);
  const economyColumn = findColumn([/^표시연비$/i]);
  if (
    [yearColumn, typeColumn, fuelColumn, economyColumn].some(
      (column) => column < 0,
    )
  ) {
    throw new Error(
      `표시연비 시트의 열을 식별하지 못했습니다. 감지한 열: ${headers.join(", ")}`,
    );
  }
  const fuelNames = {
    휘발유: "휘발유",
    가솔린: "휘발유",
    경유: "경유",
    디젤: "경유",
    LPG: "LPG",
    엘피지: "LPG",
    액화석유가스: "LPG",
    전기: "전기",
  };
  const typeNames = {
    승용: "승용차",
    승용차: "승용차",
    승합: "승합차",
    승합차: "승합차",
    화물: "화물차",
    화물차: "화물차",
  };
  return rows.slice(headerIndex + 1).flatMap((row) => {
    const year = yearFrom(row[yearColumn]);
    const fuelText = String(row[fuelColumn] ?? "").trim();
    const typeText = String(row[typeColumn] ?? "").trim();
    const fuel =
      fuelNames[fuelText] ||
      Object.keys(fuelNames).find((key) => fuelText.includes(key));
    const type =
      typeNames[typeText] ||
      (typeText.includes("승용")
        ? "승용차"
        : typeText.includes("승합")
          ? "승합차"
          : typeText.includes("화물")
            ? "화물차"
            : null);
    const economy = numberOrNull(row[economyColumn]);
    if (!year || !fuel || !type || economy == null) return [];
    return [[year, type, fuel, economy]];
  });
}

function main() {
  const gasoline = findFile(
    /주유소.*(보통휘발유|휘발유).*\.csv$/i,
    "휘발유 가격 CSV",
  );
  const diesel = findFile(
    /주유소.*(자동차용경유|경유).*\.csv$/i,
    "경유 가격 CSV",
  );
  const lpg = findFile(/자동차충전소.*LPG.*\.csv$/i, "LPG 가격 CSV");
  const data = loadMileage();
  const fuelData = {
    cars: loadCars(),
    prices: makePriceObject([
      ["휘발유", gasoline, false],
      ["경유", diesel, false],
      ["LPG", lpg, true],
    ]),
  };
  const output = `const D = ${JSON.stringify(data, null, 2)};\n\nconst FUEL_DATA = ${JSON.stringify(fuelData, null, 2)};\n`;
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(
    `완료: ${path.basename(outputPath)} (${data.rows.length.toLocaleString()}개 주행거리 행, ${fuelData.cars.length.toLocaleString()}개 연비 모델)`,
  );
}

try {
  main();
} catch (error) {
  console.error(`변환 실패: ${error.message}`);
  process.exitCode = 1;
}
