import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "app.title": "AgroChain",
      "app.subtitle": "Parametric Crop Insurance",
      "nav.connect": "Connect Wallet",
      
      "wizard.step1": "1. Farm Details",
      "wizard.step2": "2. Insurance Quote",
      "wizard.step3": "3. Processing",
      "wizard.back": "← Back",
      
      "form.location": "Farm Location & Boundaries",
      "form.lat": "Latitude",
      "form.lon": "Longitude",
      "form.crop": "Crop Type",
      "form.crop.soy": "🌱 Soybean",
      "form.crop.corn": "🌽 Corn",
      "form.crop.wheat": "🌾 Wheat",
      "form.size": "Farm Size (Hectares)",
      "form.duration": "Coverage Duration (days)",
      "form.region": "Region Code",

      "quote.maxCoverage": "Maximum Coverage",
      "quote.premiumRate": "Premium Rate",
      "quote.totalDue": "Total Premium Due",
      "quote.oracleConf": "Oracle Data Confidence",
      "quote.confVia": "confidence via multi-source consensus",
      
      "triggers.title": "Payout Triggers (14+ consecutive days):",
      "triggers.partial": "Drought Index > 70:",
      "triggers.partial.text": "50% Partial Payout",
      "triggers.full": "Drought Index > 85:",
      "triggers.full.text": "100% Full Payout",

      "btn.quote": "Get Quote →",
      "btn.approving": "⏳ Approving USDC…",
      "btn.signing": "⏳ Signing Policy…",
      "btn.active": "✓ Policy Active",
      "btn.signAndPay": "Sign & Pay",
      "msg.protected": "Your farm is protected 🌱",
      "app.agentStatus": "● APRA-1_AGENT_ACTIVE",
      "app.dataSource": "DATA_SOURCE: OPEN_METEO_SAT",
      "quote.agentVerified": "APRA-1 AGENT VERIFIED"
    }
  },
  es: {
    translation: {
      "app.title": "AgroChain",
      "app.subtitle": "Seguro Agrícola Paramétrico",
      "nav.connect": "Conectar Billetera",

      "wizard.step1": "1. Detalles del Campo",
      "wizard.step2": "2. Cotización",
      "wizard.step3": "3. Procesamiento",
      "wizard.back": "← Volver",

      "form.location": "Ubicación y Límites",
      "form.lat": "Latitud",
      "form.lon": "Longitud",
      "form.crop": "Tipo de Cultivo",
      "form.crop.soy": "🌱 Soja",
      "form.crop.corn": "🌽 Maíz",
      "form.crop.wheat": "🌾 Trigo",
      "form.size": "Tamaño (Hectáreas)",
      "form.duration": "Duración Cobertura (días)",
      "form.region": "Código de Región",

      "quote.maxCoverage": "Cobertura Máxima",
      "quote.premiumRate": "Tasa de Prima",
      "quote.totalDue": "Prima Total a Pagar",
      "quote.oracleConf": "Confianza de Datos",
      "quote.confVia": "confianza vía consenso de múltiples fuentes",

      "triggers.title": "Disparadores de Pago (14+ días consecutivos):",
      "triggers.partial": "Índice de Sequía > 70:",
      "triggers.partial.text": "50% Pago Parcial",
      "triggers.full": "Índice de Sequía > 85:",
      "triggers.full.text": "100% Pago Total",

      "btn.quote": "Obtener Cotización →",
      "btn.approving": "⏳ Aprobando USDC…",
      "btn.signing": "⏳ Firmando Póliza…",
      "btn.active": "✓ Póliza Activa",
      "btn.signAndPay": "Firmar y Pagar",
      "msg.protected": "Campo protegido 🌱",
      "app.agentStatus": "● AGENTE_APRA-1_ACTIVO",
      "app.dataSource": "FUENTE_DE_DATOS: OPEN_METEO_SAT",
      "quote.agentVerified": "AGENTE APRA-1 VERIFICADO"
    }
  },
  pt: {
    translation: {
      "app.title": "AgroChain",
      "app.subtitle": "Seguro Agrícola Paramétrico",
      "nav.connect": "Conectar Carteira",

      "wizard.step1": "1. Detalhes da Fazenda",
      "wizard.step2": "2. Cotação",
      "wizard.step3": "3. Processamento",
      "wizard.back": "← Voltar",

      "form.location": "Localização e Limites",
      "form.lat": "Latitude",
      "form.lon": "Longitude",
      "form.crop": "Tipo de Cultura",
      "form.crop.soy": "🌱 Soja",
      "form.crop.corn": "🌽 Milho",
      "form.crop.wheat": "🌾 Trigo",
      "form.size": "Tamanho (Hectares)",
      "form.duration": "Duração da Cobertura (dias)",
      "form.region": "Código da Região",

      "quote.maxCoverage": "Cobertura Máxima",
      "quote.premiumRate": "Taxa de Prêmio",
      "quote.totalDue": "Prêmio Total Devido",
      "quote.oracleConf": "Confiança dos Dados",
      "quote.confVia": "confiança via consenso de múltiplas fontes",

      "triggers.title": "Gatilhos de Pagamento (14+ dias consecutivos):",
      "triggers.partial": "Índice de Seca > 70:",
      "triggers.partial.text": "50% Pagamento Parcial",
      "triggers.full": "Índice de Seca > 85:",
      "triggers.full.text": "100% Pagamento Total",

      "btn.quote": "Obter Cotação →",
      "btn.approving": "⏳ Aprovando USDC…",
      "btn.signing": "⏳ Assinando Apólice…",
      "btn.active": "✓ Apólice Ativa",
      "btn.signAndPay": "Assinar e Pagar",
      "msg.protected": "Sua fazenda está protegida 🌱",
      "app.agentStatus": "● AGENTE_APRA-1_ATIVO",
      "app.dataSource": "FONTE_DE_DADOS: OPEN_METEO_SAT",
      "quote.agentVerified": "AGENTE APRA-1 VERIFICADO"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
