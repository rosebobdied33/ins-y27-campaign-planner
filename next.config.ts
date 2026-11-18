import type { NextConfig } from 'next';
const basePath=process.env.PLANNER_BASE_PATH || '';
const config: NextConfig = {
  output:'export', basePath, env:{NEXT_PUBLIC_PLANNER_BASE_PATH:basePath}, trailingSlash:true, turbopack:{root:process.cwd()},
  devIndicators:false, poweredByHeader:false, agentRules:false,
};
export default config;
