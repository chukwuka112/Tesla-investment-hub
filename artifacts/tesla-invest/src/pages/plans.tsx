import { useLocation } from "wouter";
import { useGetPlans, getGetPlansQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Zap, Clock, TrendingUp, ArrowRight, ShieldCheck } from "lucide-react";

const PLAN_GRADIENTS = [
  "from-zinc-900 via-zinc-800 to-zinc-900",
  "from-zinc-900 via-blue-950 to-zinc-900",
  "from-zinc-900 via-violet-950 to-zinc-900",
  "from-zinc-900 via-amber-950 to-zinc-900",
  "from-zinc-900 via-red-950 to-zinc-900",
];

const BADGE_COLORS = [
  "bg-green-500/20 text-green-400 border-green-500/30",
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "bg-red-500/20 text-red-400 border-red-500/30",
];

const PLAN_EMOJIS = ["🚗", "🚙", "🏎", "⚡", "🔥"];

export default function Plans() {
  const [, setLocation] = useLocation();
  const { token } = useAuth();

  const { data: plans, isLoading } = useGetPlans({
    query: { enabled: !!token, queryKey: getGetPlansQueryKey() },
  });

  const activePlans = plans?.filter((p) => p.status === "active") || [];

  const formatMax = (n: number) => (n >= 999999 ? "$1,000+" : `$${n.toLocaleString()}`);
  const formatMin = (n: number) => `$${n.toLocaleString()}`;

  return (
    <MobileLayout title="INVESTMENT PLANS">
      <div className="px-4 pb-8 pt-2 space-y-5">
        <div className="text-center pb-1">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Choose your vehicle · All plans run 7 days
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[400px] w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {activePlans.map((plan, idx) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br ${PLAN_GRADIENTS[idx % PLAN_GRADIENTS.length]} shadow-xl group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl`}
                onClick={() => setLocation(`/invest/${plan.id}`)}
              >
                {/* ROI Badge */}
                <div className="absolute top-4 right-4 z-20">
                  <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold tracking-wider ${BADGE_COLORS[idx % BADGE_COLORS.length]}`}>
                    <TrendingUp className="h-3 w-3" />
                    {plan.roi_percentage}% PROFIT
                  </div>
                </div>

                {/* Emoji */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="text-2xl">{PLAN_EMOJIS[idx % PLAN_EMOJIS.length]}</span>
                </div>

                {/* Tesla Image */}
                <div className="relative h-52 w-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent z-10" />
                  <img
                    src={plan.image_url || "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80"}
                    alt={plan.model_name || plan.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-4">
                    <h3 className="font-display text-2xl font-black tracking-wider text-white uppercase leading-none">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-white/60 uppercase tracking-widest mt-0.5">
                      {plan.model_name}
                    </p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-5 pt-4 pb-5">
                  <p className="text-sm text-white/50 mb-5 leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-xl py-3">
                      <Zap className="h-4 w-4 text-yellow-400 mb-1" />
                      <span className="font-mono text-base font-bold text-white">{plan.roi_percentage}%</span>
                      <span className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">Profit</span>
                    </div>
                    <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-xl py-3">
                      <Clock className="h-4 w-4 text-blue-400 mb-1" />
                      <span className="font-mono text-base font-bold text-white">{plan.duration_days}</span>
                      <span className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">Days</span>
                    </div>
                    <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-xl py-3">
                      <ShieldCheck className="h-4 w-4 text-green-400 mb-1" />
                      <span className="font-mono text-base font-bold text-white">{formatMin(plan.min_amount)}</span>
                      <span className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">Min</span>
                    </div>
                  </div>

                  {/* Deposit Range */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <span className="text-xs text-white/40 uppercase tracking-wider">Deposit Range</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {formatMin(plan.min_amount)} – {formatMax(plan.max_amount)}
                    </span>
                  </div>

                  {/* CTA */}
                  <button
                    className="w-full flex items-center justify-center gap-2 bg-[#CC0000] hover:bg-[#E60000] active:bg-[#AA0000] text-white font-display font-bold uppercase tracking-widest text-sm h-12 rounded-xl transition-all duration-200 shadow-lg shadow-red-900/30 hover:shadow-red-900/50"
                    onClick={(e) => { e.stopPropagation(); setLocation(`/invest/${plan.id}`); }}
                  >
                    INVEST NOW
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            ))}

            {activePlans.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Zap className="h-10 w-10 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No investment plans currently available.</p>
              </div>
            )}
          </div>
        )}

        {activePlans.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[11px] text-white/30 text-center leading-relaxed">
              Invest responsibly. All investments involve risk. Past performance does not guarantee future results.
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
