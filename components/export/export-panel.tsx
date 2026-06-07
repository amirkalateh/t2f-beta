"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Check,
  Loader2,
  Sparkles,
  Share2,
  Copy,
  Link,
  Mail,
  Film,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ExportFormat = "mp4" | "mov" | "webm";
type ExportQuality = "1080p" | "720p" | "480p";

interface ExportSettings {
  format: ExportFormat;
  quality: ExportQuality;
  includeAudio: boolean;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: "mp4", label: "MP4 (H.264)", description: "سازگار با همه دستگاه‌ها" },
  { value: "mov", label: "MOV (ProRes)", description: "کیفیت بالا برای ویرایش" },
  { value: "webm", label: "WebM (VP9)", description: "بهینه برای وب" },
];

const QUALITY_OPTIONS: { value: ExportQuality; label: string; size: string }[] = [
  { value: "1080p", label: "Full HD (1080p)", size: "~50 MB/min" },
  { value: "720p", label: "HD (720p)", size: "~25 MB/min" },
  { value: "480p", label: "SD (480p)", size: "~12 MB/min" },
];

interface ExportPanelProps {
  projectTitle: string;
  duration: number;
  onExport?: () => void;
}

export function ExportPanel({ projectTitle, duration, onExport }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>({
    format: "mp4",
    quality: "1080p",
    includeAudio: true,
  });
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareLink] = useState("https://fx.studio/share/abc123");

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartExport = () => {
    setIsExporting(true);
    setExportProgress(0);

    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setIsComplete(true);
          return 100;
        }
        return prev + Math.random() * 8;
      });
    }, 300);

    onExport?.();
  };

  const handleDownload = () => {
    alert("در نسخه کامل، فایل ویدیویی واقعی دانلود می‌شود");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <Card className="border-card-border overflow-hidden">
          <CardHeader className="text-center pb-4 bg-gradient-to-b from-primary/5 to-transparent">
            <div
              className={cn(
                "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all",
                isComplete
                  ? "bg-green-500"
                  : isExporting
                  ? "bg-primary animate-pulse"
                  : "bg-gradient-to-br from-primary to-blue-600"
              )}
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
                : "خروجی پروژه"}
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {isComplete
                ? "ویدیوی شما با موفقیت رندر شد"
                : isExporting
                ? "لطفا صبر کنید..."
                : projectTitle}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Progress */}
            {isExporting && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3 p-4 bg-muted/50 rounded-xl"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">پیشرفت رندر</span>
                  <span className="font-medium">{Math.round(exportProgress)}%</span>
                </div>
                <Progress value={exportProgress} className="h-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>مرحله: کدگذاری ویدیو</span>
                  <span>زمان تقریبی: ~2 دقیقه</span>
                </div>
              </motion.div>
            )}

            {/* Settings Summary */}
            {!isExporting && !isComplete && (
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">تنظیمات خروجی</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettingsDialog(true)}
                    className="gap-1"
                    data-testid="button-export-settings"
                  >
                    <Settings className="w-4 h-4" />
                    تغییر
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">فرمت</p>
                    <p className="font-medium uppercase">{settings.format}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">کیفیت</p>
                    <p className="font-medium">{settings.quality}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">مدت</p>
                    <p className="font-medium">{formatDuration(duration)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {isComplete ? (
              <div className="space-y-3">
                <Button
                  variant="aiGenerate"
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleDownload}
                  data-testid="button-download"
                >
                  <Download className="w-5 h-5" />
                  دانلود ویدیو
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => setShowShareDialog(true)}
                  data-testid="button-share"
                >
                  <Share2 className="w-5 h-5" />
                  اشتراک‌گذاری
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setIsComplete(false);
                    setExportProgress(0);
                  }}
                >
                  رندر مجدد با تنظیمات جدید
                </Button>
              </div>
            ) : (
              <Button
                variant="aiGenerate"
                className="w-full gap-2"
                size="lg"
                onClick={handleStartExport}
                disabled={isExporting}
                data-testid="button-start-export"
              >
                {isExporting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Film className="w-5 h-5" />
                )}
                {isExporting ? "در حال رندر..." : "شروع رندر"}
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تنظیمات خروجی</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Format */}
            <div className="space-y-3">
              <p className="text-sm font-medium">فرمت ویدیو</p>
              <div className="space-y-2">
                {FORMAT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors w-full text-right",
                      settings.format === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => setSettings({ ...settings, format: option.value })}
                    data-testid={`format-${option.value}`}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        settings.format === option.value
                          ? "border-primary"
                          : "border-muted-foreground"
                      )}
                    >
                      {settings.format === option.value && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div className="space-y-3">
              <p className="text-sm font-medium">کیفیت</p>
              <div className="space-y-2">
                {QUALITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors w-full text-right",
                      settings.quality === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => setSettings({ ...settings, quality: option.value })}
                    data-testid={`quality-${option.value}`}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        settings.quality === option.value
                          ? "border-primary"
                          : "border-muted-foreground"
                      )}
                    >
                      {settings.quality === option.value && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.size}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettingsDialog(false)}>
              ذخیره تنظیمات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>اشتراک‌گذاری پروژه</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Link className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-transparent text-sm outline-none"
                dir="ltr"
              />
              <Button variant="ghost" size="icon" onClick={handleCopyLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2">
                <Share2 className="w-4 h-4" />
                توییتر
              </Button>
              <Button variant="outline" className="gap-2">
                <Mail className="w-4 h-4" />
                ایمیل
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
