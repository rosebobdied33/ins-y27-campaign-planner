import './styles.css';
export const metadata = {
  title: 'INS LAND · 年度规划工作台',
  description: 'INS LAND 2027 年度活动规划',
  robots: { index: false, follow: false },
};
export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="zh-CN"><head><link rel="preload" as="image" href={(process.env.PLANNER_BASE_PATH||'')+'/campaign-opening/2027/print-atlas.webp'} fetchPriority="high"/></head><body>{children}</body></html>;
}
