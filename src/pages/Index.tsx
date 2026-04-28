import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Beaker, Clock, LogOut, ShieldCheck, Droplet, ArrowRightLeft, Baby } from "lucide-react";
import { AdmixtureCalculator } from "@/components/AdmixtureCalculator";
import { InfusionCalculator } from "@/components/InfusionCalculator";
import { FluidDurationCalculator } from "@/components/FluidDurationCalculator";
import { UnitConverter } from "@/components/UnitConverter";
import { PediatricLiquidCalculator } from "@/components/PediatricLiquidCalculator";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Navigate, useNavigate } from "react-router-dom";
import { LangSwitcher } from "@/components/LangSwitcher";
import { MessageInbox } from "@/components/MessageInbox";

const Index = () => {
  const { member, setMember, logActivity } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();

  if (!member) return <Navigate to="/login" replace />;

  const signOut = async () => {
    await logActivity("logout");
    setMember(null);
    nav("/login");
  };

  return (
    <div className="min-h-screen bg-clinical-bg">
      <header className="border-b border-slate-200 bg-white no-print">
        <div className="container max-w-6xl py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand text-brand-foreground grid place-items-center">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t("appName")}</h1>
              <p className="text-xs text-slate-500">{t("tagline")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right mr-2">
              <div className="text-xs text-slate-500">{t("welcome")}</div>
              <div className="text-sm font-semibold">
                {member.display_name}{" "}
                <span className="text-slate-400 font-mono text-xs">#{member.employee_id}</span>
              </div>
            </div>
            <LangSwitcher />
            <MessageInbox />
            <Button variant="outline" size="sm" onClick={() => nav("/admin/login")} title={t("admin")}>
              <ShieldCheck className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> {t("logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl py-6 sm:py-10">
        <Tabs
          defaultValue="admixture"
          className="w-full"
          onValueChange={(v) => logActivity("open_tab", { tab: v })}
        >
          <TabsList className="h-auto grid w-full max-w-3xl grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6 no-print">
            <TabsTrigger value="admixture" className="gap-2">
              <Beaker className="h-4 w-4" /> {t("admixture")}
            </TabsTrigger>
            <TabsTrigger value="infusion" className="gap-2">
              <Clock className="h-4 w-4" /> {t("infusionTime")}
            </TabsTrigger>
            <TabsTrigger value="fluid" className="gap-2">
              <Droplet className="h-4 w-4" /> {t("fluidDuration")}
            </TabsTrigger>
            <TabsTrigger value="convert" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" /> {t("unitConvert")}
            </TabsTrigger>
            <TabsTrigger value="pediatric" className="gap-2">
              <Baby className="h-4 w-4" /> {t("pediatricLiquid")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="admixture"><AdmixtureCalculator /></TabsContent>
          <TabsContent value="infusion"><InfusionCalculator /></TabsContent>
          <TabsContent value="fluid"><FluidDurationCalculator /></TabsContent>
          <TabsContent value="convert"><UnitConverter /></TabsContent>
          <TabsContent value="pediatric"><PediatricLiquidCalculator /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
