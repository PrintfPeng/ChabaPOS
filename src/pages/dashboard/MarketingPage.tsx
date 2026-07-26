import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBranch } from '../../hooks/useBranches';
import { Loader2, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import MembersPage from './members/MembersPage';
import PromotionList from './promotions/PromotionList';

export default function MarketingPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'members';

  const { branch, isLoading } = useBranch(Number(branchId));

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl pb-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            โปรโมชั่นและสมาชิก
          </h1>
          <p className="text-slate-500 text-sm mt-1">จัดการแคมเปญโปรโมชั่น ส่วนลด และฐานข้อมูลสมาชิกของสาขา {branch?.name}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100/80 p-1 rounded-xl mb-6">
          <TabsTrigger value="members" className="font-bold text-sm py-2">จัดการสมาชิก</TabsTrigger>
          <TabsTrigger value="promotions" className="font-bold text-sm py-2">จัดการโปรโมชั่น</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-0">
          <MembersPage />
        </TabsContent>

        <TabsContent value="promotions" className="mt-0">
          <PromotionList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
