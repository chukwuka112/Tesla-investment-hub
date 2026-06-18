import { useState } from "react";
import { useGetReferrals, getGetReferralsQueryKey, useGetReferralLeaderboard, getGetReferralLeaderboardQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Users, Copy, CheckCircle2, Share2, Award, Trophy } from "lucide-react";

export default function Team() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: referralData, isLoading: loadRef } = useGetReferrals({
    query: { enabled: !!token, queryKey: getGetReferralsQueryKey() }
  });

  const { data: leaderboard, isLoading: loadLead } = useGetReferralLeaderboard({
    query: { enabled: !!token, queryKey: getGetReferralLeaderboardQueryKey() }
  });

  const copyLink = () => {
    if (!referralData?.referral_link) return;
    navigator.clipboard.writeText(referralData.referral_link);
    setCopied(true);
    toast({ title: "Link Copied" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loadRef || loadLead) {
    return (
      <MobileLayout title="NETWORK">
        <div className="p-4 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="NETWORK">
      <div className="p-4 space-y-6">
        
        {/* Earnings Card */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 overflow-hidden relative">
          <div className="absolute right-0 top-0 w-32 h-32 bg-accent/10 rounded-full blur-[50px]" />
          <CardContent className="p-6 relative z-10">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Network Earnings</p>
            <h3 className="font-display text-4xl font-bold text-accent mb-6">
              ${referralData?.total_earnings?.toFixed(2) || '0.00'}
            </h3>

            <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-4">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Level 1</p>
                <p className="font-display font-bold text-lg">{referralData?.level1_count || 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Level 2</p>
                <p className="font-display font-bold text-lg">{referralData?.level2_count || 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Level 3</p>
                <p className="font-display font-bold text-lg">{referralData?.level3_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invite Link */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Invite Link</h3>
          <div className="flex items-center gap-2 bg-card p-3 rounded-lg border border-border">
            <div className="flex-1 overflow-hidden">
              <p className="text-xs text-muted-foreground truncate">{referralData?.referral_link}</p>
            </div>
            <button 
              onClick={copyLink}
              className="p-2 bg-background rounded-md hover:bg-white/5 transition-colors shrink-0"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
            <button 
              className="p-2 bg-primary text-primary-foreground rounded-md transition-colors shrink-0"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Tabs defaultValue="direct" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4 bg-card border border-border h-12">
            <TabsTrigger value="direct" className="font-display tracking-wider uppercase text-xs">Direct</TabsTrigger>
            <TabsTrigger value="leaderboard" className="font-display tracking-wider uppercase text-xs">Top Earners</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-3">
            {referralData?.referrals && referralData.referrals.length > 0 ? (
              referralData.referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{ref.full_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Level {ref.level}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-bold text-accent">+${ref.earnings.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Earned</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 rounded-lg border border-dashed border-border bg-card/20">
                <Award className="mx-auto h-8 w-8 text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">No active referrals yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-3">
            {leaderboard && leaderboard.length > 0 ? (
              leaderboard.map((entry, idx) => (
                <div key={entry.user_id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border/50 relative overflow-hidden">
                  {idx === 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
                  {idx === 1 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-400" />}
                  {idx === 2 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-700" />}
                  
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center font-display font-bold border border-border">
                      {idx < 3 ? <Trophy className={`h-4 w-4 ${idx===0?'text-accent':idx===1?'text-gray-400':'text-amber-700'}`} /> : idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{entry.full_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{entry.total_referrals} invites</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-bold text-accent">${entry.total_earnings.toFixed(2)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 rounded-lg border border-dashed border-border bg-card/20">
                <p className="text-sm text-muted-foreground">No leaderboard data</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

      </div>
    </MobileLayout>
  );
}
