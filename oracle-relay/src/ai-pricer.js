/**
 * AgroChain AI Dynamic Pricer (Simulated Engine)
 * 
 * In a full production environment, this would be a Python-based ML microservice
 * (e.g. XGBoost or RNN) trained on historical climate data, crop yield variance,
 * and regional loss histories.
 *
 * For this MVP, we simulate the "AI inference" using a deterministic
 * weighting of recent precipitation variances, regional baselines, 
 * and crop-specific vulnerabilities to output a final `riskScore` multiplier.
 * 
 * 100 = Baseline risk (1.0x premium multiplier)
 * 150 = 50% higher risk (1.5x premium multiplier)
 *  80 = 20% lower risk (0.8x premium multiplier)
 */

// Baseline historical risk by region (0-100 scale, higher means historically riskier)
const REGION_RISK_BASELINE = {
  "AR-CBA": 65, // Cordoba: Moderate risk, frequent mild droughts
  "AR-BA":  50, // Buenos Aires: Lower risk, more stable rainfall
  "BR-SP":  40, // Sao Paulo: Low drought risk historically
  "MX-SO":  85, // Sonora: Desert/arid, high risk
  "CO-HU":  45, // Huila: Mountainous, moderate risk
};

/**
 * Run the simulated AI risk model for a given region.
 * 
 * @param {string} regionCode - e.g. "AR-CBA"
 * @param {number} currentPrecipScore - Current short-term precipitation deficit (0-100)
 * @param {number} currentNdviProxy - Current vegetation stress (0-100)
 * @returns {number} riskScore - e.g. 100
 */
function inferRiskScore(regionCode, currentPrecipScore, currentNdviProxy) {
  const baseline = REGION_RISK_BASELINE[regionCode] || 50;

  // Simulate an AI model observing recent trends vs baseline:
  // If the current conditions (precip deficit & stress) are much higher than
  // the region's usual baseline, the AI assumes a compound risk effect.
  
  const currentStress = (currentPrecipScore + currentNdviProxy) / 2;
  const stressDeviation = currentStress - baseline;

  // The AI applies a non-linear penalty for extreme deviations
  let aiPenalty = 0;
  if (stressDeviation > 20) {
    aiPenalty = stressDeviation * 1.5; // Exponential-like penalty for sudden extreme drought
  } else if (stressDeviation < -10) {
    aiPenalty = stressDeviation * 0.5; // Mild discount if conditions are better than usual
  }

  // Base multiplier is 100 (1x). We add the baseline/2 and the AI penalty
  // So a region with 50 baseline and 0 deviation scores: 100 + 25 - 25 + 0 = 100.
  let rawRiskScore = 100 + (baseline - 50) * 0.5 + aiPenalty;

  // Clamp the final risk multiplier between 50 (0.5x) and 300 (3.0x)
  const finalRiskScore = Math.min(300, Math.max(50, Math.round(rawRiskScore)));

  console.log(
    `[ai-pricer] Inference for ${regionCode}: Baseline Volatility=${baseline}, Current Stress=${currentStress.toFixed(1)}, AI Penalty=${aiPenalty.toFixed(1)} -> Recommended Risk Mutiplier: ${finalRiskScore / 100}x (${finalRiskScore})`
  );

  return finalRiskScore;
}

module.exports = { inferRiskScore };
