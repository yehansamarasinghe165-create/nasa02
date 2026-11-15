import { Check } from "lucide-react";
import { useData, INK } from "../lib/data.js";
import EChart, { axis } from "../components/EChart.jsx";
import { Card, Loading, SampleBanner } from "../components/ui.jsx";

export function AblationChart({ rows, height = 260 }) {
  if (!rows?.length) return null;
  const labels = rows.map((r) => r.set);
  const s = (key, name, color, symbol) => ({ name, type: "bar", barMaxWidth: 22, itemStyle: { color, borderRadius: [4, 4, 0, 0] }, data: rows.map((r) => r[key]),
    label: { show: true, position: "top", fontSize: 10, color: INK.secondary, formatter: (p) => p.value?.toFixed(2) } });
  const option = {
    xAxis: axis({ type: "category", data: labels, splitLine: { show: false }, axisLabel: { color: INK.muted, fontSize: 10, interval: 0, width: 110, overflow: "break" } }),
    yAxis: axis({ type: "value", name: "Yield error, t/ha (lower is better)", min: 0 }),
    tooltip: { trigger: "axis", valueFormatter: (v) => `${v?.toFixed(3)} t/ha` },
    series: [s("cv_rmse", "2011–2020 check", "#2a78d6"), s("test_maha_rmse", "Maha 2020/21 test", "#eb6834"), s("test_yala_rmse", "Yala 2021 test", "#1baf7a")],
  };
  return <EChart option={option} height={height} label="Yield prediction error by the data used" />;
}

export function AblationTable({ rows, chosen }) {
  return (
    <table className="tbl">
      <thead><tr><th>Data given to the model</th><th>Best model</th><th className="num">2011–2020 check</th><th className="num">Maha 2021 test</th><th className="num">Yala 2021 test</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.set} className={r.set === chosen ? "sel" : ""}><td>{r.set}{r.set === chosen ? <span className="chosen"><Check size={14} strokeWidth={2.5} aria-hidden="true" /> chosen</span> : ""}</td><td>{r.model}</td>
          <td className="num">{r.cv_rmse.toFixed(3)}</td><td className="num">{r.test_maha_rmse.toFixed(3)}</td><td className="num">{r.test_yala_rmse.toFixed(3)}</td></tr>))}</tbody>
    </table>
  );
}

export default function Data() {
  const [data, error] = useData(["/data/datasets.json"]);
  if (!data) return <Loading error={error} />;
  const [ds] = data;
  const nasa = ds.datasets.filter((d) => d.provider === "NASA");
  const other = ds.datasets.filter((d) => d.provider !== "NASA");
  const Table = ({ rows }) => (
    <table className="tbl">
      <thead><tr><th>Dataset</th><th>What it measures</th><th>Resolution</th><th>Where the app uses it</th></tr></thead>
      <tbody>{rows.map((d) => (
        <tr key={d.name}><td><b>{d.name}</b>{!d.inUse && <><br /><span className="chip">not downloaded yet</span></>}<br /><small className="muted">{d.provider}</small></td>
          <td>{d.what}</td><td>{d.resolution}</td><td>{d.usedFor}</td></tr>))}</tbody>
    </table>
  );
  return (
    <div className="page">
      <SampleBanner meta={ds.meta} />
      <div className="page-head"><div><h1>Data used</h1><p>Every dataset behind the numbers, and exactly where the app uses it: inside the yield model, in the analysis, or only as a map picture.</p></div></div>
      <Card title="NASA Earth observations"><Table rows={nasa} /></Card>
      <Card title="What each dataset adds to the yield prediction" sub="Paddy yield by district and season. The same models were trained on 2002–2020 with more and more data; the error is how far predictions were from DCS records. The combination is chosen on the 2011–2020 check only; 2021 is a held-out test.">
        <AblationChart rows={ds.ablation} />
        <AblationTable rows={ds.ablation} chosen={ds.chosenSet} />
        <p className="note">Most of the skill comes from each district's own yield history. Satellite data help most where a season departs from normal. MODIS NDVI uses the first three months of each season, so that row is a mid-season forecast, not a pre-season one.</p>
      </Card>
      <Card title="Other sources"><Table rows={other} /></Card>
    </div>
  );
}
