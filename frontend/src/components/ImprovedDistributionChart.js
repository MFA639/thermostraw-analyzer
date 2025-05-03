import React, { useRef } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from "recharts";

/* ╭──────────────────────────────────────────────────────────╮
   │  CONFIGURATION                                           │
   ╰──────────────────────────────────────────────────────────╯ */
const API_URL    = "https://thermostraw-api-production.up.railway.app";
const SHEETS_URL = "https://docs.google.com/spreadsheets/d/1omUDr6eEo_PcQTwah8I1mpkJoJ_aOYEXKL4kPQU2fCo/edit?gid=0#gid=0/edit"; // ← remplace

const ImprovedDistributionChart = ({ fractionData }) => {
  /* ───────── 1. Data avec interpolation ───────── */
  const createInterpolatedData = (data) => {
    const result = [];
    const pointsToAdd = 4;
    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      result.push({
        name: c.name,
        échantillon: c.value,
        min: c.min,
        max: c.max,
        min_conf_95: Math.max(0, c.min - 1),
        max_conf_95: Math.min(70, c.max + 1),
        min_conf_90: Math.max(0, c.min - 3),
        max_conf_90: Math.min(70, c.max + 3),
        min_conf_80: Math.max(0, c.min - 6),
        max_conf_80: Math.min(70, c.max + 6),
        min_conf_70: Math.max(0, c.min - 10),
        max_conf_70: Math.min(70, c.max + 10),
        inRange: c.value >= c.min && c.value <= c.max,
        isInterpolated: false
      });
      if (i < data.length - 1) {
        const n = data[i + 1];
        for (let j = 1; j <= pointsToAdd; j++) {
          const f = j / (pointsToAdd + 1);
          const lerp = (a, b) => a + f * (b - a);
          result.push({
            name: `${c.name}_${j}`,
            échantillon: lerp(c.value, n.value),
            min: lerp(c.min, n.min),
            max: lerp(c.max, n.max),
            min_conf_95: Math.max(0, lerp(c.min - 1, n.min - 1)),
            max_conf_95: Math.min(70, lerp(c.max + 1, n.max + 1)),
            min_conf_90: Math.max(0, lerp(c.min - 3, n.min - 3)),
            max_conf_90: Math.min(70, lerp(c.max + 3, n.max + 3)),
            min_conf_80: Math.max(0, lerp(c.min - 6, n.min - 6)),
            max_conf_80: Math.min(70, lerp(c.max + 6, n.max + 6)),
            min_conf_70: Math.max(0, lerp(c.min - 10, n.min - 10)),
            max_conf_70: Math.min(70, lerp(c.max + 10, n.max + 10)),
            inRange: false,
            isInterpolated: true
          });
        }
      }
    }
    return result;
  };

  const chartData = createInterpolatedData(fractionData);

  /* ───────── 2. Rendu custom pour les points ───────── */
  const customDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.isInterpolated) return null;
    const inRange = payload.inRange;
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={6}
          stroke={inRange ? "#22c55e" : "#ef4444"}
          strokeWidth={2}
          fill={inRange ? "#22c55e" : "#ef4444"}
        />
        {!inRange && (
          <g>
            <circle cx={cx} cy={cy - 20} r={9} fill="#ef4444" />
            <text
              x={cx}
              y={cy - 20}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="12"
              fontWeight="bold"
            >
              !
            </text>
          </g>
        )}
      </g>
    );
  };

  const emptyDot = (p) => (p.payload.isInterpolated ? null : <circle r={0} />);
  const thresholdDot = (p) => (p.payload.isInterpolated ? null : <circle r={3} fill="#000" />);

  const customXAxisTick = (props) => {
    const { x, y, payload } = props;
    if (payload.value && payload.value.includes("_")) return null;
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={16} textAnchor="middle" fontSize={12} fill="#666">
          {payload.value}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length && !payload[0].payload.isInterpolated) {
      const échantillon = payload.find(p => p.dataKey === "échantillon").value;
      const min = payload.find(p => p.dataKey === "min").value;
      const max = payload.find(p => p.dataKey === "max").value;
      const inRange = payload[0].payload.inRange;
      let ecart = "";
      if (!inRange) ecart = échantillon < min
        ? `${(min - échantillon).toFixed(2)} % sous le min`
        : `${(échantillon - max).toFixed(2)} % au‑dessus du max`;
      let confTxt, confColor;
      if (inRange)                { confTxt = ">95 %"; confColor = "#166534"; }
      else if (Math.abs(ecart) <= 1)  { confTxt = "90‑95 %"; confColor = "#22c55e"; }
      else if (Math.abs(ecart) <= 3)  { confTxt = "80‑90 %"; confColor = "#facc15"; }
      else if (Math.abs(ecart) <= 6)  { confTxt = "70‑80 %"; confColor = "#f97316"; }
      else                          { confTxt = "<70 %"; confColor = "#ef4444"; }

      return (
        <div className="bg-white p-3 border border-gray-200 shadow rounded">
          <p className="font-bold text-sm">{label}</p>
          <p className="text-sm">Échantillon : <b>{échantillon.toFixed(2)} %</b></p>
          <p className="text-sm">Min/max : <b>{min.toFixed(2)} – {max.toFixed(2)} %</b></p>
          <p className="text-sm">Statut : <b className={inRange ? "text-green-600" : "text-red-600"}>
            {inRange ? "✓ ok" : "✗ hors plage"}</b></p>
          {!inRange && <p className="text-sm text-red-600">{ecart}</p>}
          <p className="text-sm" style={{ color: confColor }}>Confiance : {confTxt}</p>
        </div>
      );
    }
    return null;
  };

  /* ───────── 3. Référence DOM et export ───────── */
  const chartRef = useRef(null);

  const handleExport = async () => {
    try {
      const canvas = await html2canvas(chartRef.current, { backgroundColor: null, scale: 3 });
      const dataUrl = canvas.toDataURL("image/png");

      /* fractions sous forme d’objet */
      const fr = {
        taux_2mm:   fractionData[0].value,
        taux_1mm:   fractionData[1].value,
        taux_500um: fractionData[2].value,
        taux_250um: fractionData[3].value,
        taux_0:     fractionData[4].value
      };

      await axios.post(`${API_URL}/save-chart-image`, {
        fractions: fr,
        chart_image: dataUrl
      });

      window.open(SHEETS_URL, "_blank");
    } catch (err) {
      console.error("Export vers Sheets échoué:", err);
      alert("Erreur pendant l’export (voir console).");
    }
  };

  /* ───────── 4. Render ───────── */
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          Distribution granulométrique vs. plages optimales
        </h2>
        <button
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm shadow"
        >
          Exporter vers Sheets
        </button>
      </div>

      <div className="h-80" ref={chartRef}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={customXAxisTick} interval={0} />
            <YAxis domain={[0, 70]} label={{ value: "Pourcentage (%)", angle: -90, position: "insideLeft" }} />
            <Tooltip content={<CustomTooltip />} />

            {/* bandes de confiance */}
            <Line type="monotone" dataKey="min_conf_70" stroke="#f97316" strokeOpacity={0.3} dot={emptyDot}/>
            <Line type="monotone" dataKey="max_conf_70" stroke="#f97316" strokeOpacity={0.3} dot={emptyDot}/>
            <Line type="monotone" dataKey="min_conf_80" stroke="#facc15" strokeOpacity={0.4} dot={emptyDot}/>
            <Line type="monotone" dataKey="max_conf_80" stroke="#facc15" strokeOpacity={0.4} dot={emptyDot}/>
            <Line type="monotone" dataKey="min_conf_90" stroke="#22c55e" strokeOpacity={0.5} dot={emptyDot}/>
            <Line type="monotone" dataKey="max_conf_90" stroke="#22c55e" strokeOpacity={0.5} dot={emptyDot}/>
            <Line type="monotone" dataKey="min_conf_95" stroke="#166534" strokeOpacity={0.6} strokeWidth={1.5} dot={emptyDot}/>
            <Line type="monotone" dataKey="max_conf_95" stroke="#166534" strokeOpacity={0.6} strokeWidth={1.5} dot={emptyDot}/>

            {/* limites et valeur mesurée */}
            <Line type="monotone" dataKey="min" stroke="#000" strokeDasharray="4 4" dot={thresholdDot}/>
            <Line type="monotone" dataKey="max" stroke="#000" strokeDasharray="4 4" dot={thresholdDot}/>
            <Line type="monotone" dataKey="échantillon" stroke="#3b82f6" strokeWidth={2.5} dot={customDot} activeDot={{ r: 8, strokeWidth: 2 }}/>

            <Legend />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ImprovedDistributionChart;
