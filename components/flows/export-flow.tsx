"use client";

import { motion } from "framer-motion";
import {
  Download,
  Check,
  Clock,
  Film,
  Loader2,
  ChevronRight,
  Sparkles,
  Share2,
  FileText,
  Eye,
  Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toPersianNumber } from "@/lib/utils";

interface ExportFlowProps {
  projectTitle: string;
  onBack: () => void;
  onExport: () => void;
  onDownload: () => void;
  isExporting: boolean;
  exportProgress: number;
  exportUrl?: string | null;
}

const completedStages = [
  { label: "روایت", icon: FileText, key: "narrative" },
  { label: "کارگردان هوشمند", icon: Film, key: "director_brief" },
  { label: "عناصر", icon: Film, key: "elements" },
  { label: "دکوپاژ بصری", icon: Eye, key: "vision" },
  { label: "استوری‌بورد", icon: Film, key: "storyboard" },
  { label: "مونتاژ", icon: Music, key: "assembly" },
  { label: "خروجی", icon: Download, key: "export" },
];

export function ExportFlow({
  projectTitle,
  onBack,
  onExport,
  onDownload,
  isExporting,
  exportProgress,
  exportUrl,
}: ExportFlowProps) {
  const isComplete = exportProgress >= 100 && !!exportUrl;

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl stage-icon-export flex items-center justify-center shadow-lg">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">خروجی نهایی</h2>
              <p className="text-sm text-muted-foreground">رندر و دانلود پروژه</p>
            </div>
          </div>
          <Badge variant="export">مرحله ۷ از ۷</Badge>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <Card className="max-w-xl w-full border-card-border">
          <CardHeader className="text-center pb-4">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                isComplete
                  ? "stage-icon-export"
                  : isExporting
                  ? "bg-gradient-to-br from-primary to-blue-600 animate-pulse"
                  : "bg-gradient-to-br from-primary to-blue-600"
              }`}
            >
              {isComplete ? (
                <Check className="w-10 h-10 text-white" />
              ) : isExporting ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : (
                <Sparkles className="w-10 h-10 text-white" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isComplete
                ? "پروژه آماده است!"
                : isExporting
                ? "در حال رندر..."
                : "آماده خروجی"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg font-semibold mb-1">{projectTitle}</p>
              <p className="text-muted-foreground">
                {isComplete
                  ? "ویدیوی شما با موفقیت رندر شد و آماده دانلود است"
                  : isExporting
                  ? "ویدیوی شما در حال رندر شدن است. لطفاً صبر کنید..."
                  : "همه مراحل پروژه تکمیل شده است. می‌توانید خروجی نهایی را دریافت کنید"}
              </p>
            </div>

            {isExporting && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">در حال پردازش...</span>
                  <span className="font-medium">{toPersianNumber(exportProgress)}%</span>
                </div>
                <Progress value={exportProgress} className="h-3" />
              </div>
            )}

            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                مراحل تکمیل شده:
              </p>
              {completedStages.map((stage, index) => {
                const Icon = stage.icon;
                const isExportStage = stage.key === "export";
                const isStageComplete = !isExportStage || isComplete;

                return (
                  <div
                    key={stage.key}
                    className="flex items-center gap-3 p-2 rounded-lg bg-background/50"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isStageComplete
                          ? "bg-stage-export/20 text-stage-export"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isStageComplete ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{stage.label}</span>
                  </div>
                );
              })}
            </div>

            {isComplete ? (
              <div className="space-y-3">
                <Button
                  variant="aiGenerate"
                  className="w-full gap-2"
                  size="lg"
                  onClick={onDownload}
                  data-testid="button-download"
                >
                  <Download className="w-5 h-5" />
                  دانلود ویدیو
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={onBack}
                    data-testid="button-prev-stage"
                  >
                    <ChevronRight className="w-4 h-4" />
                    بازگشت به مونتاژ
                  </Button>
                  <Button
                    variant="aiGenerate"
                    className="flex-1 gap-2"
                    onClick={onExport}
                    data-testid="button-re-export"
                  >
                    <Sparkles className="w-4 h-4" />
                    رندر مجدد
                  </Button>
                </div>
                <Button variant="outline" className="w-full gap-2" size="lg" disabled>
                  <Share2 className="w-5 h-5" />
                  اشتراک‌گذاری
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={onBack}
                  data-testid="button-prev-stage"
                >
                  <ChevronRight className="w-4 h-4" />
                  بازگشت به مونتاژ
                </Button>
                <Button
                  variant="aiGenerate"
                  className="flex-1 gap-2"
                  onClick={onExport}
                  disabled={isExporting}
                  data-testid="button-export"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isExporting ? "در حال رندر..." : "شروع رندر"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
