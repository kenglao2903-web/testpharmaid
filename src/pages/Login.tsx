import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Activity } from "lucide-react";
import { LangSwitcher } from "@/components/LangSwitcher";

const Login = () => {
  const { t } = useI18n();
  const { setMember } = useAuth();
  const nav = useNavigate();
  const [employeeId, setEid] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(employeeId)) {
      toast.error(t("invalidId"));
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("members")
      .select("id, employee_id, display_name, status")
      .eq("employee_id", employeeId)
      .maybeSingle();
    setLoading(false);
    if (error || !data) {
      toast.error(t("notFound"));
      return;
    }
    if (data.status === "pending") return toast.error(t("pendingApproval"));
    if (data.status === "rejected") return toast.error(t("rejected"));
    const m = { id: data.id, employee_id: data.employee_id, display_name: data.display_name };
    setMember(m);
    await supabase.from("activity_logs").insert([
      {
        member_id: m.id,
        employee_id: m.employee_id,
        display_name: m.display_name,
        action: "login",
        details: null as never,
      },
    ]);
    toast.success(`${t("welcome")}, ${m.display_name}`);
    nav("/");
  };

  return (
    <div className="min-h-screen bg-clinical-bg grid place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-brand text-brand-foreground grid place-items-center">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-bold">{t("appName")}</span>
          </div>
          <LangSwitcher />
        </div>
        <Card className="clinical-card p-6">
          <h1 className="text-lg font-semibold mb-4">{t("signIn")}</h1>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="label-clinical">{t("employeeId")}</Label>
              <Input
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={employeeId}
                onChange={(e) => setEid(e.target.value.replace(/\D/g, ""))}
                className="mt-1 tracking-widest text-center font-mono"
                placeholder="000000"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-brand hover:bg-brand/90 text-brand-foreground">
              {t("signIn")}
            </Button>
          </form>
          <div className="text-sm text-slate-600 mt-4 text-center">
            {t("noAccount")}{" "}
            <Link to="/register" className="text-brand font-medium hover:underline">
              {t("registerNow")}
            </Link>
          </div>
          <div className="text-xs text-slate-500 mt-4 text-center border-t border-slate-200 pt-3">
            <Link to="/admin/login" className="hover:underline">{t("adminLogin")}</Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
