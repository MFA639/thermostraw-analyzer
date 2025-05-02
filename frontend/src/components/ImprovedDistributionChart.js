import React from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

const ImprovedDistributionChart = ({ fractionData }) => {
  // Préparation des données avec points interpolés pour lisser les courbes
  const createInterpolatedData = (data) => {
    const result = [];
    
    // Nombre de points intermédiaires entre chaque paire de points réels
    const pointsToAdd = 4;
    
    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      
      // Ajouter le point actuel avec tous les niveaux de confiance
      result.push({
        name: current.name,
        échantillon: current.value,
        min: current.min,
        max: current.max,
        
        // Confiance très élevée (±1%)
        min_conf_95: Math.max(0, current.min - 1),
        max_conf_95: Math.min(70, current.max + 1),
        
        // Confiance élevée (±3%)
        min_conf_90: Math.max(0, current.min - 3),
        max_conf_90: Math.min(70, current.max + 3),
        
        // Confiance moyenne (±6%)
        min_conf_80: Math.max(0, current.min - 6),
        max_conf_80: Math.min(70, current.max + 6),
        
        // Confiance faible (±10%)
        min_conf_70: Math.max(0, current.min - 10),
        max_conf_70: Math.min(70, current.max + 10),
        
        inRange: current.value >= current.min && current.value <= current.max,
        isInterpolated: false
      });
      
      // Ajouter des points interpolés si ce n'est pas le dernier point
      if (i < data.length - 1) {
        const next = data[i + 1];
        
        for (let j = 1; j <= pointsToAdd; j++) {
          const fraction = j / (pointsToAdd + 1);
          
          // Interpolation linéaire pour tous les points
          result.push({
            name: `${current.name}_${j}`,
            échantillon: current.value + fraction * (next.value - current.value),
            min: current.min + fraction * (next.min - current.min),
            max: current.max + fraction * (next.max - current.max),
            
            // Confiance très élevée (±1%)
            min_conf_95: Math.max(0, (current.min - 1) + fraction * ((next.min - 1) - (current.min - 1))),
            max_conf_95: Math.min(70, (current.max + 1) + fraction * ((next.max + 1) - (current.max + 1))),
            
            // Confiance élevée (±3%)
            min_conf_90: Math.max(0, (current.min - 3) + fraction * ((next.min - 3) - (current.min - 3))),
            max_conf_90: Math.min(70, (current.max + 3) + fraction * ((next.max + 3) - (current.max + 3))),
            
            // Confiance moyenne (±6%)
            min_conf_80: Math.max(0, (current.min - 6) + fraction * ((next.min - 6) - (current.min - 6))),
            max_conf_80: Math.min(70, (current.max + 6) + fraction * ((next.max + 6) - (current.max + 6))),
            
            // Confiance faible (±10%)
            min_conf_70: Math.max(0, (current.min - 10) + fraction * ((next.min - 10) - (current.min - 10))),
            max_conf_70: Math.min(70, (current.max + 10) + fraction * ((next.max + 10) - (current.max + 10))),
            
            inRange: false,
            isInterpolated: true
          });
        }
      }
    }
    
    return result;
  };
  
  // Créer les données avec points interpolés
  const chartData = createInterpolatedData(fractionData);
  
  // Fonction de rendu personnalisé pour les points de la ligne d'échantillon
  const customDot = (props) => {
    const { cx, cy, payload } = props;
    
    // Ne pas afficher de points pour les données interpolées
    if (payload.isInterpolated) {
      return null;
    }
    
    const inRange = payload.inRange;
    
    return (
      <g>
        {/* Le point lui-même */}
        <circle 
          cx={cx} 
          cy={cy} 
          r={6} 
          stroke={inRange ? "#22c55e" : "#ef4444"} 
          strokeWidth={2} 
          fill={inRange ? "#22c55e" : "#ef4444"} 
        />
        
        {/* Indicateur d'alerte pour les points hors plage */}
        {!inRange && (
          <g>
            <circle 
              cx={cx} 
              cy={cy - 20} 
              r={9}
              fill="#ef4444" 
            />
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
  
  // Filtre pour ne pas afficher les points sur les courbes de confiance
  const emptyDot = (props) => {
    if (props.payload.isInterpolated) return null;
    return <circle cx={props.cx} cy={props.cy} r={0} fill="transparent" />;
  };
  
  // Filtre pour n'afficher que les points réels sur les courbes min/max
  const thresholdDot = (props) => {
    if (props.payload.isInterpolated) return null;
    return <circle cx={props.cx} cy={props.cy} r={3} fill="#000000" />;
  };
  
  // Fonction pour filtrer l'affichage des étiquettes sur l'axe X
  const customXAxisTick = (props) => {
    const { x, y, payload } = props;
    // N'afficher que les noms qui ne contiennent pas de underscore
    if (payload.value && payload.value.includes('_')) {
      return null;
    }
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fontSize={12} fill="#666">
          {payload.value}
        </text>
      </g>
    );
  };

  // Personnalisation du tooltip - Version corrigée
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Ignorer les tooltips pour les points interpolés
    if (payload[0]?.payload?.isInterpolated) {
      return null;
    }
    
    // Rechercher les bonnes séries par nom plutôt que par position
    const échantillonSeries = payload.find(p => p.dataKey === "échantillon");
    const minSeries = payload.find(p => p.dataKey === "min");
    const maxSeries = payload.find(p => p.dataKey === "max");
    
    // Vérifier que toutes les séries sont trouvées
    if (!échantillonSeries || !minSeries || !maxSeries) {
      return null;
    }
    
    const échantillon = échantillonSeries.value;
    const min = minSeries.value;
    const max = maxSeries.value;
    
    // Utiliser la valeur inRange stockée directement dans les données
    const inRange = payload[0].payload.inRange;
    
    // Calcul de l'écart par rapport aux limites pour les points hors plage
    let ecart = '';
    if (!inRange) {
      if (échantillon < min) {
        ecart = `${(min - échantillon).toFixed(2)}% en dessous du minimum`;
      } else if (échantillon > max) {
        ecart = `${(échantillon - max).toFixed(2)}% au-dessus du maximum`;
      }
    }
    
    // Déterminer le niveau de confiance
    let confidenceText, confidenceColor;
    
    if (inRange) {
      confidenceText = "Confiance très élevée (>95%)";
      confidenceColor = "#166534";
    } else if (échantillon >= min - 1 && échantillon <= max + 1) {
      confidenceText = "Confiance élevée (90-95%)";
      confidenceColor = "#22c55e";
    } else if (échantillon >= min - 3 && échantillon <= max + 3) {
      confidenceText = "Confiance moyenne (80-90%)";
      confidenceColor = "#facc15";
    } else if (échantillon >= min - 6 && échantillon <= max + 6) {
      confidenceText = "Confiance faible (70-80%)";
      confidenceColor = "#f97316";
    } else {
      confidenceText = "Confiance très faible (<70%)";
      confidenceColor = "#ef4444";
    }
    
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-md rounded">
        <p className="font-bold text-sm">{label}</p>
        <div className="mt-1">
          <p className="text-sm">
            <span className="inline-block w-3 h-3 bg-blue-500 mr-2"></span>
            Échantillon: <span className="font-semibold">{échantillon.toFixed(2)}%</span>
          </p>
          <p className="text-sm">
            <span className="inline-block w-3 h-3 bg-black mr-2 opacity-70"></span>
            Min: <span className="font-semibold">{min.toFixed(2)}%</span>
          </p>
          <p className="text-sm">
            <span className="inline-block w-3 h-3 bg-black mr-2 opacity-70"></span>
            Max: <span className="font-semibold">{max.toFixed(2)}%</span>
          </p>
          <p className="text-sm mt-1">
            Status: <span className={`font-bold ${inRange ? 'text-green-600' : 'text-red-600'}`}>
              {inRange ? '✓ Dans la plage' : '✗ Hors plage'}
            </span>
          </p>
          {!inRange && (
            <p className="text-sm mt-1 text-red-600 font-medium">
              {ecart}
            </p>
          )}
          <p className="text-sm mt-2 font-medium" style={{ color: confidenceColor }}>
            Niveau de confiance: {confidenceText}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6">Distribution granulométrique vs. plages optimales</h2>
      
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-4 mb-2">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 mr-2"></div>
            <span className="text-sm font-medium">Échantillon</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-black mr-2 border-dashed border-t border-black"></div>
            <span className="text-sm font-medium">Seuil minimum/maximum</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-800 mr-2 opacity-30"></div>
            <span className="text-sm font-medium">Confiance très élevée (&gt;95%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 mr-2 opacity-30"></div>
            <span className="text-sm font-medium">Confiance élevée (90-95%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-400 mr-2 opacity-30"></div>
            <span className="text-sm font-medium">Confiance moyenne (80-90%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-orange-500 mr-2 opacity-30"></div>
            <span className="text-sm font-medium">Confiance faible (70-80%)</span>
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 25, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={customXAxisTick}
              interval={0}
            />
            <YAxis 
              label={{ value: 'Pourcentage (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} 
              domain={[0, 70]}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Niveau de confiance 70-80% (le plus large) */}
            <Line
              type="monotone"
              dataKey="min_conf_70"
              stroke="#f97316"
              strokeWidth={1}
              dot={emptyDot}
              activeDot={false}
              strokeOpacity={0.3}
            />
            <Line
              type="monotone"
              dataKey="max_conf_70"
              stroke="#f97316"
              strokeWidth={1}
              dot={emptyDot}
              activeDot={false}
              strokeOpacity={0.3}
            />
            
            {/* Niveau de confiance 80-90% */}
            <Line
              type="monotone"
              dataKey="min_conf_80"
              stroke="#facc15"
              strokeWidth={1}
              dot={emptyDot}
              activeDot={false}
              strokeOpacity={0.4}
            />
            <Line
              type="monotone"
              dataKey="max_conf_80"
              stroke="#facc15"
              strokeWidth={1}
              dot={emptyDot}
              activeDot={false}
              strokeOpacity={0.4}
            />
            
            {/* Niveau de confiance 90-95% */}
            <Line
              type="monotone"
              dataKey="min_conf_90"
              stroke="#22c55e"
              strokeWidth={1}
              dot={emptyDot}
              activeDot={false}
              strokeOpacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="max_conf_90"
              stroke="#22c55e"
              strokeWidth={1}
              dot={emptyDot}
              activeDot={false}
              strokeOpacity={0.5}
            />
            
            {/* Niveau de confiance >95% (le plus étroit) */}
            <Line
              type="monotone"
              dataKey="min_conf_95"
              stroke="#166534"
              strokeWidth={1.5}
              dot={emptyDot}
              activeDot={false}
              strokeOpacity={0.6}
            />
            <Line
              type="monotone"
              dataKey="max_conf_95"
              stroke="#166534"
              strokeWidth={1.5}
              dot={emptyDot}
              activeDot={false}
              strokeOpacity={0.6}
            />
            
            {/* Lignes principales (seuils et échantillon) */}
            <Line
              type="monotone"
              dataKey="min"
              stroke="#000000"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={thresholdDot}
            />
            
            <Line
              type="monotone"
              dataKey="max"
              stroke="#000000"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={thresholdDot}
            />
            
            <Line
              type="monotone"
              dataKey="échantillon"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={customDot}
              activeDot={{ r: 8, strokeWidth: 2 }}
            />
            
            <Legend />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Explication */}
      <div className="mt-6 text-sm bg-gray-50 p-3 rounded border border-gray-200">
        <p className="font-medium mb-2">Comment lire ce graphique :</p>
        <ul className="space-y-2">
          <li className="flex items-start">
            <div className="mr-2 w-4 h-4 mt-0.5 bg-blue-500"></div>
            <span>La ligne bleue représente les valeurs mesurées de votre échantillon pour chaque fraction</span>
          </li>
          <li className="flex items-start">
            <div className="mr-2 flex mt-0.5">
              <div className="w-4 h-4 rounded-full bg-green-600"></div>
            </div>
            <span>Les points verts indiquent que la valeur mesurée est dans la plage optimale</span>
          </li>
          <li className="flex items-start">
            <div className="mr-2 flex mt-0.5">
              <div className="w-4 h-4 rounded-full bg-red-600"></div>
            </div>
            <span>Les points rouges indiquent que la valeur mesurée est hors de la plage optimale</span>
          </li>
          <li className="flex items-start">
            <div className="mr-2 flex mt-0.5">
              <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">!</div>
            </div>
            <span>L'indicateur d'alerte apparaît lorsqu'une valeur est hors plage optimale</span>
          </li>
          <li className="flex items-start">
            <div className="mr-2 w-4 h-0.5 mt-3 bg-black border-dashed border-t border-black"></div>
            <span>Les lignes pointillées noires représentent les seuils minimum et maximum recommandés</span>
          </li>
          <li className="flex items-start">
            <div className="mr-2 w-4 h-4 mt-0.5 bg-green-800 opacity-30"></div>
            <span>Les lignes colorées représentent les niveaux de confiance en la prédiction</span>
          </li>
          <li className="flex items-start ml-6">
            <span>Plus on s'éloigne de la plage optimale, plus le niveau de confiance diminue</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ImprovedDistributionChart;