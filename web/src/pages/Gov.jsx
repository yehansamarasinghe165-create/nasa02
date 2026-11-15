import { useMemo, useState } from "react";
import { useData, fmt, CROP_COLORS, INK, STATUS } from "../lib/data.js";
import { computeNational, byId } from "../lib/model.js";
import { usePlans } from "../lib/store.js";
import DistrictMap from "../components/DistrictMap.jsx";
import EChart, { axis } from "../components/EChart.jsx";
import { SampleBanner, Tile, Card, Slider, Loading, CropDot } from "../components/ui.jsx";

const ZERO = { rainPct: 0, tempC: 0, fertPct: 0, shiftFrom: "paddy", shiftTo: "greengram", shiftPct: 0 };

export default function Gov() {
  const [data, error] = useData(["/data/national.json", "/data/crops.json", "/geo/districts.json"]);
  const [w, setW] = useState(ZERO);
  const [metric, setMetric] = useState("yield");
  const [crop, setCrop] = useState("paddy");
  const [season, setSeason] = useState("maha");
  const [sel, setSel] = useState("anuradhapura");
  const { plans } = usePlans();

  const calc = useMemo(() => data && { base: computeNational(data[0], data[1].crops), now: computeNational(data[0], data[1].crops, w) }, [data, w]);
  if (!data) return <Loading error={error} />;
  const [national, { crops }, geo] = data;
  const cropsById = byId(crops);
  const { base, now } = calc;
  const changed = JSON.stringify(w) !== JSON.stringify(ZERO);
  const dById = byId(national.districts);
  // coverage: registered plan area against the district's cropped land (both seasons' areas / 2, approximate)
  const regHa = plans.reduce((m, p) => ({ ...m, [p.districtId]: (m[p.districtId] || 0) + (Number(p.areaHa) || 0) }), {});
  const coverage = (dd) => { const land = Object.values(dd.crops).reduce((t, c) => t + c.area_ha, 0) / 2; return land ? (100 * (regHa[dd.id] || 0)) / land : 0; };

  const METRICS = {
    yield: { label: `${cropsById[crop].name} yield (t/ha)`, get: (d) => now.byDistrict[d.id].crops[crop].yield, format: (v) => v.toFixed(1) },
    production: { label: `${cropsById[crop].name} production (t)`, get: (d) => now.byDistrict[d.id].crops[crop].production_t, format: fmt.t },
    balance: { label: `${cropsById[crop].name} surplus (+) or deficit (−) against district consumption`, get: (d) => now.byDistrict[d.id].crops[crop].balance_t, format: fmt.t, diverging: true },
    fert: { label: "Nitrogen fertilizer need (t N)", get: (d) => now.byDistrict[d.id].fertN_t, format: fmt.t },
    stress: { label: "Yala water-stress index (0 = none, 1 = severe)", get: (d) => d.climate.water_stress, format: (v) => v.toFixed(2) },
    rain: { label: "Seasonal rain against normal (%)", get: (d) => d.climate.rain_anom_pct + w.rainPct, format: (v) => fmt.pct(v), diverging: true },
    onset: { label: "Maha rain onset shift since 1982 (days; + is later, − is earlier)", get: (d) => d.climate.onset_shift_days, format: (v) => `${v > 0 ? "+" : ""}${Math.round(v)} d`, diverging: true },
    coverage: { label: "Farm area registered in the app (%)", get: (d) => coverage(d), format: (v) => `${v < 1 ? v.toFixed(2) : v.toFixed(1)} %` },
    imerg: { label: `Rain in ${season === "maha" ? "Maha 2020/21" : "Yala 2021"} against 2001–2020 normal (%, GPM IMERG)`, get: (d) => d.sat?.imerg_rain_2021?.[season], format: (v) => fmt.pct(v), diverging: true },
    ndvi: { label: `Greenness in ${season === "maha" ? "Maha 2020/21" : "Yala 2021"} against normal (NDVI change, MODIS)`, get: (d) => d.sat?.ndvi_anom_2021?.[season], format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(3)}`, diverging: true },
    smap: { label: `Root-zone soil moisture in ${season === "maha" ? "Maha 2020/21" : "Yala 2021"} against 2016–2020 (m³/m³, SMAP)`, get: (d) => d.sat?.smap_anom_2021?.[season], format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(3)}`, diverging: true },
    slope: { label: "Typical slope (%, SRTM)", get: (d) => d.sat?.slope_pct, format: (v) => `${v.toFixed(1)} %` },
  };
  const M = METRICS[metric];
  const values = Object.fromEntries(national.districts.map((d) => [d.id, M.get(d)]));
  const d = dById[sel], dn = now.byDistrict[sel];

  const cropNames = crops.map((c) => c.name);
  const balanceOpt = {
    xAxis: axis({ type: "category", data: cropNames, splitLine: { show: false } }),
    yAxis: axis({ type: "value", name: "% of national consumption", axisLabel: { color: INK.muted, formatter: "{value} %" } }),
    legend: { show: false },
    tooltip: { trigger: "axis", formatter: (p) => { const c = crops[p[0].dataIndex], t = now.crops[c.id]; return `<b>${c.name}</b><br/>Production ${fmt.t(t.production_t)}<br/>Consumption ${fmt.t(t.need_t)}<br/>${t.balance_t >= 0 ? "Surplus" : "Deficit"} ${fmt.t(Math.abs(t.balance_t))}`; } },
    series: [{
      type: "bar", barMaxWidth: 28,
      data: crops.map((c) => { const t = now.crops[c.id]; const v = (t.balance_t / t.need_t) * 100; return { value: +v.toFixed(1), itemStyle: { color: v >= 0 ? "#2a78d6" : "#d03b3b", borderRadius: v >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4] } }; }),
      label: { show: true, position: "top", color: INK.secondary, fontSize: 11, formatter: (p) => `${p.value > 0 ? "+" : ""}${p.value} %` },
    }],
  };
  const fertOpt = {
    xAxis: axis({ type: "category", data: ["Nitrogen (N)", "Phosphorus (P)", "Potassium (K)"], splitLine: { show: false } }),
    yAxis: axis({ type: "value", name: "tonnes of nutrient" }),
    tooltip: { trigger: "axis", valueFormatter: (v) => fmt.t(v) },
    series: crops.map((c) => ({
      name: c.name, type: "bar", stack: "f", barMaxWidth: 44, itemStyle: { color: CROP_COLORS[c.id], borderColor: INK.surface, borderWidth: 1 },
      data: ["n", "p", "k"].map((k) => Math.round((now.crops[c.id].area_ha * c[k]) / 1000)),
    })),
  };
  const set = (k) => (v) => setW((s) => ({ ...s, [k]: v }));
  const liveArea = plans.reduce((s, p) => s + (Number(p.areaHa) || 0), 0);

  return (
    <div className="page">
      <SampleBanner meta={national.meta} />
      <div className="page-head">
        <div><h1>National crop outlook</h1><p>What the country is planting, what it will produce, what it needs, before the season ends.</p></div>
        {changed && <button className="btn ghost" onClick={() => setW(ZERO)}>Reset scenario</button>}
      </div>

      <div className="tiles">
        <Tile label="Paddy production" value={fmt.t(now.crops.paddy.production_t)} sub={changed ? `${fmt.pct((now.crops.paddy.production_t / base.crops.paddy.production_t - 1) * 100, 1)} against baseline` : `${fmt.int(now.crops.paddy.area_ha)} ha sown`} />
        <Tile label="Rice self-sufficiency" value={`${Math.round((now.crops.paddy.production_t / now.crops.paddy.need_t) * 100)} %`} sub={now.crops.paddy.balance_t >= 0 ? `Surplus ${fmt.t(now.crops.paddy.balance_t)}: store or export` : `Deficit ${fmt.t(-now.crops.paddy.balance_t)}: plan imports`} tone={now.crops.paddy.balance_t >= 0 ? "" : "bad"} />
        <Tile label="Nitrogen fertilizer need" value={fmt.t(now.fert.n)} sub={w.fertPct < 0 ? `Supply short by ${fmt.t(now.fert.n * (-w.fertPct / 100))}` : "At recommended rates (DoA)"} tone={w.fertPct < 0 ? "bad" : ""} />
        <Tile label="Calories from these 6 crops" value={`${Math.round(now.kcalCoverage * 100)} %`} sub={`of national need · protein ${Math.round(now.proteinCoverage * 100)} %`} />
        <Tile label="Plans registered" value={fmt.int(plans.length)} sub={`${fmt.int(liveArea)} ha entered through the app`} />
      </div>

      <div className="grid two-one">
        <Card title="Map" sub="Click a district for details. Add a NASA satellite layer and move the date slider to watch the season.">
          <div className="row wrap gap">
            <label className="field"><span>Colour districts by</span>
              <select value={metric} onChange={(e) => setMetric(e.target.value)}>
                <option value="yield">Predicted yield</option><option value="production">Production</option><option value="balance">Surplus / deficit</option>
                <option value="fert">Fertilizer need</option><option value="stress">Water stress</option><option value="rain">Rain against normal</option>
                <option value="onset">Rain-onset shift</option><option value="coverage">App coverage</option>
                <optgroup label="Satellite, 2021">
                  {national.districts.some((x) => x.sat?.imerg_rain_2021) && <option value="imerg">Rain (GPM IMERG)</option>}
                  {national.districts.some((x) => x.sat?.ndvi_anom_2021) && <option value="ndvi">Greenness (MODIS NDVI)</option>}
                  {national.districts.some((x) => x.sat?.smap_anom_2021) && <option value="smap">Soil moisture (SMAP)</option>}
                  {national.districts.some((x) => x.sat?.slope_pct != null) && <option value="slope">Slope (SRTM)</option>}
                </optgroup>
              </select>
            </label>
            {["imerg", "ndvi", "smap"].includes(metric) && (
              <label className="field"><span>Season</span>
                <select value={season} onChange={(e) => setSeason(e.target.value)}><option value="maha">Maha 2020/21</option><option value="yala">Yala 2021</option></select>
              </label>
            )}
            {["yield", "production", "balance"].includes(metric) && (
              <label className="field"><span>Crop</span>
                <select value={crop} onChange={(e) => setCrop(e.target.value)}>{crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </label>
            )}
          </div>
          <DistrictMap geo={geo} values={values} diverging={M.diverging} selected={sel} onSelect={setSel} legendTitle={M.label} format={M.format}
            tooltip={(id, p) => `<b>${p.name}</b><br/>${M.format(values[id])}`} />
        </Card>

        <div className="stack">
          <Card title="What-if scenario" sub="Move a slider; the map, totals and charts update at once.">
            <Slider label="Seasonal rainfall" value={w.rainPct} min={-40} max={40} step={5} unit=" %" signed onChange={set("rainPct")} />
            <Slider label="Temperature" value={w.tempC} min={0} max={3} step={0.5} unit=" °C" signed onChange={set("tempC")} />
            <Slider label="Fertilizer supply" value={w.fertPct} min={-80} max={0} step={10} unit=" %" signed onChange={set("fertPct")} />
            <div className="row gap wrap">
              <label className="field"><span>Shift area from</span><select value={w.shiftFrom} onChange={(e) => set("shiftFrom")(e.target.value)}>{crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="field"><span>to</span><select value={w.shiftTo} onChange={(e) => set("shiftTo")(e.target.value)}>{crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            </div>
            <Slider label="Share of that area moved" value={w.shiftPct} min={0} max={50} step={5} unit=" %" onChange={set("shiftPct")} />
            <p className="note">Yield responses to rain, heat and fertilizer are per-district coefficients taken from the yield model. A scenario is an assumption, not a forecast.</p>
          </Card>

          <Card title={d.name} sub={`${d.zone} zone · ${fmt.int(d.population)} people · ${coverage(d).toFixed(2)} % of farm area registered${coverage(d) < 10 ? " (low coverage: treat plans as indicative)" : ""}`}>
            <table className="tbl">
              <thead><tr><th>Crop</th><th className="num">Area ha</th><th className="num">Yield t/ha</th><th className="num">Balance</th></tr></thead>
              <tbody>{crops.map((c) => { const x = dn.crops[c.id]; return (
                <tr key={c.id}><td><CropDot id={c.id} />{c.name}</td><td className="num">{fmt.int(x.area_ha)}</td><td className="num">{x.yield.toFixed(2)}</td>
                  <td className="num" style={{ color: x.balance_t < 0 ? STATUS.critical : INK.secondary }}>{x.balance_t < 0 ? "−" : "+"}{fmt.t(Math.abs(x.balance_t))}</td></tr>); })}</tbody>
            </table>
            <p className="note">Season rain: Maha {d.climate.rain_maha_mm} mm, Yala {d.climate.rain_yala_mm} mm. Heat-stress days {d.climate.heat_days}. Maha onset {Math.abs(Math.round(d.climate.onset_shift_days))} days {d.climate.onset_shift_days >= 0 ? "later" : "earlier"} than in 1982. Nitrogen need {fmt.t(dn.fertN_t)}.</p>
          </Card>
        </div>
      </div>

      <div className="grid two">
        <Card title="Surplus or deficit by crop" sub="Production minus national consumption, as a share of consumption. Blue: store or export. Red: plan imports.">
          <EChart option={balanceOpt} label="Surplus or deficit by crop" />
        </Card>
        <Card title="Fertilizer need by nutrient" sub="Area × Department of Agriculture recommended rate, split by crop.">
          <EChart option={fertOpt} label="Fertilizer need by nutrient and crop" />
        </Card>
      </div>

      <Card title="Price pressure and action" sub="Expected price movement if production differs from the baseline year (assumed demand elasticities).">
        <table className="tbl">
          <thead><tr><th>Crop</th><th className="num">Production</th><th className="num">Consumption</th><th className="num">Balance</th><th className="num">Price pressure</th><th>Suggested action</th></tr></thead>
          <tbody>{crops.map((c) => { const t = now.crops[c.id]; const share = t.balance_t / t.need_t; return (
            <tr key={c.id}><td><CropDot id={c.id} />{c.name}</td><td className="num">{fmt.t(t.production_t)}</td><td className="num">{fmt.t(t.need_t)}</td>
              <td className="num" style={{ color: t.balance_t < 0 ? STATUS.critical : INK.secondary }}>{t.balance_t < 0 ? "−" : "+"}{fmt.t(Math.abs(t.balance_t))}</td>
              <td className="num">{Math.abs(t.priceChangePct) < 0.5 ? "steady" : fmt.pct(t.priceChangePct, 0)}</td>
              <td>{share > 0.1 ? "Surplus: arrange storage or export; warn farmers of low prices" : share > -0.05 ? "Roughly balanced: hold buffer stock" : share > -0.4 ? "Deficit: schedule imports; encourage more area next season" : "Large deficit: import plan needed; strong case for incentives"}</td></tr>); })}</tbody>
        </table>
      </Card>
    </div>
  );
}
