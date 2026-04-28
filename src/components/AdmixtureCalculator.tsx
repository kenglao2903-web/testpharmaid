import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Beaker, Printer, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BASE_FLUIDS, ADDITIVES, DILUENTS } from "@/lib/fluids";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

type Mode = "dextrose-concentrate" | "dextrose-dilute" | "nacl-dilute";

export const AdmixtureCalculator = () => {
  const { t } = useI18n();
  const { logActivity } = useAuth();
  const [mode, setMode] = useState<Mode>("dextrose-concentrate");
  const [targetPct, setTargetPct] = useState("7.5");
  const [targetVol, setTargetVol] = useState("500");
  const [baseKey, setBaseKey] = useState("D5S");
  const [additiveKey, setAdditiveKey] = useState("D50");
  const [diluentKey, setDiluentKey] = useState("Sterile Water");

  const isDextrose = mode.startsWith("dextrose");
  const isDilution = mode.endsWith("dilute");

  const result = useMemo(() => {
    const tp = parseFloat(targetPct);
    const tv = parseFloat(targetVol);
    const base = BASE_FLUIDS.find((b) => b.value === baseKey)!;
    if (!tp || !tv || isNaN(tp) || isNaN(tv) || !base) return null;

    const basePct = isDextrose ? base.dextrose : base.nacl;

    if (mode === "dextrose-concentrate") {
      const add = ADDITIVES.find((a) => a.value === "D50")!;
      if (tp <= basePct || tp >= add.percent) {
        return { error: `Target % must be between ${basePct}% and ${add.percent}%.` };
      }
      const partsAdditive = tp - basePct;
      const partsBase = add.percent - tp;
      const totalParts = partsAdditive + partsBase;
      const volAdditive = (partsAdditive / totalParts) * tv;
      const volBase = (partsBase / totalParts) * tv;
      const vialsNeeded = Math.ceil(volAdditive / add.vialSize);
      const totalDrawn = vialsNeeded * add.vialSize;
      const discardFromVials = totalDrawn - volAdditive;
      return {
        kind: "concentrate" as const,
        tp, tv, base, add,
        volAdditive, volBase,
        vialsNeeded, discardFromVials,
        withdrawFromBag: tv - volBase,
      };
    }

    // Dilution (dextrose or nacl) — withdraw-then-add workflow (mirrors concentrate mode)
    // Start with a full base bag of `tv` ml, withdraw some volume, then add diluent
    // back up to `tv` ml so the final concentration = tp.
    const dil = DILUENTS.find((d) => d.value === diluentKey)!;
    const dilPct = isDextrose ? dil.dextrose : dil.nacl;
    if (tp >= basePct) {
      return { error: `Dilution: target % must be lower than base (${basePct}%).` };
    }
    if (tp < dilPct) {
      return { error: `Target % cannot be lower than diluent (${dilPct}%).` };
    }
    // Volume of base solution that must remain in the bag
    const Vbase = ((tp - dilPct) * tv) / (basePct - dilPct);
    const Vdil = tv - Vbase;
    return {
      kind: "dilute" as const,
      tp, tv, base, dil,
      volBaseRemaining: Vbase,
      withdrawFromBag: Vdil, // volume of base to discard from the bag
      volDiluent: Vdil,      // volume of diluent to add back
      labelSuffix: isDextrose ? "Dextrose" : "NaCl",
    };
  }, [targetPct, targetVol, baseKey, additiveKey, diluentKey, mode, isDextrose]);

  const overBag = result && !("error" in result) && result.tv > 1000;
  const heavyAdditive =
    result && !("error" in result) && result.kind === "concentrate" && result.volAdditive > 100;

  const handlePrint = () => {
    logActivity("print_admixture", {
      mode,
      target_pct: parseFloat(targetPct),
      target_vol: parseFloat(targetVol),
      base: baseKey,
    });
    window.print();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="clinical-card p-6 lg:col-span-2 no-print">
        <div className="flex items-center gap-2 mb-4">
          <Beaker className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-semibold">{t("inputs")}</h2>
        </div>

        <div className="mb-4">
          <Label className="label-clinical">{t("admixtureType")}</Label>
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-1">
            <TabsList className="grid grid-cols-3 w-full h-auto">
              <TabsTrigger value="dextrose-concentrate" className="text-xs px-1 py-1.5">
                {t("dextroseAdjust")}
              </TabsTrigger>
              <TabsTrigger value="dextrose-dilute" className="text-xs px-1 py-1.5">
                {t("dextroseDilute")}
              </TabsTrigger>
              <TabsTrigger value="nacl-dilute" className="text-xs px-1 py-1.5">
                {t("naclAdjust")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="mt-1.5 text-xs text-slate-500">{t("dextroseModeHelp")}</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="label-clinical">{t("targetPct")}</Label>
              <Input
                type="number"
                step="0.01"
                value={targetPct}
                onChange={(e) => setTargetPct(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="label-clinical">{t("targetVolume")}</Label>
              <Input
                type="number"
                value={targetVol}
                onChange={(e) => setTargetVol(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="label-clinical">{t("baseFluid")}</Label>
            <Select value={baseKey} onValueChange={setBaseKey}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BASE_FLUIDS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "dextrose-concentrate" ? (
            <div>
              <Label className="label-clinical">{t("additive")}</Label>
              <Select value={additiveKey} onValueChange={setAdditiveKey}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADDITIVES.filter((a) => a.type === "dextrose").map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label className="label-clinical">{t("diluent")}</Label>
              <Select value={diluentKey} onValueChange={setDiluentKey}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DILUENTS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      <div className="lg:col-span-3 space-y-4">
        {result && "error" in result && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("invalidRange")}</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        )}

        {result && !("error" in result) && (
          <>
            {(overBag || heavyAdditive) && (
              <Alert className="border-warning/50 bg-warning/10 text-foreground">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">{t("caution")}</AlertTitle>
                <AlertDescription>
                  {overBag && t("overBagWarn")}
                  {heavyAdditive && t("heavyAdditiveWarn")}
                </AlertDescription>
              </Alert>
            )}

            <Card className="clinical-card p-6 print-area">
              <div className="print-title hidden print:block">
                {(isDextrose ? result.base.dextrose : result.base.nacl)}% → {result.tp}{isDextrose ? "%" : "%"} {result.kind === "dilute" ? result.labelSuffix : (isDextrose ? "Dextrose" : "NaCl")} × {result.tv} ml
              </div>
              <div className="print-header hidden print:flex justify-between items-center">
                <span>INITIAL: {(isDextrose ? result.base.dextrose : result.base.nacl)}%</span>
                <span>→</span>
                <span>FINAL: {result.tp}%</span>
              </div>

              <div className="flex items-center gap-2 mb-4 no-print">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h2 className="text-lg font-semibold">{t("result")}</h2>
              </div>

              {result.kind === "concentrate" && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6 no-print">
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                      <div className="label-clinical">{t("withdrawFromBag")}</div>
                      <div className="text-2xl font-bold mt-1">
                        {result.withdrawFromBag.toFixed(1)}{" "}
                        <span className="text-sm font-medium text-slate-500">ml</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{t("discardBeforeAdding")}</div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200">
                      <div className="label-clinical text-emerald-700">{t("addAdditive")}</div>
                      <div className="text-2xl font-bold text-emerald-700 mt-1">
                        {result.volAdditive.toFixed(1)}{" "}
                        <span className="text-sm font-medium">ml</span>
                      </div>
                      <div className="text-xs text-emerald-700/80 mt-1">
                        {result.add.label.split(" (")[0]}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4 mb-6 no-print">
                    <div className="label-clinical mb-1">{t("totalVials")}</div>
                    <div className="text-base">
                      <span className="font-bold">{result.vialsNeeded}</span> ×{" "}
                      {result.add.vialSize} ml → {t("discard")}{" "}
                      <span className="font-bold">{result.discardFromVials.toFixed(1)} ml</span>{" "}
                      {t("excess")}
                    </div>
                  </div>

                  <div className="print-section">
                    <h3 className="font-semibold mb-2">{t("stepGuide")}</h3>
                    <ol className="space-y-1.5 text-sm">
                      <li>
                        <span className="font-bold">{t("step")} 1:</span> {t("stepPrepBag")}{" "}
                        {result.base.label.split(" (")[0]} ({result.tv} ml).
                      </li>
                      <li>
                        <span className="font-bold">{t("step")} 2:</span> {t("stepWithdraw")}{" "}
                        <b>{result.withdrawFromBag.toFixed(1)} ml</b> {t("stepFromBag")}.
                      </li>
                      <li>
                        <span className="font-bold">{t("step")} 3:</span> {t("stepDraw")}{" "}
                        <b>{result.volAdditive.toFixed(1)} ml</b> {t("stepFromVials")}{" "}
                        <b>{result.vialsNeeded}</b> × {result.add.vialSize} ml{" "}
                        {t("stepVialOf")} {result.add.label.split(" (")[0]}.
                      </li>
                      <li>
                        <span className="font-bold">{t("step")} 4:</span> {t("stepInject")}
                      </li>
                    </ol>
                    <div className="print-timestamp hidden print:block mt-2 pt-2 border-t border-dashed border-black text-xs">
                      <b>Printed:</b> {new Date().toLocaleString()}
                    </div>
                  </div>
                </>
              )}

              {result.kind === "dilute" && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6 no-print">
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                      <div className="label-clinical">{t("withdrawFromBag")}</div>
                      <div className="text-2xl font-bold mt-1">
                        {result.withdrawFromBag.toFixed(1)}{" "}
                        <span className="text-sm font-medium text-slate-500">ml</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {result.base.label.split(" (")[0]} • {t("discardBeforeAdding")}
                      </div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200">
                      <div className="label-clinical text-emerald-700">{t("diluent")}</div>
                      <div className="text-2xl font-bold text-emerald-700 mt-1">
                        {result.volDiluent.toFixed(1)}{" "}
                        <span className="text-sm font-medium">ml</span>
                      </div>
                      <div className="text-xs text-emerald-700/80 mt-1">{result.dil.label}</div>
                    </div>
                  </div>

                  <div className="print-section">
                    <h3 className="font-semibold mb-2">{t("stepGuide")}</h3>
                    <ol className="space-y-1.5 text-sm">
                      <li>
                        <span className="font-bold">{t("step")} 1:</span> {t("stepPrepBag")}{" "}
                        {result.base.label.split(" (")[0]} ({result.tv} ml).
                      </li>
                      <li>
                        <span className="font-bold">{t("step")} 2:</span> {t("stepWithdraw")}{" "}
                        <b>{result.withdrawFromBag.toFixed(1)} ml</b> {t("stepFromBag")}.
                      </li>
                      <li>
                        <span className="font-bold">{t("step")} 3:</span> {t("stepDraw")}{" "}
                        <b>{result.volDiluent.toFixed(1)} ml</b> {t("stepFromVials")}{" "}
                        {result.dil.label}.
                      </li>
                      <li>
                        <span className="font-bold">{t("step")} 4:</span> {t("stepInject")}
                      </li>
                    </ol>
                    <div className="print-timestamp hidden print:block mt-2 pt-2 border-t border-dashed border-black text-xs">
                      <b>Printed:</b> {new Date().toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </Card>

            <div className="flex gap-2 no-print">
              <Button
                onClick={handlePrint}
                className="w-full bg-brand hover:bg-brand/90 text-brand-foreground"
              >
                <Printer className="h-4 w-4 mr-2" /> {t("printSticker")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
