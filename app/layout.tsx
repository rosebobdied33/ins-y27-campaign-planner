import './styles.css';
export const metadata = {
  title: 'INS LAND · 年度规划工作台',
  description: 'INS LAND 2027 年度活动规划',
  robots: { index: false, follow: false },
};
export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
