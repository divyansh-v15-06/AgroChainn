import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider, http } from "wagmi";
import { avalanche, avalancheFuji, hardhat } from "wagmi/chains";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";
import "./i18n"; // Import global i18n configuration

const queryClient = new QueryClient();

const wagmiConfig = getDefaultConfig({
  appName: "AgroChain",
  projectId: "b2d28717804961d1ea178b53215f9b40", 
  chains: [avalancheFuji, avalanche, hardhat],
  transports: {
    [avalancheFuji.id]: http("https://api.avax-test.network/ext/bc/C/rpc"),
    [avalanche.id]: http("https://api.avax.network/ext/bc/C/rpc"),
    [hardhat.id]: http("http://127.0.0.1:8545")
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

