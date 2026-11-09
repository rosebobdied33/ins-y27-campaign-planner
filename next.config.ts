import type { NextConfig } from 'next';
const basePath=process.env.PLANNER_BASE_PATH || '';
const config: NextConfig = {
  output:'export', basePath, trailingSlash:true, turbopack:{root:process.cwd()},
  devIndicators:false, poweredByHeader:false, agentRules:false,
};
export default config;
