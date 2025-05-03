/**
 * ThermoStraw Analyzer – version « Direct PNG »
 * ------------------------------------------------
 * • Appelle /chart (FastAPI) → récupère PNG → l’insère directement.
 * • Supprime tout passage par Google Drive, tout timeout inutile.
 * • Conserve les validations et l’appel /predict-image pour les valeurs.
 */

/* =========================================================================
   CONFIGURATION
   ========================================================================= */
const BACKEND_BASE_URL = "https://thermostraw-api-production.up.railway.app";
const BACKEND_CHART_URL = BACKEND_BASE_URL + "/chart";
const BACKEND_PREDICT_URL = BACKEND_BASE_URL + "/predict";

const CELLS_CONFIG = {
  taux_2mm:   "B2",
  taux_1mm:   "B3",
  taux_500um: "B4",
  taux_250um: "B5",
  taux_0:     "B6"
};

const OUTPUT_CELL_LAMBDA   = "B8";
const OUTPUT_CELL_CI       = "B9";
const OUTPUT_CELL_MESSAGE  = "D8";
const OUTPUT_CELL_IMG_INFO = "D9";
const PNG_ANCHOR           = { col: 1, row: 11 };   // A11
const TARGET_WIDTH_PX      = 1200;                  // largeur finale dans Sheets


/* =========================================================================
   UTILITAIRES
   ========================================================================= */
function parseToNumber(v) {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "string") v = v.replace(",", ".");
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function showError(msg, useUi) {
  if (useUi) {
    SpreadsheetApp.getUi().alert("Erreur", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  }
  SpreadsheetApp.getActiveSheet().getRange(OUTPUT_CELL_MESSAGE).setValue("ERREUR : " + msg);
  throw new Error(msg);       // stoppe l’exécution
}


/* =========================================================================
   FONCTION PRINCIPALE
   ========================================================================= */
function calculateThermalConductivity() {

  const sheet = SpreadsheetApp.getActiveSheet();
  const uiAvailable = (() => { try { SpreadsheetApp.getUi(); return true; } catch { return false; } })();

  /* ----- 1. Lecture + validation ----- */
  const fractions = {};
  const err = [];

  Object.entries(CELLS_CONFIG).forEach(([key, ref]) => {
    const n = parseToNumber(sheet.getRange(ref).getValue());
    if (n === null) err.push(`${key} (cellule ${ref}) vide ou invalide`);
    else if (n < 0) err.push(`${key} (cellule ${ref}) ne peut pas être négatif`);
    else fractions[key] = n;
  });

  if (err.length) {
    showError(err.join("\n"), uiAvailable);
    return;
  }

  /* ----- 2. Prédiction numérique (lambda + CI) ----- */
  const predictOptions = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(fractions),
    muteHttpExceptions: true
  };
  const predResp = UrlFetchApp.fetch(BACKEND_PREDICT_URL, predictOptions);
  if (predResp.getResponseCode() !== 200) {
    showError("API predict : " + predResp.getContentText(), false);
    return;
  }
  const pred = JSON.parse(predResp.getContentText());

  // ─ Affichage lambda / CI ─
  sheet.getRange(OUTPUT_CELL_LAMBDA)
       .setValue(pred.lambda_predicted)
       .setNumberFormat("0.0000");

  sheet.getRange(OUTPUT_CELL_CI)
       .setValue(`±${pred.confidence_interval.toFixed(5)}`);

  const bg = { green:"#b6d7a8",orange:"#ffe599",red:"#ea9999" }[pred.status] || "#ffffff";
  sheet.getRange(OUTPUT_CELL_LAMBDA).setBackground(bg);

  /* ----- 3. Téléchargement du PNG ----- */
  const chartResp = UrlFetchApp.fetch(BACKEND_CHART_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(fractions),
    muteHttpExceptions: true
  });

  if (chartResp.getResponseCode() !== 200) {
    showError("API chart : " + chartResp.getContentText(), false);
    return;
  }

  const pngBlob = chartResp.getBlob().setName("chart.png");   // image/png

  /* ----- 4. Insertion dans la feuille ----- */
  // Supprime les anciennes images à l’ancre (si on veut éviter l’empilement)
  sheet.getImages().forEach(img => {
    if (img.getAnchorCell().getRow() === PNG_ANCHOR.row &&
        img.getAnchorCell().getColumn() === PNG_ANCHOR.col) {
      img.remove();
    }
  });

  const img = sheet.insertImage(
    pngBlob,
    PNG_ANCHOR.col,
    PNG_ANCHOR.row
  );

  const ratio = img.getWidth() / img.getHeight();
  img.setWidth(TARGET_WIDTH_PX)
     .setHeight(Math.round(TARGET_WIDTH_PX / ratio));

  sheet.getRange(OUTPUT_CELL_IMG_INFO)
       .setValue(`Image ${img.getWidth()}×${img.getHeight()} insérée en A${PNG_ANCHOR.row}`);

  SpreadsheetApp.flush();      // force le rendu immédiat
}


/* =========================================================================
   COMMANDES DE TESTS
   ========================================================================= */
function testChartOnly() {
  // Test unitaire : insère uniquement l’image avec les valeurs en B2:B6
  const sheet = SpreadsheetApp.getActiveSheet();
  const fractions = {};
  Object.entries(CELLS_CONFIG).forEach(([key, ref]) => {
    fractions[key] = parseToNumber(sheet.getRange(ref).getValue()) || 0;
  });
  const resp = UrlFetchApp.fetch(BACKEND_CHART_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(fractions)
  });
  const blob = resp.getBlob().setName("chart.png");
  sheet.insertImage(blob, PNG_ANCHOR.col, PNG_ANCHOR.row);
}
