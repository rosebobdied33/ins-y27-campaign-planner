import './styles.css';
export const metadata = {
  title: 'INS LAND · Campaign Planner',
  description: 'INS LAND / Y27 CAMPAIGN PLANNING',
  robots: { index: false, follow: false },
};
export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
