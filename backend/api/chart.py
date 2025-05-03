"""
API router qui fabrique un PNG du graphique « ImprovedDistributionChart » pour Google Sheets.
Aucun fichier n’est créé : l’image reste en mémoire, puis est streamée en réponse.
"""

from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel
from io import BytesIO
import matplotlib.pyplot as plt

router = APIRouter(prefix="/chart", tags=["chart"])

# ---------- Modèle de requête ----------
class Fractions(BaseModel):
    taux_2mm: float
    taux_1mm: float
    taux_500um: float
    taux_250um: float
    taux_0: float


# ---------- Endpoint ----------
@router.post("/", response_class=Response)
def chart_png(fractions: Fractions):
    """
    Retourne un PNG (type image/png) représentant la distribution granulométrique.
    L’échelle est 0→70 %.
    """
    try:
        # ───── Données ─────
        names = ["> 2 mm", "1 – 2 mm", "500 µm – 1 mm",
                 "250 – 500 µm", "< 250 µm"]
        values = [
            fractions.taux_2mm, fractions.taux_1mm, fractions.taux_500um,
            fractions.taux_250um, fractions.taux_0
        ]

        # ───── Figure Matplotlib ─────
        fig, ax = plt.subplots(figsize=(6, 3), dpi=150)   # 900 × 450 px
        bars = ax.bar(names, values, color="#3b82f6")
        ax.set_ylim(0, 70)
        ax.set_ylabel("%")
        ax.set_title("Distribution granulométrique")
        ax.grid(axis="y", linestyle="--", alpha=.4)

        # ───── Export PNG en mémoire ─────
        buf = BytesIO()
        fig.tight_layout()
        fig.savefig(buf, format="png", bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)

        # ───── Réponse FastAPI ─────
        return Response(
            content=buf.getvalue(),
            media_type="image/png",
            headers={"Cache-Control": "no-store"}
        )

    except Exception as err:
        raise HTTPException(500, f"Erreur génération graphe : {err}")
