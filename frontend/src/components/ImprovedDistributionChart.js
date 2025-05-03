import React, { useRef } from "react";
import html2canvas from "html2canvas";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from "recharts";

/* ---------- Config ---------- */
const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL
  ?? "https://derive-labda-production.up.railway.app";

/* ---------- Composant ---------- */
const ImprovedDistributionChart = ({ fractionData }) => {
  const chartRef = useRef(null);

  /* ----- 1. interpolation des données ----- */
  const createInterpolatedData = (data) => {
    const res = [], step = 4;
    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      res.push(makePoint(c, false));
      if (i < data.length - 1) {
        const n = data[i + 1];
        for (let j = 1; j <= step; j++) {
          const f = j / (step + 1);
          const lerp = (a, b) => a + f * (b - a);
          res.push(makePoint({
            name: `${c.name}_${j}`,
            value: lerp(c.value, n.value),
            min: lerp(c.min, n.min),
            max: lerp(c.max, n.max)
          }, true));
        }
      }
    }
    return res;

    function makePoint({ name, value, min, max }, interp) {
      return {
        name,
        échantillon: value,
        min, max,
        min_conf_95: Math.max(0, min - 1),    max_conf_95: Math.min(70, max + 1),
        min_conf_90: Math.max(0, min - 3),    max_conf_90: Math.min(70, max + 3),
        min_conf_80: Math.max(0, min - 6),    max_conf_80: Math.min(70, max + 6),
        min_conf_70: Math.max(0, min - 10),   max_conf_70: Math.min(70, max + 10),
        inRange: value >= min && value <= max,
        isInterpolated: interp
      };
    }
  };

  const chartData = createInterpolatedData(fractionData);

  /* ----- 2. rendus simplifiés ----- */
  const emptyDot = p => p.payload.isInterpolated ? null : <circle r={0} />;
  const thresholdDot = p => p.payload.isInterpolated ? null : <circle r={3} fill="#000" />;
  const customXAxisTick = ({ x, y, payload }) =>
    payload.value.includes("_") ? null : (
      <g transform={`translate(${x},${y})`}>
        <text dy={16} textAnchor="middle" fontSize={12} fill="#666">
          {payload.value}
        </text>
      </g>
    );

  /* ----- 3. pop-up PNG corrigée ----- */
  const handlePngPopup = async () => {
    // 1) Ouvre d’abord la fenêtre
    const w = window.open("", "_blank", "width=1280,height=800,noopener");
    if (!w) {
      alert("Popup bloquée ! Autorisez les pop-ups pour ce site.");
      return;
    }
    // Affiche un loader
    w.document.title = "ThermoStraw – génération PNG…";
    w.document.body.style = "margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif";
    w.document.body.innerHTML = `<p>Génération du PNG… patientez</p>`;

    try {
      // 2) rend le canvas
      const canvas = await html2canvas(chartRef.current, { backgroundColor: null, scale: 3 });
      const dataUrl = canvas.toDataURL("image/png");

      // 3) affiche le résultat
      w.document.title = "PNG ThermoStraw";
      w.document.body.style = "margin:0;display:flex;flex-direction:column;align-items:center;font-family:sans-serif;background:#f5f5f5";
      w.document.body.innerHTML = `
        <h2 style="margin:16px 0 8px">Graphique capturé</h2>
        <img id="graph" src="${dataUrl}" style="max-width:95%;height:auto;border:1px solid #ccc;box-shadow:0 0 6px rgba(0,0,0,.2)" />
        <button id="copy" style="margin:14px;padding:6px 18px;font-size:15px;border:none;border-radius:4px;background:#16a34a;color:#fff;cursor:pointer">
          Copier l’image
        </button>
        <p style="font-size:13px;color:#555;margin-top:6px">
          Puis revenez sur Google Sheets et faites <b>Ctrl + V</b>
        </p>
      `;

      // 4) gestion du copier
      w.document.getElementById("copy").onclick = async () => {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          w.alert("Image copiée ! Collez-la dans Sheets.");
        } catch {
          w.alert("Copie auto impossible ; utilisez clic droit → Copier l’image.");
        }
      };
    } catch (e) {
      console.error("PNG popup error", e);
      w.document.body.innerHTML = `<p>Erreur lors de la génération du PNG.<br/>Voir la console.</p>`;
    }
  };

  /* ----- 4. rendu JSX ----- */
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Distribution granulométrique</h2>
        <button
          onClick={handlePngPopup}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow text-sm"
        >
          Ouvrir le PNG
        </button>
      </div>

      <div className="h-80" ref={chartRef}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={customXAxisTick} interval={0} />
            <YAxis domain={[0, 70]} label={{ value: "%", angle: -90, position: "insideLeft" }} />
            {/* bandes de confiance */}
            {["70","80","90","95"].map(pct => (
              <React.Fragment key={pct}>
                <Line type="monotone" dataKey={`min_conf_${pct}`} strokeOpacity={0.3} dot={emptyDot} />
                <Line type="monotone" dataKey={`max_conf_${pct}`} strokeOpacity={0.3} dot={emptyDot} />
              </React.Fragment>
            ))}
            {/* limites et valeur mesurée */}
            <Line type="monotone" dataKey="min" stroke="#000" strokeDasharray="4 4" dot={thresholdDot} />
            <Line type="monotone" dataKey="max" stroke="#000" strokeDasharray="4 4" dot={thresholdDot} />
            <Line type="monotone" dataKey="échantillon" stroke="#3b82f6" strokeWidth={2.5} dot />
            <Legend />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ImprovedDistributionChart;
