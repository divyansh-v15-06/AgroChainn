const fs = require('fs');
const path = require('path');

/**
 * 🔄 AgroChain Environment Synchronizer
 * 
 * This script pulls data from contracts/deployments.json and 
 * automatically updates the .env files for the Frontend and Oracle Relay.
 */

const deploymentsPath = path.join(__dirname, 'contracts/deployments.json');
const frontendEnvPath = path.join(__dirname, 'frontend/.env.local');
const oracleEnvPath = path.join(__dirname, 'oracle-relay/.env');
const rootEnvPath = path.join(__dirname, '.env');

if (!fs.existsSync(deploymentsPath)) {
    console.error('❌ Error: contracts/deployments.json not found. Did you run deploy.js correctly?');
    process.exit(1);
}

const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

// Helper to update or append to .env content
function updateEnvContent(content, key, value) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    const newLine = `${key}=${value}`;
    if (regex.test(content)) {
        return content.replace(regex, newLine);
    } else {
        return content + (content.endsWith('\n') ? '' : '\n') + newLine + '\n';
    }
}

// 1. Update Frontend (.env.local)
if (fs.existsSync(frontendEnvPath)) {
    let content = fs.readFileSync(frontendEnvPath, 'utf8');
    content = updateEnvContent(content, 'VITE_POLICY_VAULT_ADDRESS', deployments.policyVault);
    content = updateEnvContent(content, 'VITE_LIQUIDITY_POOL_ADDRESS', deployments.liquidityPool);
    content = updateEnvContent(content, 'VITE_ORACLE_CONSUMER_ADDRESS', deployments.oracle);
    content = updateEnvContent(content, 'VITE_USDC_ADDRESS', deployments.usdc);
    content = updateEnvContent(content, 'VITE_REINSURANCE_POOL_ADDRESS', deployments.reinsurancePool);
    fs.writeFileSync(frontendEnvPath, content);
    console.log('✅ frontend/.env.local synchronized.');
} else {
    console.warn('⚠️ Warning: frontend/.env.local not found. Skipping.');
}

// 2. Update Oracle Relay (.env)
if (fs.existsSync(oracleEnvPath)) {
    let content = fs.readFileSync(oracleEnvPath, 'utf8');
    content = updateEnvContent(content, 'ORACLE_CONSUMER_ADDRESS', deployments.oracle);
    content = updateEnvContent(content, 'POLICY_VAULT_ADDRESS', deployments.policyVault);
    fs.writeFileSync(oracleEnvPath, content);
    console.log('✅ oracle-relay/.env synchronized.');
} else {
    console.warn('⚠️ Warning: oracle-relay/.env not found. Skipping.');
}

// 3. Update Root (.env)
if (fs.existsSync(rootEnvPath)) {
    let content = fs.readFileSync(rootEnvPath, 'utf8');
    content = updateEnvContent(content, 'ORACLE_CONSUMER_ADDRESS', deployments.oracle);
    content = updateEnvContent(content, 'POLICY_VAULT_ADDRESS', deployments.policyVault);
    content = updateEnvContent(content, 'LIQUIDITY_POOL_ADDRESS', deployments.liquidityPool);
    content = updateEnvContent(content, 'USDC_ADDRESS', deployments.usdc);
    fs.writeFileSync(rootEnvPath, content);
    console.log('✅ .env (root) synchronized.');
}

console.log('\n🚀 ALL SYSTEMS SYNCHRONIZED. You are ready for the "Golden Cut".');
