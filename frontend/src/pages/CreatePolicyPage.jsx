import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, usePublicClient } from "wagmi";
import { stringToHex, parseUnits } from "viem";
import { useTranslation } from "react-i18next";
import policyVaultAbi from "../abi/PolicyVault.json";
import erc20Abi from "../abi/ERC20.json";
import FarmMapPicker from "../components/FarmMapPicker";

const POLICY_VAULT  = import.meta.env.VITE_POLICY_VAULT_ADDRESS;
const USDC_ADDRESS  = import.meta.env.VITE_USDC_ADDRESS;
const ORACLE_CONSUMER = import.meta.env.VITE_ORACLE_CONSUMER_ADDRESS;

import oracleAbi from "../abi/OracleConsumer.json";

export default function CreatePolicyPage({ onToast }) {
  const { t } = useTranslation();
  const { isConnected } = useAccount();
  const [crop,         setCrop]         = useState("0"); 
  const [hectares,     setHectares]     = useState("5");
  const [durationDays, setDurationDays] = useState("30");
  const [region,       setRegion]       = useState("AR-CBA");
  const [wizardStep,   setWizardStep]   = useState(1); 
  const [txState,      setTxState]      = useState("idle");
  const [farmLat,      setFarmLat]      = useState(-31.4);
  const [farmLon,      setFarmLon]      = useState(-64.2);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: oracleData } = useReadContract({
    address: ORACLE_CONSUMER,
    abi: oracleAbi.abi,
    functionName: "droughtByRegion",
    args: [stringToHex(region, { size: 32 })],
    query: { refetchInterval: 10_000, enabled: !!ORACLE_CONSUMER },
  });

  let confidenceStr = "—";
  let confidenceIcon = "";
  if (oracleData && oracleData[3] !== undefined) {
    const conf = Number(oracleData[3]);
    if (conf === 0) { confidenceStr = "Low"; confidenceIcon = "○"; }
    else if (conf === 1) { confidenceStr = "Medium"; confidenceIcon = "△"; }
    else { confidenceStr = "High"; confidenceIcon = "●"; }
  }

  function updateRegionFromGPS(lat, lon) {
    if (lat < -20 && lat > -40 && lon > -70 && lon < -60) setRegion("AR-CBA");
    else if (lat > -20 && lat < 5 && lon > -60 && lon < -40) setRegion("BR-SP");
    else if (lat > 15 && lat < 30 && lon > -115 && lon < -100) setRegion("MX-SO");
    else if (lat > 0 && lat < 10 && lon > -80 && lon < -70) setRegion("CO-HU");
  }

  const maxCoveragePerHa = 1000;
  const coverageUSD = Number(hectares) * maxCoveragePerHa;
  let premiumRatePercent = 0;
  if (crop === "0") premiumRatePercent = 2.5;
  if (crop === "1") premiumRatePercent = 3.0;
  if (crop === "2") premiumRatePercent = 2.0;

  let riskScore = 100;
  if (oracleData && oracleData[2] !== undefined) {
    riskScore = Number(oracleData[2]);
    if (riskScore === 0) riskScore = 100; 
  }

  const premiumUSD = ((coverageUSD * premiumRatePercent) / 100) * (riskScore / 100);

  async function handleCreate(e) {
    e.preventDefault();
    if (wizardStep === 1) return setWizardStep(2);

    if (!POLICY_VAULT || !USDC_ADDRESS) {
      onToast("VITE_POLICY_VAULT_ADDRESS or VITE_USDC_ADDRESS not set", "error");
      return;
    }

    const premiumAmount  = parseUnits(premiumUSD.toFixed(6), 6);
    const duration       = BigInt(Number(durationDays) * 24 * 60 * 60);
    const regionBytes32  = stringToHex(region, { size: 32 });

    try {
      setWizardStep(3);
      setTxState("approving");
      onToast(t('btn.approving'), "info");
      const approveHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi:     erc20Abi.abi,
        functionName: "approve",
        args: [POLICY_VAULT, premiumAmount],
      });
      
      onToast("Waiting for approval...", "info");
      await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 });

      setTxState("creating");
      onToast(t('btn.signing'), "info");
      await writeContractAsync({
        address: POLICY_VAULT,
        abi:     policyVaultAbi.abi,
        functionName: "createPolicy",
        args: [{
          crop: Number(crop),
          farmSizeHectares: Number(hectares),
          lat: Math.round(farmLat * 1e6),
          lon: Math.round(farmLon * 1e6),
          duration: duration,
          regionCode: regionBytes32
        }],
      });

      setTxState("done");
      onToast(t('msg.protected'), "success");
    } catch (err) {
      console.error(err);
      onToast(err.shortMessage || err.message || "Transaction failed", "error");
      setTxState("idle");
      setWizardStep(2); 
    }
  }

  if (!isConnected) {
    return (
      <p className="text-sm text-[#1A1A1A]/50 py-12 text-center font-medium uppercase tracking-widest">
        {t('nav.connect')}
      </p>
    );
  }

  return (
    <section className="bg-[#FDFCFB] border-2 border-[#1A1A1A] rounded-none p-8 relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
      {/* Progress Indicator - Solid, No Gradients */}
      <div className="absolute top-0 left-0 w-full h-2 bg-[#1A1A1A]/5">
        <div 
          className="h-full bg-[#1A1A1A] transition-all duration-500 ease-in-out" 
          style={{ width: wizardStep === 1 ? "33%" : wizardStep === 2 ? "66%" : "100%" }}
        />
      </div>

      <div className="flex justify-between items-end mb-10 mt-4">
        <div>
          <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[#1A1A1A]/40 block mb-1">Step 0{wizardStep}</span>
          <h2 className="text-2xl font-black text-[#1A1A1A] tracking-tighter uppercase">
            {wizardStep === 1 ? t('wizard.step1') : wizardStep === 2 ? t('wizard.step2') : t('wizard.step3')}
          </h2>
        </div>
        {wizardStep === 2 && (
          <button onClick={() => setWizardStep(1)} className="text-[10px] font-bold uppercase tracking-widest border-b-2 border-[#1A1A1A] hover:text-[#FF5733] hover:border-[#FF5733] transition-colors pb-0.5">
            {t('wizard.back')}
          </button>
        )}
      </div>

      <form onSubmit={handleCreate} className="text-sm">
        
        {/* STEP 1: Details */}
        <div className={`space-y-6 grid md:grid-cols-2 gap-x-8 ${wizardStep !== 1 && "hidden"}`}>
          <div className="flex flex-col gap-2 md:col-span-2">
            <span className="text-[#1A1A1A] text-[11px] uppercase font-bold tracking-widest">{t('form.location')}</span>
            <div className="border border-[#1A1A1A] p-1">
              <FarmMapPicker
                defaultLat={farmLat}
                defaultLon={farmLon}
                onLocationSelected={({ lat, lon }) => { 
                  setFarmLat(lat); 
                  setFarmLon(lon); 
                  updateRegionFromGPS(lat, lon);
                }}
              />
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[#1A1A1A] text-[11px] uppercase font-bold tracking-widest">{t('form.crop')}</span>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="bg-transparent border-b-2 border-[#1A1A1A] rounded-none px-0 py-2 text-[#1A1A1A] font-bold focus:outline-none focus:border-[#FF5733] appearance-none cursor-pointer"
            >
              <option value="0">{t('form.crop.soy')}</option>
              <option value="1">{t('form.crop.corn')}</option>
              <option value="2">{t('form.crop.wheat')}</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[#1A1A1A] text-[11px] uppercase font-bold tracking-widest">{t('form.size')}</span>
            <input
              type="number" min="1" step="0.5" value={hectares}
              onChange={(e) => setHectares(e.target.value)}
              className="bg-transparent border-b-2 border-[#1A1A1A] rounded-none px-0 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#FF5733] font-mono text-lg font-bold"
            />
          </label>
            
          <label className="flex flex-col gap-2">
            <span className="text-[#1A1A1A] text-[11px] uppercase font-bold tracking-widest">{t('form.duration')}</span>
            <input
              id="duration-input"
              type="number" min="1" value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="bg-transparent border-b-2 border-[#1A1A1A] rounded-none px-0 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#FF5733] font-mono text-lg font-bold"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-[#1A1A1A] text-[11px] uppercase font-bold tracking-widest">{t('form.region')}</span>
            <select
              id="region-select"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="bg-transparent border-b-2 border-[#1A1A1A] rounded-none px-0 py-2 text-[#1A1A1A] font-bold focus:outline-none focus:border-[#FF5733] appearance-none cursor-pointer"
            >
              <option value="AR-CBA">AR-CBA — Córdoba, Argentina</option>
              <option value="AR-BA">AR-BA — Buenos Aires, Argentina</option>
              <option value="BR-SP">BR-SP — São Paulo, Brazil</option>
              <option value="MX-SO">MX-SO — Sonora, Mexico</option>
              <option value="CO-HU">CO-HU — Huila, Colombia</option>
            </select>
          </label>
        </div>

        {/* STEP 2 & 3: Quote & Execution */}
        <div className={`space-y-8 ${wizardStep === 1 && "hidden"}`}>
          
          <div className="border-t-4 border-[#1A1A1A] pt-6 space-y-4">
            <div className="flex justify-between items-baseline border-b border-[#1A1A1A]/10 pb-4">
              <span className="text-[#1A1A1A]/60 uppercase text-[10px] font-black tracking-widest">{t('quote.maxCoverage')}</span>
              <span className="text-2xl font-black text-[#1A1A1A] font-mono">${coverageUSD.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-[#1A1A1A]/10 pb-4">
              <span className="text-[#1A1A1A]/60 uppercase text-[10px] font-black tracking-widest">{t('quote.premiumRate')}</span>
              <span className="text-lg font-bold text-[#1A1A1A] font-mono">{premiumRatePercent}%</span>
            </div>
            <div className="flex justify-between items-baseline bg-[#1A1A1A] text-[#FDFCFB] p-4">
              <span className="uppercase text-[10px] font-black tracking-widest">{t('quote.totalDue')}</span>
              <span className="text-3xl font-black font-mono">${premiumUSD.toLocaleString()} <span className="text-xs">USDC</span></span>
            </div>
            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
              <span className="text-[#1A1A1A]/40">{t('quote.oracleConf')}</span>
              <div className="flex items-center gap-2">
                 <span className="bg-[#1A1A1A] text-[#FDFCFB] px-2 py-0.5 font-black text-[9px] tracking-tighter animate-pulse">
                   [●] {t('quote.agentVerified')}
                 </span>
                 <span className="text-[#1A1A1A]/40 font-bold">{confidenceIcon} {confidenceStr}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A]/5 border-l-4 border-[#1A1A1A] p-6 text-[13px] text-[#1A1A1A] leading-relaxed">
            <p className="font-black uppercase tracking-widest mb-3 text-[11px]">{t('triggers.title')}</p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="font-bold border border-[#1A1A1A] px-1 h-fit leading-none">01</span>
                <span>{t('triggers.partial.text')} — <span className="font-bold underline">${(coverageUSD/2).toLocaleString()} Payoff</span></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold border border-[#1A1A1A] px-1 h-fit leading-none">02</span>
                <span>{t('triggers.full.text')} — <span className="font-bold underline">${coverageUSD.toLocaleString()} Payoff</span></span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10">
          {wizardStep === 1 ? (
            <button
              type="button"
              onClick={() => setWizardStep(2)}
              className="w-full bg-[#1A1A1A] text-[#FDFCFB] text-sm font-black uppercase tracking-[0.2em] py-5 hover:bg-[#FF5733] transition-all"
            >
              {t('btn.quote')}
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                id="create-policy-btn"
                type="submit"
                disabled={txState !== "idle" && txState !== "done"}
                className="w-full bg-[#1A1A1A] text-[#FDFCFB] text-sm font-black uppercase tracking-[0.2em] py-5 hover:bg-[#FF5733] disabled:bg-[#1A1A1A]/20 disabled:cursor-not-allowed transition-all"
              >
                {txState === "approving" && "→ Authorizing USDC"}
                {txState === "creating"  && "→ Finalizing Contract"}
                {txState === "done"      && "✓ Policy Active"}
                {txState === "idle"      && `Execute Agreement ($${premiumUSD})`}
              </button>
              {txState === "done" && (
                <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]">{t('msg.protected')}</p>
              )}
            </div>
          )}
        </div>
      </form>
    </section>
  );
}