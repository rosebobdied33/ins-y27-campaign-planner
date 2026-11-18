import './styles.css';
export const metadata = {
  title: 'INS LAND · 年度规划工作台',
  description: 'INS LAND 2027 年度活动规划',
  robots: { index: false, follow: false },
};
export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="zh-CN"><head><link rel="preload" as="fetch" href={(process.env.PLANNER_BASE_PATH||'')+'/dreamscape/world-c32b6bc78376.glb'} crossOrigin="anonymous"/></head><body>{children}</body></html>;
}
