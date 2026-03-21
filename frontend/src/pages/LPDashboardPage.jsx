import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import liquidityPoolAbi from "../abi/LiquidityPool.json";
import reinsurancePoolAbi from "../abi/ReinsurancePool.json";
import erc20Abi from "../abi/ERC20.json";

const LP_ADDRESS   = import.meta.env.VITE_LIQUIDITY_POOL_ADDRESS;
const REINSURANCE_ADDRESS = import.meta.env.VITE_REINSURANCE_POOL_ADDRESS;
const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS;

export default function LPDashboardPage({ onToast }) {
  const { address, isConnected } = useAccount();
  const [stakeAmount,    setStakeAmount]    = useState("100");
  const [withdrawShares, setWithdrawShares] = useState("0");
  const [tab,            setTab]            = useState("stake"); 
  const [subTab,         setSubTab]         = useState("primary"); 

  const { writeContractAsync, isPending } = useWriteContract();

  const { data: poolBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi.abi,
    functionName: "balanceOf",
    args: [LP_ADDRESS],
    query: { refetchInterval: 10_000, enabled: !!LP_ADDRESS },
  });

  const { data: totalShares } = useReadContract({
    address: LP_ADDRESS,
    abi: liquidityPoolAbi.abi,
    functionName: "totalShares",
    query: { refetchInterval: 10_000, enabled: !!LP_ADDRESS },
  });

  const { data: totalLiabilities } = useReadContract({
    address: LP_ADDRESS,
    abi: liquidityPoolAbi.abi,
    functionName: "totalLiabilities",
    query: { refetchInterval: 10_000, enabled: !!LP_ADDRESS },
  });

  const { data: utilizationRate } = useReadContract({
    address: LP_ADDRESS,
    abi: liquidityPoolAbi.abi,
    functionName: "getUtilizationRate",
    query: { refetchInterval: 10_000, enabled: !!LP_ADDRESS },
  });

  const { data: userShares } = useReadContract({
    address: LP_ADDRESS,
    abi: liquidityPoolAbi.abi,
    functionName: "sharesOf",
    args: [address],
    query: { refetchInterval: 10_000, enabled: !!LP_ADDRESS && !!address },
  });

  const { data: userReShares } = useReadContract({
    address: REINSURANCE_ADDRESS,
    abi: reinsurancePoolAbi?.abi,
    functionName: "sharesOf",
    args: [address],
    query: { refetchInterval: 10_000, enabled: !!REINSURANCE_ADDRESS && !!address },
  });

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi.abi,
    functionName: "balanceOf",
    args: [address],
    query: { refetchInterval: 10_000, enabled: !!USDC_ADDRESS && !!address },
  });

  const poolUsdcDisplay  = poolBalance  ? formatUnits(poolBalance, 6)  : "—";
  const activeUserShares = subTab === "primary" ? userShares : userReShares;
  const userShareDisplay = activeUserShares   ? formatUnits(activeUserShares, 6)   : "—";
  const usdcBalDisplay   = usdcBalance  ? formatUnits(usdcBalance, 6)  : "—";

  let userValue = "—";
  if (poolBalance && totalShares && userShares && totalShares > 0n) {
    userValue = formatUnits((poolBalance * userShares) / totalShares, 6);
  }

  async function handleStake(e) {
    e.preventDefault();
    try {
      const amount = parseUnits(stakeAmount, 6);
      const targetAddress = subTab === "primary" ? LP_ADDRESS : REINSURANCE_ADDRESS;
      const targetAbi = subTab === "primary" ? liquidityPoolAbi.abi : reinsurancePoolAbi.abi;
      onToast(`Step 1/2: Authorizing Transfer…`, "info");
      await writeContractAsync({ address: USDC_ADDRESS, abi: erc20Abi.abi, functionName: "approve", args: [targetAddress, amount] });
      onToast(`Step 2/2: Staking into ${subTab} pool…`, "info");
      await writeContractAsync({ address: targetAddress, abi: targetAbi, functionName: "stake", args: [amount] });
      onToast(`Staked $${stakeAmount} USDC successfully!`, "success");
    } catch (err) { onToast(err.shortMessage || err.message, "error"); }
  }

  async function handleWithdraw(e) {
    e.preventDefault();
    try {
      const shares = parseUnits(withdrawShares, 6);
      const targetAddress = subTab === "primary" ? LP_ADDRESS : REINSURANCE_ADDRESS;
      const targetAbi = subTab === "primary" ? liquidityPoolAbi.abi : reinsurancePoolAbi.abi;
      onToast("Processing withdrawal request…", "info");
      await writeContractAsync({ address: targetAddress, abi: targetAbi, functionName: "withdraw", args: [shares] });
      onToast("Withdrawal successful!", "success");
    } catch (err) { onToast(err.shortMessage || err.message, "error"); }
  }

  if (!isConnected) {
    return (
      <p className="text-sm text-[#1A1A1A]/50 py-12 text-center font-bold uppercase tracking-widest">
        Authentication Required • Connect Wallet
      </p>
    );
  }

  return (
    <section className="space-y-8 bg-[#FDFCFB] p-6 border-2 border-[#1A1A1A]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-[#1A1A1A] pb-6">
         <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1A1A1A]/40 block mb-1">Vault_Systems</span>
            <h2 className="text-3xl font-black text-[#1A1A1A] tracking-tighter uppercase">Liquidity Portal</h2>
         </div>
         <div className="flex bg-[#1A1A1A]/5 p-1 border border-[#1A1A1A]">
           <button 
             onClick={() => setSubTab("primary")} 
             className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${subTab === "primary" ? "bg-[#1A1A1A] text-[#FDFCFB]" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]"}`}
           >
             Primary Pool
           </button>
           <button 
             onClick={() => setSubTab("reinsurance")} 
             className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${subTab === "reinsurance" ? "bg-[#1A1A1A] text-[#FDFCFB]" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]"}`}
           >
             Reinsurance
           </button>
         </div>
      </div>

      {/* Stats Grid - Brutalist style */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-0 border-l border-t border-[#1A1A1A]">
        {[
          { label: "Pool TVL", value: `$${Number(poolUsdcDisplay).toLocaleString()}` },
          { label: "Active Liab.", value: `$${totalLiabilities ? Number(formatUnits(totalLiabilities, 6)).toLocaleString() : "0"}` },
          { label: "Utilization", value: utilizationRate ? `${Number(utilizationRate).toFixed(1)}%` : "0%" },
          { label: "Wallet Bal.", value: `$${Number(usdcBalDisplay).toLocaleString()}` },
          { label: "LP Shares", value: Number(userShareDisplay).toFixed(4) },
          { label: "Net Position", value: `$${Number(userValue).toLocaleString()}` },
        ].map(({ label, value }) => (
          <div key={label} className="border-r border-b border-[#1A1A1A] p-4 bg-white hover:bg-[#FDFCFB] transition-colors">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#1A1A1A]/50 mb-1">{label}</p>
            <p className="text-xl font-black text-[#1A1A1A] font-mono tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Operation Tabs */}
      <div className="flex border-2 border-[#1A1A1A]">
        {["stake", "withdraw"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all
              ${tab === t ? "bg-[#1A1A1A] text-[#FDFCFB]" : "bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A]/5"}`}
          >
            {t} Capital
          </button>
        ))}
      </div>

      {tab === "stake" && (
        <form onSubmit={handleStake} className="space-y-6">
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-black uppercase tracking-widest">{('form.amount')} (USDC)</span>
            <div className="relative">
              <input
                type="number" min="1" value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="w-full bg-white border-b-4 border-[#1A1A1A] px-0 py-4 text-4xl font-black focus:outline-none focus:border-[#FF5733] font-mono"
              />
              <span className="absolute right-0 bottom-4 text-sm font-black text-[#1A1A1A]/20 uppercase">USDC_STK</span>
            </div>
          </div>
          <div className="bg-[#1A1A1A]/5 p-4 border-l-4 border-[#1A1A1A]">
            <p className="text-[11px] font-bold leading-relaxed text-[#1A1A1A]/70 uppercase tracking-tight">
              Yield is generated via risk premiums. Capital is utilized to collateralize on-chain drought policies. 
              <span className="block mt-1 font-black text-[#1A1A1A]">Projected APY: Variable based on region risk.</span>
            </p>
          </div>
          <button
            type="submit" disabled={isPending}
            className="w-full py-6 bg-[#1A1A1A] text-[#FDFCFB] font-black uppercase tracking-[0.3em] text-sm hover:bg-[#FF5733] disabled:opacity-20 transition-all"
          >
            {isPending ? "PROCESSING_STAKE..." : `COMMIT $${stakeAmount} TO POOL`}
          </button>
        </form>
      )}

      {tab === "withdraw" && (
        <form onSubmit={handleWithdraw} className="space-y-6">
          <div className="bg-[#1A1A1A] text-[#FDFCFB] p-5">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Withdrawal_Policy</h4>
            {subTab === "primary" ? (
              <p className="text-xs font-bold leading-relaxed uppercase">
                Lock Period: 7 Days post-deposit. <br/>
                Requirement: Pool must maintain &gt;120% Collateral Ratio.
              </p>
            ) : (
              <p className="text-xs font-bold leading-relaxed uppercase">
                Lock Period: 30 Days (Institutional Tier). <br/>
                Role: Tail-risk protection for Primary Vault.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <span className="text-[11px] font-black uppercase tracking-widest">Shares to Redeem</span>
              <button
                type="button"
                onClick={() => setWithdrawShares(userShareDisplay === "—" ? "0" : userShareDisplay)}
                className="text-[10px] font-black uppercase border-b-2 border-[#1A1A1A] hover:text-[#FF5733] hover:border-[#FF5733]"
              >
                Max_Redemption ({userShareDisplay})
              </button>
            </div>
            <input
              type="number" min="0" step="any" value={withdrawShares}
              onChange={(e) => setWithdrawShares(e.target.value)}
              className="w-full bg-white border-b-4 border-[#1A1A1A] px-0 py-4 text-4xl font-black focus:outline-none focus:border-[#FF5733] font-mono"
            />
          </div>

          <button
            type="submit" disabled={isPending}
            className="w-full py-6 bg-[#1A1A1A] text-[#FDFCFB] font-black uppercase tracking-[0.3em] text-sm hover:bg-[#FF5733] disabled:opacity-20 transition-all"
          >
            {isPending ? "PROCESSING_EXIT..." : "REDEEM SHARES"}
          </button>
        </form>
      )}
    </section>
  );
}