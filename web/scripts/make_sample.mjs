// Generates SAMPLE data files that follow the final data contract.
// Every file carries meta.sample = true so the app shows a "SAMPLE DATA" banner.
// The Python pipeline (packs/build_packs.py) later overwrites these files with model output
// in exactly the same shape and sets meta.sample = false.
// Usage: npm run sample
import fs from "node:fs";

const OUT = "public/data";
fs.mkdirSync(`${OUT}/packs`, { recursive: true });

// deterministic random numbers so the sample files do not change between runs
let seed = 20210401;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const between = (a, b) => a + (b - a) * rnd();
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const r0 = (x) => Math.round(x);

const meta = {
  sample: true,
  cropYear: "2021",
  seasons: { maha: "Maha 2020/21 (Oct-Mar)", yala: "Yala 2021 (Apr-Sep)" },
  dataAsOf: "sample",
  note: "Sample numbers for interface development. Not model output. Do not quote.",
};

// ---- crops (static table; values are placeholders until DoA / HARTI files are parsed) ----
const crops = [
  { id: "paddy", name: "Paddy", family: "rice", days: 105, water_mm: 1100, n: 105, p: 25, k: 35, nFix: 0, nRemovalPerT: 15, residueC: 1.6, cover: 0.85, ky: 1.1, refYield: 4.3, price: 55, cost: 150000, kcalPerKg: 2400, proteinPerKg: 48, perCapKg: 160, elasticity: -0.3, tBase: 10,
    stages: [["Seedling", 20, 1.05], ["Tillering", 30, 1.1], ["Panicle and flowering", 30, 1.2], ["Grain fill", 25, 0.9]],
    fert: [[0, "Basal: TSP and part of MOP"], [14, "Urea top-dressing 1"], [35, "Urea top-dressing 2 with MOP"], [55, "Urea top-dressing 3 (panicle initiation)"]] },
  { id: "maize", name: "Maize", family: "cereal", days: 110, water_mm: 500, n: 150, p: 45, k: 35, nFix: 0, nRemovalPerT: 16, residueC: 1.8, cover: 0.7, ky: 1.25, refYield: 3.8, price: 55, cost: 130000, kcalPerKg: 3600, proteinPerKg: 90, perCapKg: 20, elasticity: -0.5, tBase: 10,
    stages: [["Emergence", 20, 0.4], ["Vegetative", 35, 0.8], ["Tasselling and silking", 30, 1.2], ["Grain fill", 25, 0.6]],
    fert: [[0, "Basal: urea, TSP, MOP"], [28, "Urea top-dressing (knee high)"], [50, "Urea top-dressing (before tasselling)"]] },
  { id: "greengram", name: "Green gram", family: "legume", days: 70, water_mm: 300, n: 15, p: 30, k: 25, nFix: 45, nRemovalPerT: 35, residueC: 0.7, cover: 0.6, ky: 1.15, refYield: 1.1, price: 280, cost: 110000, kcalPerKg: 3400, proteinPerKg: 240, perCapKg: 1.5, elasticity: -0.6, tBase: 10,
    stages: [["Emergence", 15, 0.4], ["Vegetative", 20, 0.8], ["Flowering and pod set", 20, 1.05], ["Maturity", 15, 0.5]],
    fert: [[0, "Basal: small urea starter, TSP, MOP"], [21, "Check nodules; top-dress only if leaves are pale"]] },
  { id: "cowpea", name: "Cowpea", family: "legume", days: 75, water_mm: 320, n: 15, p: 30, k: 25, nFix: 45, nRemovalPerT: 35, residueC: 0.8, cover: 0.7, ky: 1.1, refYield: 1.0, price: 250, cost: 100000, kcalPerKg: 3400, proteinPerKg: 235, perCapKg: 1.0, elasticity: -0.6, tBase: 10,
    stages: [["Emergence", 15, 0.4], ["Vegetative", 22, 0.8], ["Flowering and pod set", 23, 1.05], ["Maturity", 15, 0.6]],
    fert: [[0, "Basal: small urea starter, TSP, MOP"], [21, "Check nodules; top-dress only if leaves are pale"]] },
  { id: "bigonion", name: "Big onion", family: "allium", days: 100, water_mm: 450, n: 90, p: 45, k: 60, nFix: 0, nRemovalPerT: 2.5, residueC: 0.3, cover: 0.35, ky: 1.1, refYield: 14, price: 110, cost: 600000, kcalPerKg: 400, proteinPerKg: 11, perCapKg: 11, elasticity: -0.4, tBase: 7,
    stages: [["Establishment", 20, 0.7], ["Leaf growth", 30, 0.9], ["Bulbing", 35, 1.05], ["Ripening", 15, 0.75]],
    fert: [[0, "Basal: TSP, MOP, organic manure"], [21, "Urea top-dressing 1"], [42, "Urea top-dressing 2 with MOP"]] },
  { id: "chilli", name: "Chilli", family: "solanaceae", days: 150, water_mm: 600, n: 110, p: 45, k: 60, nFix: 0, nRemovalPerT: 30, residueC: 0.6, cover: 0.55, ky: 1.1, refYield: 1.2, price: 550, cost: 420000, kcalPerKg: 3000, proteinPerKg: 120, perCapKg: 2.5, elasticity: -0.5, tBase: 10,
    stages: [["Establishment", 30, 0.6], ["Vegetative", 35, 0.85], ["Flowering and fruiting", 60, 1.05], ["Late picking", 25, 0.9]],
    fert: [[0, "Basal: TSP, MOP, organic manure"], [28, "Urea top-dressing 1"], [56, "Urea top-dressing 2 with MOP"], [84, "Urea top-dressing 3"]] },
].map((c) => ({ ...c, stages: c.stages.map(([name, days, kc]) => ({ name, days, kc })), fert: c.fert.map(([day, text]) => ({ day, text })) }));
const fallow = { id: "fallow", name: "Bare fallow", family: "none", days: 0 };

// ---- districts (zone decides the sample climate; areas and population are rough placeholders) ----
const D = [
  // id, zone, paddy area maha (000 ha), population (000)
  ["jaffna", "dry", 10, 620], ["kilinochchi", "dry", 22, 130], ["mannar", "dry", 20, 110], ["mullaitivu", "dry", 18, 100], ["vavuniya", "dry", 20, 190],
  ["galle", "wet", 14, 1120], ["hambantota", "dry", 30, 660], ["matara", "wet", 14, 860], ["ampara", "dry", 85, 740], ["anuradhapura", "dry", 110, 930],
  ["badulla", "intermediate", 20, 870], ["batticaloa", "dry", 65, 580], ["monaragala", "intermediate", 28, 500], ["polonnaruwa", "dry", 65, 440], ["colombo", "wet", 3, 2400],
  ["gampaha", "wet", 10, 2400], ["kalutara", "wet", 12, 1270], ["kegalle", "wet", 6, 880], ["kurunegala", "intermediate", 80, 1700], ["puttalam", "dry", 20, 830],
  ["ratnapura", "wet", 10, 1150], ["kandy", "intermediate", 12, 1450], ["matale", "intermediate", 18, 520], ["nuwara-eliya", "wet", 4, 760], ["trincomalee", "dry", 45, 430],
];
const geo = JSON.parse(fs.readFileSync("public/geo/districts.json", "utf8"));
const geoById = Object.fromEntries(geo.features.map((f) => [f.properties.id, f.properties]));

const RAIN = { // monthly rain (mm), Jan..Dec
  dry: [90, 50, 60, 130, 70, 15, 25, 35, 60, 220, 270, 210],
  intermediate: [110, 70, 110, 220, 140, 70, 60, 70, 110, 300, 290, 190],
  wet: [110, 100, 190, 300, 380, 280, 180, 170, 260, 400, 330, 180],
};
const ET0 = { dry: [115, 125, 155, 150, 160, 165, 170, 175, 165, 135, 110, 105], intermediate: [105, 115, 140, 135, 140, 140, 145, 150, 140, 120, 100, 95], wet: [100, 105, 125, 120, 115, 105, 110, 115, 110, 105, 95, 95] };
const TMAX = { dry: [29.5, 31, 33, 33.5, 33.5, 33.5, 33.5, 33.5, 33.5, 31.5, 30, 29], intermediate: [28, 30, 32, 32, 31.5, 31, 31, 31.5, 31.5, 30, 29, 28], wet: [30, 31, 31.5, 31.5, 30.5, 29.5, 29.5, 29.5, 29.5, 29.5, 29.5, 29.5] };
const SEAS = { maha: [9, 10, 11, 0, 1, 2], yala: [3, 4, 5, 6, 7, 8] };
const sum = (arr, idx) => idx.reduce((s, i) => s + arr[i], 0);

const districts = [];
const packs = {};
for (const [id, zone, paddyK, popK] of D) {
  const g = geoById[id];
  const wet = between(0.88, 1.12);
  const rain = RAIN[zone].map((v) => r0(v * wet * between(0.92, 1.08)));
  const et0 = ET0[zone].map((v) => r0(v * between(0.97, 1.03)));
  const tmax = TMAX[zone].map((v) => r1(v + between(-0.5, 0.5) - (id === "nuwara-eliya" ? 9 : id === "badulla" || id === "kandy" ? 3 : 0)));
  const seasonRain = { maha: sum(rain, SEAS.maha), yala: sum(rain, SEAS.yala) };
  const soil = { ph: r1(between(5.4, 7.2)), soc_pct: r2(between(0.8, 2.2)), texture: ["sandy clay loam", "clay loam", "sandy loam"][r0(between(0, 2))], awc_mm: r0(between(90, 150)), n_kg_ha: r0(between(35, 70)) };
  const slope_pct = zone === "dry" ? r1(between(1, 4)) : zone === "intermediate" ? r1(between(3, 10)) : r1(between(4, 14));
  const irrig = zone === "dry" ? between(0.55, 0.8) : between(0.3, 0.5); // share of paddy land under tanks
  // water a field can count on (mm per season): effective rain plus the water source
  const water = {};
  for (const s of ["maha", "yala"]) {
    const eff = seasonRain[s] * 0.7;
    water[s] = { rain: r0(eff), tank: r0(eff + (s === "maha" ? 550 : 380) * (zone === "dry" ? 1 : 0.8)), well: r0(eff + 260) };
  }
  const heatDays = zone === "dry" ? r0(between(18, 45)) : zone === "intermediate" ? r0(between(5, 18)) : r0(between(0, 6));
  const shiftDays = r0(between(4, 16));

  const perCrop = {};  // farmer pack: per crop, per season
  const nat = {};      // national file: per crop totals for the district
  for (const c of crops) {
    perCrop[c.id] = { price: r0(c.price * between(0.93, 1.07)), cost: r0(c.cost * between(0.92, 1.08) / 1000) * 1000 };
    let areaTot = 0, prodTot = 0;
    for (const s of ["maha", "yala"]) {
      const reasons = [];
      let suit = "pass";
      const need = c.water_mm;
      const bestWater = water[s].tank;
      if (water[s].rain < 0.7 * need) { suit = "warn"; reasons.push(`Rain alone gives about ${water[s].rain} mm of the ${need} mm the crop needs; it needs tank or well water in ${s === "maha" ? "Maha" : "Yala"}.`); }
      if (bestWater < 0.7 * need) { suit = "fail"; reasons.push(`Even with tank water the season supplies under 70 % of the ${need} mm requirement.`); }
      const tSeason = sum(tmax, SEAS[s]) / 6;
      if (c.id === "bigonion" && seasonRain[s] > 900) { suit = suit === "fail" ? "fail" : "warn"; reasons.push("Heavy seasonal rain raises bulb-rot risk; needs well-drained land."); }
      if (c.id !== "paddy" && c.id !== "chilli" && tSeason > 33.2) reasons.push(`Mean daily maximum near ${r1(tSeason)} °C; heat at flowering can cut pod or grain set.`);
      if (soil.ph < 5.6 && (c.family === "legume" || c.id === "bigonion")) { suit = suit === "fail" ? "fail" : "warn"; reasons.push(`Soil pH ${soil.ph} is on the acid side for this crop; check with a soil test.`); }
      if (!reasons.length) reasons.push("Temperature, season length, water supply and soil pH are all inside this crop's limits.");
      const med = c.refYield * between(0.85, 1.12) * (zone === "wet" && c.id !== "paddy" ? 0.85 : 1);
      perCrop[c.id][s] = { suit, reasons, yield: [r2(med * 0.78), r2(med), r2(med * 1.18)], water_mm: need };
      // national area actually planted (sample)
      let area;
      if (c.id === "paddy") area = paddyK * 1000 * (s === "maha" ? 1 : 0.55 + 0.2 * irrig) * between(0.92, 1.05);
      else {
        const base = { maize: 0.09, greengram: 0.015, cowpea: 0.012, bigonion: 0.004, chilli: 0.012 }[c.id];
        const zoneK = zone === "dry" ? 1.2 : zone === "intermediate" ? 0.9 : 0.25;
        const special = (c.id === "bigonion" && ["matale", "anuradhapura", "polonnaruwa"].includes(id)) ? 6 : (c.id === "maize" && ["monaragala", "anuradhapura", "ampara", "badulla"].includes(id)) ? 2.5 : 1;
        area = (paddyK * 1000 + 8000) * base * zoneK * special * (s === "maha" ? (c.id === "maize" ? 1.5 : 0.8) : (c.id === "maize" ? 0.3 : 1.2)) * between(0.8, 1.2);
      }
      areaTot += area; prodTot += area * med;
      perCrop[c.id][s].district_area_ha = r0(area);
      // share of that area already registered in the app this season, and what those farmers plan
      perCrop[c.id][s].planned_area_ha = r0(area * between(0.85, c.id === "bigonion" ? 1.6 : 1.2));
    }
    const y = prodTot / areaTot;
    nat[c.id] = {
      area_ha: r0(areaTot), yield: [r2(y * 0.85), r2(y), r2(y * 1.13)], production_t: r0(prodTot),
      // response coefficients used by the what-if sliders (per cent yield change)
      sens: { rainPerPct: r2(c.id === "paddy" ? 0.45 * (1 - irrig * 0.6) : between(0.5, 0.8)), tempPerC: r1(-between(3, 7)), fertPerPct: r2(c.family === "legume" ? 0.1 : between(0.35, 0.5)) },
    };
  }

  const years = Array.from({ length: 40 }, (_, i) => 1981 + i);
  const onset0 = between(278, 290);
  const pack = {
    meta, id, name: g.name, zone, lat: g.lat, lon: g.lon, soil, slope_pct, water,
    climate: {
      rain, et0, tmax, seasonRain, heatDays,
      onset: { years, doy: years.map((_, i) => r0(onset0 + (shiftDays * i) / 39 + between(-9, 9))), shiftDays },
      future: { period: "2040s vs 1995-2014", rainPct: { maha: r0(between(-4, 12)), yala: r0(between(-18, -3)) }, tempC: r1(between(0.9, 1.5)), source: "Open-Meteo Climate API (CMIP6 downscaled)" },
      seasonal: { rainOutlook: ["below normal", "near normal", "above normal"][r0(between(0, 2))], source: "Open-Meteo Seasonal Forecast API" },
    },
    crops: perCrop,
    typicalRotation: { maha: "paddy", yala: zone === "dry" && irrig < 0.68 ? "fallow" : "paddy" },
  };
  packs[id] = pack;
  fs.writeFileSync(`${OUT}/packs/${id}.json`, JSON.stringify(pack));

  districts.push({
    id, name: g.name, zone, lat: g.lat, lon: g.lon, population: popK * 1000,
    registered_pct: r0(between(4, 38)),
    climate: { rain_maha_mm: seasonRain.maha, rain_yala_mm: seasonRain.yala, rain_anom_pct: r0(between(-22, 14)), heat_days: heatDays, onset_shift_days: shiftDays, water_stress: r2(Math.min(1, Math.max(0, 1 - (seasonRain.yala * 0.7 + 380 * irrig) / 700))) },
    crops: nat,
  });
}

fs.writeFileSync(`${OUT}/crops.json`, JSON.stringify({ meta, crops, fallow }));
fs.writeFileSync(`${OUT}/national.json`, JSON.stringify({ meta, districts, kcalNeedPerDay: 2100, proteinNeedPerDay: 55 }));

// ---- 2021 backtest (sample) ----
const cropIds = crops.map((c) => c.id);
const totalsFor = (adopt) => {
  const a = adopt / 100;
  const perCrop = {};
  for (const c of crops) {
    const area = districts.reduce((s, d) => s + d.crops[c.id].area_ha, 0);
    const prod = districts.reduce((s, d) => s + d.crops[c.id].production_t, 0);
    // adoption moves Yala paddy and bare fallow toward legumes and maize, and away from over-planted onion
    const shift = { paddy: -0.10, maize: 0.25, greengram: 1.6, cowpea: 1.3, bigonion: -0.12, chilli: 0.2 }[c.id] * a;
    const yieldGain = 0.06 * a;
    const production_t = prod * (1 + shift) * (1 + yieldGain);
    const priceChangePct = ((production_t / prod - 1) * 100) / c.elasticity;
    perCrop[c.id] = { area_ha: r0(area * (1 + shift)), production_t: r0(production_t), priceChangePct: r1(Math.max(-40, Math.min(40, priceChangePct))) };
  }
  const income = crops.reduce((s, c) => s + perCrop[c.id].production_t * 1000 * c.price * (1 + perCrop[c.id].priceChangePct / 100) - perCrop[c.id].area_ha * c.cost, 0);
  const water = crops.reduce((s, c) => s + perCrop[c.id].area_ha * c.water_mm * 10, 0); // m3
  const fertN = crops.reduce((s, c) => s + perCrop[c.id].area_ha * c.n, 0) / 1000 * (1 - 0.08 * a);
  return { adoptionPct: adopt, perCrop, income_lkr_bn: r1(income / 1e9), water_mcm: r0(water / 1e6), fertN_t: r0(fertN), bareFallow_ha: r0(180000 * (1 - 0.7 * a)) };
};
const backtest = {
  meta,
  method: [
    "Yield model trained on seasons up to Yala 2020 only.",
    "2021 yields predicted from the actual 2021 weather and compared with DCS statistics.",
    "Without the app: actual 2021 areas, yields and prices.",
    "With the app: recommendations made from pre-2021 information; 10, 30 or 50 % of area follows them; evaluated under the actual 2021 weather with the price response switched on.",
  ],
  caveats: [
    "The 'with app' side is a simulation, not an observation. Its trust level is the model error shown here.",
    "The chemical-fertilizer import ban began in May 2021, so Yala 2021 is an abnormal season. Maha 2020/21 is the clean test.",
  ],
  modelError: {
    maha: { rmse: 0.41, r2: 0.62, baselineRmse: 0.55, n: 25 },
    yala: { rmse: 0.78, r2: 0.31, baselineRmse: 0.83, n: 23 },
  },
  predVsActual: districts.flatMap((d) => ["maha", "yala"].map((s) => {
    const actual = d.crops.paddy.yield[1] * (s === "yala" ? 0.86 : 1) * between(0.9, 1.1);
    return { id: d.id, name: d.name, season: s, actual: r2(actual), predicted: r2(actual * between(0.86, 1.14) * (s === "yala" ? 1.1 : 1)) };
  })),
  scenarios: [0, 10, 30, 50].map(totalsFor),
  districts: Object.fromEntries(districts.map((d) => {
    const base = cropIds.reduce((s, c) => s + d.crops[c].production_t * 1000 * crops.find((x) => x.id === c).price - d.crops[c].area_ha * crops.find((x) => x.id === c).cost, 0) / 1e9;
    const gain = between(0.02, 0.16);
    return [d.id, { income_lkr_bn: [0, 10, 30, 50].map((a) => r2(base * (1 + gain * a / 50))), waterSavedPct: [0, 10, 30, 50].map((a) => r1(between(0.1, 0.22) * a)) }];
  })),
};
fs.writeFileSync(`${OUT}/backtest_2021.json`, JSON.stringify(backtest));

// ---- harvest outlook board (Sri Lanka from the national file; other countries are placeholders) ----
const lk = crops.map((c) => {
  const prod = districts.reduce((s, d) => s + d.crops[c.id].production_t, 0);
  const need = districts.reduce((s, d) => s + d.population, 0) * c.perCapKg / 1000;
  return { iso3: "LKA", country: "Sri Lanka", crop: c.id, season: "2021", production_t: r0(prod), balance_t: r0(prod - need), window: c.id === "paddy" ? "Feb-Apr, Aug-Sep" : "Jan-Mar, Jul-Sep", confidence: c.id === "paddy" ? "medium" : "low", sample: true, fromModel: true };
});
const others = [["IND", "India"], ["BGD", "Bangladesh"], ["PAK", "Pakistan"], ["THA", "Thailand"], ["VNM", "Vietnam"], ["MMR", "Myanmar"], ["KEN", "Kenya"], ["EGY", "Egypt"]].flatMap(([iso3, country]) =>
  crops.map((c) => {
    const prod = between(0.2, 6) * 1e6 * (c.id === "paddy" ? 8 : 1);
    return { iso3, country, crop: c.id, season: "2021", production_t: r0(prod), balance_t: r0(prod * between(-0.25, 0.3)), window: "placeholder", confidence: "placeholder", sample: true, fromModel: false };
  }));
fs.writeFileSync(`${OUT}/outlook.json`, JSON.stringify({ meta, rows: [...lk, ...others] }));

// ---- datasets & ablation summary (sample) ----
const ablation = [
  { set: "Yield history only", datasets: [], features: 5, model: "Ridge regression", cv_rmse: 0.514, cv_r2: 0.55, test_maha_rmse: 0.434, test_maha_r2: 0.62, test_yala_rmse: 0.781, test_yala_r2: 0.31 },
  { set: "+ NASA POWER climate & water balance", datasets: ["NASA POWER"], features: 17, model: "LightGBM", cv_rmse: 0.511, cv_r2: 0.56, test_maha_rmse: 0.462, test_maha_r2: 0.58, test_yala_rmse: 0.764, test_yala_r2: 0.34 },
  { set: "+ GPM IMERG rain", datasets: ["NASA POWER", "GPM IMERG"], features: 18, model: "LightGBM", cv_rmse: 0.508, cv_r2: 0.57, test_maha_rmse: 0.498, test_maha_r2: 0.52, test_yala_rmse: 0.742, test_yala_r2: 0.37 },
  { set: "+ MODIS NDVI (mid-season)", datasets: ["NASA POWER", "GPM IMERG", "MODIS NDVI"], features: 19, model: "LightGBM", cv_rmse: 0.496, cv_r2: 0.59, test_maha_rmse: 0.445, test_maha_r2: 0.60, test_yala_rmse: 0.718, test_yala_r2: 0.41 },
];
const datasets = {
  meta,
  chosenSet: "+ GPM IMERG rain",
  bestModel: "LightGBM",
  ablation,
  datasets: [
    { name: "NASA POWER", provider: "NASA", what: "Daily temperature, rain, humidity, wind, sunlight", resolution: "~50 km, daily, 1981-2021", inUse: true, usedFor: "Sample mode: placeholder values (real pipeline: yield model input, crop water balance, rain-onset trend, heat days)" },
    { name: "GPM IMERG (monthly, V07)", provider: "NASA", what: "Satellite rainfall", resolution: "0.1° (~10 km), monthly, 2001-2021", inUse: false, usedFor: "Sample mode: not downloaded yet (real pipeline: yield model comparison and 2021 rain anomaly)" },
    { name: "MODIS Terra NDVI (MOD13A3)", provider: "NASA", what: "Vegetation greenness", resolution: "1 km, monthly, 2001-2021", inUse: false, usedFor: "Sample mode: not downloaded yet (real pipeline: mid-season forecast and 2021 greenness anomaly)" },
    { name: "SMAP L4 root-zone soil moisture", provider: "NASA", what: "Soil water in the root zone", resolution: "9 km, 3-hourly, 2015-2021", inUse: false, usedFor: "Sample mode: not downloaded yet (real pipeline: 2021 soil-moisture anomaly)" },
    { name: "SRTM elevation (SRTMGL1)", provider: "NASA", what: "Elevation", resolution: "30 m", inUse: false, usedFor: "Sample mode: placeholder slope (real pipeline: district slope for erosion risk)" },
    { name: "MODIS land surface temperature, true colour", provider: "NASA", what: "Map pictures", resolution: "1 km, daily", inUse: true, usedFor: "Map picture layers only (NASA GIBS)" },
    { name: "SoilGrids 2.0", provider: "ISRIC", what: "Soil pH, organic carbon, nitrogen, texture", resolution: "250 m", inUse: false, usedFor: "Sample mode: placeholder soil values (real pipeline: pH warnings and starting soil N)" },
    { name: "Open-Meteo seasonal forecast and CMIP6 projections", provider: "ECMWF / CMIP6 via Open-Meteo", what: "Next 3 months' rain; 2040s rain and temperature change", resolution: "~25 km", inUse: true, usedFor: "Live 14-day forecast and town search in the browser; sample seasonal/2040s outlook" },
    { name: "DCS paddy statistics", provider: "Dept. of Census & Statistics", what: "Paddy yield and area by district and season", resolution: "district, 1979-2026", inUse: false, usedFor: "Sample mode: placeholder yields and areas (real pipeline: yield model target and 2021 test)" },
    { name: "DCS highland crop areas", provider: "Dept. of Census & Statistics", what: "Area of maize, green gram, cowpea, big onion, green chilli", resolution: "district, 2020-2021", inUse: false, usedFor: "Sample mode: placeholder areas (real pipeline: 2021 areas and market room)" },
    { name: "HARTI weekly bulletin, week 35 2021", provider: "HARTI", what: "Farmgate and wholesale prices", resolution: "selected markets", inUse: false, usedFor: "Sample mode: placeholder prices (real pipeline: income estimates)" },
    { name: "DCS mid-year population 2025", provider: "Dept. of Census & Statistics", what: "Population by district", resolution: "district", inUse: false, usedFor: "Sample mode: placeholder population (real pipeline: consumption needs)" },
  ],
};
fs.writeFileSync(`${OUT}/datasets.json`, JSON.stringify(datasets));

console.log("sample files written:", fs.readdirSync(OUT).join(", "), "| packs:", fs.readdirSync(`${OUT}/packs`).length);
