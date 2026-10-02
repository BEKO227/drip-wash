import PartnerTabs from '@/components/PartnerTabs';
import Guard from '@/components/Guard';
export default function PartnersLayout({ children }) {
  return <Guard role="partner"><main><PartnerTabs />{children}</main></Guard>;
}
