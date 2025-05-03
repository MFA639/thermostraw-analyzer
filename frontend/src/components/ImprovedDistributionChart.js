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

/* ---------- Config ---------- */
const API_URL = process.env.REACT_APP_API_URL ?? "https://thermostraw-api-production.up.railway.app";

/* ---------- Composant ---------- */
const ImprovedDistributionChart = ({ fractionData }) => {
  /* ----- interpolation pour le graphe (identique à avant) ----- */
  const createInterpolatedData = (data) => {
    const r=[], step=4;
    for (let i=0;i<data.length;i++){
      const c=data[i];
      r.push({...mkPoint(c,false)});
      if(i<data.length-1){
        const n=data[i+1];
        for(let j=1;j<=step;j++){
          const f=j/(step+1),lerp=(a,b)=>a+f*(b-a);
          r.push({...mkPoint({
            name:`${c.name}_${j}`,
            value:lerp(c.value,n.value),
            min:lerp(c.min,n.min),
            max:lerp(c.max,n.max)
          },true)});
        }
      }
    }
    return r;

    function mkPoint({name,value,min,max},interp){
      return {
        name,
        échantillon:value,
        min,max,
        min_conf_95:Math.max(0,min-1),    max_conf_95:Math.min(70,max+1),
        min_conf_90:Math.max(0,min-3),    max_conf_90:Math.min(70,max+3),
        min_conf_80:Math.max(0,min-6),    max_conf_80:Math.min(70,max+6),
        min_conf_70:Math.max(0,min-10),   max_conf_70:Math.min(70,max+10),
        inRange:value>=min && value<=max,
        isInterpolated:interp
      };
    }
  };

  const chartData = createInterpolatedData(fractionData);
  const chartRef = useRef(null);

  /* ---------- bouton PNG ---------- */
  const handlePngPopup = async () => {
    try{
      const canvas = await html2canvas(chartRef.current,{backgroundColor:null,scale:3});
      const dataUrl = canvas.toDataURL("image/png");

      /* pop‑up */
      const w = window.open("","","width=1280,height=800,noopener");
      w.document.title = "PNG ThermoStraw";
      w.document.body.style = "margin:0;display:flex;flex-direction:column;align-items:center;font-family:sans-serif;background:#f5f5f5";
      w.document.body.innerHTML = `
        <h2 style="margin:16px 0 8px">Graphique capturé</h2>
        <img id="graph" src="${dataUrl}" style="max-width:95%;height:auto;border:1px solid #ccc;box-shadow:0 0 6px rgba(0,0,0,.2)" />
        <button id="copy" style="margin:14px;padding:6px 18px;font-size:15px;border:none;border-radius:4px;background:#16a34a;color:#fff;cursor:pointer">
          Copier l’image
        </button>
        <p style="font-size:13px;color:#555;margin-top:6px">
          Puis revenez sur Google Sheets et faites <b>Ctrl + V</b>
        </p>
      `;
      /* copier via clipboard API → Chrome/Edge */
      w.document.getElementById("copy").onclick = async ()=>{
        try{
          const blob = await (await fetch(dataUrl)).blob();
          await navigator.clipboard.write([new ClipboardItem({[blob.type]:blob})]);
          w.alert("Image copiée ! Collez‑la dans Sheets.");
        }catch(e){
          w.alert("La copie automatique a échoué : clic droit ► Copier l’image.");
        }
      };
    }catch(e){
      console.error("PNG popup error",e);
      alert("Erreur capture PNG (voir console).");
    }
  };

  /* ---------- Rendus graphiques (identiques) ---------- */
  const emptyDot = p=>p.payload.isInterpolated?null:<circle r={0}/>;
  const thresholdDot = p=>p.payload.isInterpolated?null:<circle r={3} fill="#000"/>;
  const customXAxisTick = ({x,y,payload})=>payload.value.includes("_")?null:(
    <g transform={`translate(${x},${y})`}>
      <text dy={16} textAnchor="middle" fontSize={12} fill="#666">{payload.value}</text>
    </g>
  );
  const customDot = ({cx,cy,payload})=>{
    if(payload.isInterpolated) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={6}
                stroke={payload.inRange?"#22c55e":"#ef4444"}
                strokeWidth={2}
                fill={payload.inRange?"#22c55e":"#ef4444"} />
        {!payload.inRange && <>
          <circle cx={cx} cy={cy-20} r={9} fill="#ef4444"/>
          <text x={cx} y={cy-20} fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">!</text>
        </>}
      </g>
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Distribution granulométrique</h2>
        <button onClick={handlePngPopup}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow text-sm">
          Ouvrir le PNG
        </button>
      </div>

      <div className="h-80" ref={chartRef}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{top:25,right:30,left:20,bottom:5}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="name" tick={customXAxisTick} interval={0}/>
            <YAxis domain={[0,70]} label={{value:"%",angle:-90,position:"insideLeft"}}/>
            <Tooltip content={<></>} />{/* tooltip désactivé pour simplicité */}
            {/* bandes confiance */}
            {["70","80","90","95"].map(pct=>(
              <>
                <Line key={"min"+pct} type="monotone" dataKey={`min_conf_${pct}`} strokeOpacity={0.3} dot={emptyDot}/>
                <Line key={"max"+pct} type="monotone" dataKey={`max_conf_${pct}`} strokeOpacity={0.3} dot={emptyDot}/>
              </>
            ))}
            {/* seuils + valeur */}
            <Line type="monotone" dataKey="min" stroke="#000" strokeDasharray="4 4" dot={thresholdDot}/>
            <Line type="monotone" dataKey="max" stroke="#000" strokeDasharray="4 4" dot={thresholdDot}/>
            <Line type="monotone" dataKey="échantillon" stroke="#3b82f6" strokeWidth={2.5} dot={customDot}/>
            <Legend/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ImprovedDistributionChart;
