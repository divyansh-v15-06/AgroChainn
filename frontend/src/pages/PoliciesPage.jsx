import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatUnits } from "viem";
import policyVaultAbi from "../abi/PolicyVault.json";

const POLICY_VAULT = import.meta.env.VITE_POLICY_VAULT_ADDRESS;

/** Status badge: Tactile, high-contrast labels */
function StatusBadge({ active, claimed, claimable, severity }) {
  if (!active) return <span className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A]/30 border border-[#1A1A1A]/10 px-2 py-1">⬒ Closed</span>;
  if (claimed) {
    const isPartial = severity === 1;
    return <span className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A]/50 border border-[#1A1A1A] px-2 py-1 bg-[#1A1A1A]/5">Claimed_{isPartial ? "50%" : "100%"}</span>;
  }
  if (claimable) {
    const isPartial = severity === 1;
    return <span className="text-[10px] font-black uppercase tracking-widest bg-[#1A1A1A] text-[#FDFCFB] px-2 py-1 animate-pulse">● Claim_Ready_{isPartial ? "50" : "100"}</span>;
  }
  return <span className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] border-2 border-[#1A1A1A] px-2 py-1">● Active_Policy</span>;
}

/** Single policy entry: Designed like a stamped certificate */
function PolicyCard({ policyId, userAddress, onToast }) {
  const { data: policy } = useReadContract({
    address: POLICY_VAULT,
    abi: policyVaultAbi.abi,
    functionName: "policies",
    args: [BigInt(policyId)],
    query: { refetchInterval: 15_000 },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  if (!policy) {
    return (
      <div className="bg-white border border-[#1A1A1A]/10 p-6 h-40 animate-pulse" />
    );
  }

  const [
    farmer, crop, farmSizeHectares, premiumRaw, coverageRaw, startTime, endTime, 
    lat, lon, threshold, active, claimed, claimable, severity, regionCodeRaw, triggerStart
  ] = policy;

  if (farmer.toLowerCase() !== userAddress.toLowerCase()) return null;

  const coverage  = formatUnits(coverageRaw, 6);
  const premium   = formatUnits(premiumRaw, 6);
  const now       = Math.floor(Date.now() / 1000);
  const daysLeft  = Math.max(0, Math.ceil((Number(endTime) - now) / 86400));
  const region    = hexToString(regionCodeRaw);
  const cropStr   = crop === 0 ? "Soybean_Unit" : crop === 1 ? "Corn_Unit" : "Wheat_Unit";
  const payoutAmt = severity === 1 ? Number(coverage)/2 : Number(coverage);

  async function handleClaim() {
    try {
      onToast("Processing redemption...", "info");
      await writeContractAsync({
        address: POLICY_VAULT,
        abi: policyVaultAbi.abi,
        functionName: "claimPayout",
        args: [BigInt(policyId)],
      });
      onToast(`Successfully claimed $${payoutAmt}`, "success");
    } catch (err) {
      onToast(err.shortMessage || err.message, "error");
    }
  }

  return (
    <div className="bg-white border-2 border-[#1A1A1A] p-6 hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <span className="text-[9px] font-black text-[#1A1A1A]/40 uppercase tracking-[0.2em] block mb-1">Contract_No. {policyId.toString().padStart(4, '0')}</span>
          <h3 className="text-xl font-black text-[#1A1A1A] uppercase tracking-tighter italic">{cropStr}</h3>
          <p className="text-[11px] font-bold text-[#1A1A1A]/60 mt-1 uppercase tracking-wider">{region || "Unspecified_Region"} • {Number(farmSizeHectares)} Hectares</p>
        </div>
        <StatusBadge active={active} claimed={claimed} claimable={claimable} severity={severity} />
      </div>

      {triggerStart > 0n && !claimable && !claimed && (
         <div className="mb-6 border-l-4 border-[#FF5733] bg-[#FF5733]/5 p-3">
           <div className="flex justify-between items-center mb-2">
             <span className="text-[10px] font-black uppercase text-[#FF5733]">Drought_Threshold_Warning</span>
             <span className="text-[10px] font-mono font-bold text-[#FF5733]">{Math.min(14, Math.max(0, Math.floor((now - Number(triggerStart)) / 86400)))}/14D</span>
           </div>
           <div className="flex gap-1 h-1.5">
             {Array.from({ length: 14 }).map((_, i) => (
               <div 
                 key={i} 
                 className={`flex-1 ${i < Math.floor((now - Number(triggerStart)) / 86400) ? 'bg-[#FF5733]' : 'bg-[#FF5733]/20'}`}
               />
             ))}
           </div>
         </div>
      )}

      <div className="grid grid-cols-3 border-t border-[#1A1A1A] pt-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#1A1A1A]/40">Coverage</p>
          <p className="text-sm font-black text-[#1A1A1A] font-mono">${Number(coverage).toLocaleString()}</p>
        </div>
        <div className="border-x border-[#1A1A1A]/10 px-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#1A1A1A]/40">Premium</p>
          <p className="text-sm font-bold text-[#1A1A1A] font-mono">${premium}</p>
        </div>
        <div className="pl-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#1A1A1A]/40">Expiry</p>
          <p className={`text-sm font-black font-mono ${daysLeft < 7 ? "text-[#FF5733]" : "text-[#1A1A1A]"}`}>{daysLeft} Days</p>
        </div>
      </div>

      {claimable && !claimed && (
        <button
          onClick={handleClaim}
          disabled={isPending}
          className="w-full mt-6 bg-[#1A1A1A] text-[#FDFCFB] py-4 text-[11px] font-black uppercase tracking-[0.3em] hover:bg-[#FF5733] transition-colors disabled:opacity-20"
        >
          {isPending ? "Executing_Payout..." : `Redeem_Payout $${payoutAmt}`}
        </button>
      )}
    </div>
  );
}

/** Bytes to String: Clean helper */
function hexToString(bytes32) {
  try {
    const hex = bytes32.replace("0x", "").replace(/00+$/, "");
    return Buffer.from(hex, "hex").toString("utf8");
  } catch { return ""; }
}

export default function PoliciesPage({ onToast }) {
  const { address, isConnected } = useAccount();

  const { data: nextId } = useReadContract({
    address: POLICY_VAULT,
    abi: policyVaultAbi.abi,
    functionName: "nextPolicyId",
    query: { refetchInterval: 10_000 },
  });

  if (!isConnected) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-[#1A1A1A]/20">
        <p className="text-xs font-black uppercase tracking-[0.4em] text-[#1A1A1A]/40">
          Wallet_Not_Connected
        </p>
      </div>
    );
  }

  const total = nextId ? Number(nextId) - 1 : 0;

  return (
    <section className="space-y-10">
      <div className="flex items-baseline justify-between border-b-4 border-[#1A1A1A] pb-4">
        <h2 className="text-3xl font-black text-[#1A1A1A] uppercase tracking-tighter">My_Registry</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/40">Verified_Entries: {total}</span>
      </div>

      {total === 0 ? (
        <div className="py-24 text-center bg-[#1A1A1A]/5 border-2 border-[#1A1A1A]">
          <p className="text-xs font-black uppercase tracking-widest text-[#1A1A1A]/60">
            No active policies found in registry.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: total }, (_, i) => (
            <PolicyCard
              key={i + 1}
              policyId={i + 1}
              userAddress={address}
              onToast={onToast}
            />
          ))}
        </div>
      )}
    </section>
  );
}