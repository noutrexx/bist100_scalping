# BIST 100 Endeksi hisse sembolleri (Yahoo Finance .IS formatı)
BIST100_SYMBOLS = [
    "AKBNK.IS", "AKSA.IS", "AKSEN.IS", "AEFES.IS", "ALARK.IS",
    "ALBRK.IS", "ALFAS.IS", "ARCLK.IS", "ASELS.IS", "AYDEM.IS",
    "BERA.IS", "BIMAS.IS", "BIOEN.IS", "BRSAN.IS", "BRYAT.IS",
    "BUCIM.IS", "CCOLA.IS", "CIMSA.IS", "CWENE.IS", "DOAS.IS",
    "ECILC.IS", "ECZYT.IS", "EGEEN.IS", "EKGYO.IS", "ENBW.IS",
    "ENKAI.IS", "EREGL.IS", "EUPWR.IS", "FROTO.IS", "GARAN.IS",
    "GUBRF.IS", "HALKB.IS", "IPEKE.IS", "ISCTR.IS", "ISGYO.IS",
    "ISFIN.IS", "ISMEN.IS", "KARSN.IS", "KCAER.IS", "KCHOL.IS",
    "KONTR.IS", "KONYA.IS", "KORDS.IS", "KOZAA.IS", "KOZAL.IS",
    "KRDMD.IS", "LOGO.IS", "MAVI.IS", "MGROS.IS", "MPARK.IS",
    "NETAS.IS", "ODAS.IS", "OTKAR.IS", "OYAKC.IS", "PGSUS.IS",
    "PETKM.IS", "PORTK.IS", "QUAGR.IS", "SAHOL.IS", "SASA.IS",
    "SELEC.IS", "SERBF.IS", "SKBNK.IS", "SMRTG.IS", "SOKM.IS",
    "SUNTK.IS", "SUPRS.IS", "TAVHL.IS", "TCELL.IS", "THYAO.IS",
    "TKFEN.IS", "TKNSA.IS", "TLMAN.IS", "TOASO.IS", "TSKB.IS",
    "TTKOM.IS", "TTRAK.IS", "TUPRS.IS", "TURSG.IS", "ULKER.IS",
    "VAKBN.IS", "VESBE.IS", "VESTL.IS", "VKGYO.IS", "YATAS.IS",
    "YEOTK.IS", "YKBNK.IS", "ZRGYO.IS", "PRKME.IS", "AGHOL.IS",
    "AGESA.IS", "AKMGY.IS", "AKGRT.IS", "BASGZ.IS", "CANTE.IS",
    "BFREN.IS", "DEVA.IS", "FENER.IS", "GLCVY.IS", "HEKTS.IS",
    # AL-KAÇ / Yüksek Volatilite (Teknoloji & Yeni Halka Arzlar)
    "MIATK.IS", "ASTOR.IS", "TABGD.IS", "FORTE.IS", "CVKMD.IS",
    "REEDR.IS", "MEKAG.IS", "IZENR.IS", "KALES.IS", "TATEN.IS",
    "BYDNR.IS", "BINHO.IS", "OBAKM.IS", "ALVES.IS", "CATES.IS",
]

def get_symbol_name(symbol: str) -> str:
    """Yahoo Finance sembolünden sade hisse adını döndürür."""
    return symbol.replace(".IS", "")
