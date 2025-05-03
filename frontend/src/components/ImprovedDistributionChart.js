import React, { useRef, useState } from "react";
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

const ImprovedDistributionChart = ({ fractionData }) => {
  const chartRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [imgDataUrl, setImgDataUrl] = useState(null);

  const createInterpolatedData = (data) => {
    const result = [];
    const pointsToAdd = 4;
    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      result.push(formatPoint(current, false));
      if (i < data.length - 1) {
        const next = data[i + 1];
        for (let j = 1; j <= pointsToAdd; j++) {
          const f = j / (pointsToAdd + 1);
          const lerp = (a, b) => a + f * (b - a);
          result.push(formatPoint({
            name: `${current.name}_${j}`,
            value: lerp(current.value, next.value),
            min: lerp(current.min, next.min),
            max: lerp(current.max, next.max)
          }, true));
        }
      }
    }
    return result;

    function formatPoint({ name, value, min, max }, isInterpolated) {
      const inRange = value >= min && value <= max;
      return {
        name,
        échantillon: value,
        min,
        max,
        min_conf_95: Math.max(0, min - 1),
        max_conf_95: Math.min(70, max + 1),
        min_conf_90: Math.max(0, min - 3),
        max_conf_90: Math.min(70, max + 3),
        min_conf_80: Math.max(0, min - 6),
        max_conf_80: Math.min(70, max + 6),
        min_conf_70: Math.max(0, min - 10),
        max_conf_70: Math.min(70, max + 10),
        inRange,
        isInterpolated
      };
    }
  };

  const chartData = createInterpolatedData(fractionData);

  const emptyDot = p => p.payload.isInterpolated ? null : <circle r={0} />;
  const thresholdDot = p => p.payload.isInterpolated ? null : <circle r={3} fill="#000" />;
  const customXAxisTick = ({ x, y, payload }) =>
    payload.value.includes("_") ? null : (
      <g transform={`translate(${x},${y})`}>
        <text dy={16} textAnchor="middle" fontSize={12} fill="#666">{payload.value}</text>
      </g>
    );

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length || payload[0].payload.isInterpolated) return null;
    const data = payload[0].payload;
    const ech = data.échantillon;
    const min = data.min;
    const max = data.max;
    const inRange = data.inRange;
    let ecart = '';
    if (!inRange) ecart = ech < min ? `${(min - ech).toFixed(2)}% sous min` : `${(ech - max).toFixed(2)}% au-delà max`;
    let conf = '>95%', col = '#166534';
    if (!inRange) {
      const d = Math.max(min - ech, ech - max);
      if (d <= 1) { conf = '90-95%'; col = '#22c55e'; }
      else if (d <= 3) { conf = '80-90%'; col = '#facc15'; }
      else if (d <= 6) { conf = '70-80%'; col = '#f97316'; }
      else { conf = '<70%'; col = '#ef4444'; }
    }
    return (
      <div className="bg-white p-3 border shadow rounded">
        <p className="font-bold mb-1">{label}</p>
        <p className="text-sm">Échantillon : <b>{ech.toFixed(2)}%</b></p>
        <p className="text-sm">Min/Max : <b>{min.toFixed(2)} – {max.toFixed(2)}%</b></p>
        <p className={inRange ? 'text-green-600' : 'text-red-600'}>
          {inRange ? '✓ Dans plage' : '✗ Hors plage'}
        </p>
        {ecart && <p className="text-red-600 text-sm">{ecart}</p>}
        <p className="text-sm" style={{ color: col }}>Confiance : {conf}</p>
      </div>
    );
  };

  const handleOpenModal = async () => {
    setModalOpen(true);
    setImgDataUrl(null);
    try {
      const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 3 });
      setImgDataUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('Erreur capture PNG', e);
      setModalOpen(false);
      alert('Échec capture image.');
    }
  };

  const handleCopy = async () => {
    if (!imgDataUrl) return;
    try {
      const blob = await (await fetch(imgDataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      alert('Image copiée!');
    } catch {
      alert('Utilisez clic-droit → Copier l\'image.');
    }
  };

  return (
    <>
      <div className="bg-white p-4 rounded shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Distribution vs plages optimales</h2>
          <button onClick={handleOpenModal} className="bg-green-600 text-white px-3 py-1 rounded">PNG</button>
        </div>

        <div ref={chartRef} className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={customXAxisTick} interval={0} />
              <YAxis domain={[0, 70]} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip />} />

              <Line type="monotone" dataKey="min_conf_70" stroke="#f97316" strokeOpacity={0.3} dot={emptyDot} />
              <Line type="monotone" dataKey="max_conf_70" stroke="#f97316" strokeOpacity={0.3} dot={emptyDot} />
              <Line type="monotone" dataKey="min_conf_80" stroke="#facc15" strokeOpacity={0.4} dot={emptyDot} />
              <Line type="monotone" dataKey="max_conf_80" stroke="#facc15" strokeOpacity={0.4} dot={emptyDot} />
              <Line type="monotone" dataKey="min_conf_90" stroke="#22c55e" strokeOpacity={0.5} dot={emptyDot} />
              <Line type="monotone" dataKey="max_conf_90" stroke="#22c55e" strokeOpacity={0.5} dot={emptyDot} />
              <Line type="monotone" dataKey="min_conf_95" stroke="#166534" strokeWidth={1.5} strokeOpacity={0.6} dot={emptyDot} />
              <Line type="monotone" dataKey="max_conf_95" stroke="#166534" strokeWidth={1.5} strokeOpacity={0.6} dot={emptyDot} />

              <Line type="monotone" dataKey="min" stroke="#000" strokeDasharray="4 4" dot={thresholdDot} />
              <Line type="monotone" dataKey="max" stroke="#000" strokeDasharray="4 4" dot={thresholdDot} />
              <Line type="monotone" dataKey="échantillon" stroke="#3b82f6" strokeWidth={2.5} dot={thresholdDot} activeDot={{ r: 8 }} />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 bg-gray-50 p-3 rounded border">
          <p className="font-medium mb-1">Mode d’emploi :</p>
          <ul className="list-disc ml-5 text-sm">
            <li>Ligne bleue = mesures</li>
            <li>Lignes pointillées = seuils</li>
            <li>Barres colorées = bandes de confiance ±1/3/6/10%</li>
            <li>Points rouges = valeurs hors plage</li>
          </ul>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-lg max-w-lg w-full">
            <button onClick={() => setModalOpen(false)} className="float-right">✕</button>
            {imgDataUrl ? (
              <>
                <img src={imgDataUrl} className="w-full mb-2 border" />
                <button onClick={handleCopy} className="bg-blue-600 text-white px-3 py-1 rounded">Copier</button>
              </>
            ) : (
              <p>Génération…</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ImprovedDistributionChart;
