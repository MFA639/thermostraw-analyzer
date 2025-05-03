import React, { useRef, useState } from "react";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [imgDataUrl, setImgDataUrl] = useState(null);

  /* ----- 1. interpolation des données ----- */
  const createInterpolatedData = (data) => {
    const res = [];
    const step = 4;
    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      res.push(makePoint(c, false));
      if (i < data.length - 1) {
        const n = data[i + 1];
        for (let j = 1; j <= step; j++) {
          const f = j / (step + 1);
          const lerp = (a, b) => a + f * (b - a);
          res.push(
            makePoint({
              name: `${c.name}_${j}`,
              value: lerp(c.value, n.value),
              min: lerp(c.min, n.min),
              max: lerp(c.max, n.max)
            },
            true)
          );
        }
      }
    }
    return res;

    function makePoint({ name, value, min, max }, interp) {
      return {
        name,
        échantillon: value,
        min,
        max,
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

  /* ----- 3. capture & modal ----- */
  const handleOpenModal = async () => {
    setModalOpen(true);
    setImgDataUrl(null);
    try {
      const canvas = await html2canvas(chartRef.current, { backgroundColor: null, scale: 3 });
      const dataUrl = canvas.toDataURL("image/png");
      setImgDataUrl(dataUrl);
    } catch (e) {
      console.error("Erreur capture PNG", e);
      setModalOpen(false);
      alert("Échec de la capture d'image. Vérifiez la console.");
    }
  };

  const handleCopy = async () => {
    if (!imgDataUrl) return;
    try {
      const blob = await (await fetch(imgDataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      alert("Image copiée dans le presse-papiers !");
    } catch {
      alert("Copie automatique impossible ; utilisez clic droit → Copier l’image.");
    }
  };

  /* ----- 4. rendu JSX ----- */
  return (
    <>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Distribution granulométrique</h2>
          <button
            onClick={handleOpenModal}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow text-sm"
          >
            Afficher PNG
          </button>
        </div>

        <div className="h-80" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={customXAxisTick} interval={0} />
              <YAxis domain={[0, 70]} label={{ value: "%", angle: -90, position: "insideLeft" }} />
              {['70','80','90','95'].map(pct => (
                <React.Fragment key={pct}>
                  <Line type="monotone" dataKey={`min_conf_${pct}`} strokeOpacity={0.3} dot={emptyDot} />
                  <Line type="monotone" dataKey={`max_conf_${pct}`} strokeOpacity={0.3} dot={emptyDot} />
                </React.Fragment>
              ))}
              <Line type="monotone" dataKey="min" stroke="#000" strokeDasharray="4 4" dot={thresholdDot} />
              <Line type="monotone" dataKey="max" stroke="#000" strokeDasharray="4 4" dot={thresholdDot} />
              <Line type="monotone" dataKey="échantillon" stroke="#3b82f6" strokeWidth={2.5} dot />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal overlay */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Graphique PNG</h3>
              <button onClick={()=>setModalOpen(false)} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>
            {imgDataUrl ? (
              <>
                <img src={imgDataUrl} alt="PNG graphique" className="w-full h-auto mb-4 border" />
                <button
                  onClick={handleCopy}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Copier dans le presse-papiers
                </button>
              </>
            ) : (
              <p>Génération en cours…</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ImprovedDistributionChart;
