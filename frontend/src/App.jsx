import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import CreatePolicyPage from "./pages/CreatePolicyPage";
import PoliciesPage     from "./pages/PoliciesPage";
import LPDashboardPage  from "./pages/LPDashboardPage";
import TxToast          from "./components/TxToast";
import "./index.css";

function App() {
  const { t, i18n } = useTranslation();
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState("create");
  const [toast, setToast] = useState({ message: "", kind: "info" });

  const TABS = [
    { id: "create",   label: t('app.title', 'CREATE_POLICY') },
    { id: "policies", label: "MY_REGISTRY"   },
    { id: "lp",       label: "LIQUIDITY_VAULT" },
  ];

  const showToast = useCallback((message, kind = "info") => {
    setToast({ message, kind });
  }, []);

  const clearToast = useCallback(() => {
    setToast({ message: "", kind: "info" });
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] selection:bg-[#FF5733] selection:text-white font-sans antialiased">
      
      {/* Structural Header */}
      <header className="sticky top-0 z-40 bg-[#FDFCFB] border-b-4 border-[#1A1A1A]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="bg-[#1A1A1A] text-[#FDFCFB] p-2 font-black text-xl leading-none">
              D_
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none">
                {t('app.title')}
              </h1>
              <p className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest mt-1">
                {t('app.subtitle')} • PROTOCOL_V1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <select 
                className="bg-transparent border-b-2 border-[#1A1A1A] text-[10px] font-black uppercase tracking-widest py-1 pr-4 outline-none cursor-pointer appearance-none hover:text-[#FF5733] hover:border-[#FF5733] transition-colors"
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
              >
                <option value="en">EN_US</option>
                <option value="es">ES_AR</option>
                <option value="pt">PT_BR</option>
              </select>
            </div>
            {/* Wrapping Connect Button to force alignment with the theme */}
            <div className="brutalist-connect">
              <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        
        {/* Tab Navigation: Brutalist Segmented Control */}
        <nav
          className="flex flex-wrap border-2 border-[#1A1A1A] p-0 bg-[#1A1A1A]/5"
          role="tablist"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[140px] py-4 px-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all
                ${activeTab === tab.id
                  ? "bg-[#1A1A1A] text-[#FDFCFB]"
                  : "text-[#1A1A1A]/50 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5 border-r border-[#1A1A1A]/10 last:border-r-0"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Page Content Area */}
        <div className="min-h-[500px]">
          {activeTab === "create"   && <CreatePolicyPage onToast={showToast} />}
          {activeTab === "policies" && <PoliciesPage     onToast={showToast} />}
          {activeTab === "lp"       && <LPDashboardPage  onToast={showToast} />}
        </div>

        {/* Footer / Debug Section: Styled as a Technical Appendix */}
        <footer className="pt-20 pb-10 border-t border-[#1A1A1A]/10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="max-w-xs">
              <p className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase leading-loose tracking-widest">
                This interface is a direct access portal to the on-chain insurance vault. 
                All transactions are final and verified via the Avalanche C-Chain.
              </p>
            </div>

            {import.meta.env.DEV && (
              <details className="w-full md:w-auto bg-[#1A1A1A] text-[#FDFCFB] p-4 group">
                <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.3em] list-none flex justify-between items-center">
                  SYSTEM_PARAMETERS
                  <span className="group-open:rotate-180 transition-transform">↓</span>
                </summary>
                <div className="mt-4 space-y-2 font-mono text-[9px] border-t border-white/20 pt-4 opacity-70 uppercase tracking-tighter">
                  <div className="flex justify-between gap-8"><span>VAULT_ADDR</span> <span className="break-all">{import.meta.env.VITE_POLICY_VAULT_ADDRESS}</span></div>
                  <div className="flex justify-between gap-8"><span>POOL_ADDR</span> <span className="break-all">{import.meta.env.VITE_LIQUIDITY_POOL_ADDRESS}</span></div>
                  <div className="flex justify-between gap-8"><span>ASSET_USDC</span> <span className="break-all">{import.meta.env.VITE_USDC_ADDRESS}</span></div>
                </div>
              </details>
            )}
          </div>
        </footer>
      </main>

      {/* Global Toast Notification */}
      <TxToast message={toast.message} kind={toast.kind} onClose={clearToast} />

      {/* Global Theme Overrides for Third-Party Components */}
      <style dangerouslySetInnerHTML={{ __html: `
        .brutalist-connect button {
          background: #1A1A1A !important;
          border-radius: 0px !important;
          color: #FDFCFB !important;
          font-family: ui-sans-serif, system-ui !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          font-size: 10px !important;
          border: 2px solid #1A1A1A !important;
          box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.1) !important;
        }
        .brutalist-connect button:hover {
          background: #FF5733 !important;
          border-color: #1A1A1A !important;
          transform: translate(-2px, -2px) !important;
          box-shadow: 6px 6px 0px 0px rgba(0,0,0,1) !important;
        }
      `}} />
    </div>
  );
}

export default App;