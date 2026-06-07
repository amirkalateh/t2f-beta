"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mic, Music, Sparkles, Loader2, Play, Volume2 } from "lucide-react";
import { MegaNav } from "@/components/layout/mega-nav";
import { FXLogo } from "@/components/layout/fx-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

interface AudioResult {
  id: string;
  audioUrl: string;
  type: "tts" | "sfx" | "music";
  prompt: string;
  createdAt: number;
}

const VOICES = [
  { id: "voice-navid", label: "نوید" },
  { id: "voice-sara", label: "سارا" },
  { id: "voice-amir", label: "امیر" },
  { id: "voice-maryam", label: "مریم" },
  { id: "voice-hossein", label: "حسین" },
];

const GENRES = ["سینمایی", "الکترونیک", "کلاسیک", "پاپ", "جاز"];
const MOODS = ["شاد", "غمگین", "هیجان‌انگیز", "آرام"];

type TabType = "tts" | "sfx" | "music";

function SoundStudioContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = (searchParams?.get("tab") as TabType) || "tts";

  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState("voice-navid");
  const [sfxPrompt, setSfxPrompt] = useState("");
  const [sfxDuration, setSfxDuration] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<AudioResult[]>([]);

  // Music generation state
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicDuration, setMusicDuration] = useState(30);
  const [musicGenre, setMusicGenre] = useState("cinematic");
  const [musicMood, setMusicMood] = useState("dramatic");

  const setTab = (tab: TabType) => {
    router.push(`/sound?tab=${tab}`);
  };

  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) {
      toast({ title: "خطا", description: "لطفا متن مورد نظر را وارد کنید", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsText.trim(), voiceId: ttsVoice, language: "fa" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "TTS generation failed");
      }

      const data = await res.json();
      const audioUrl = `data:${data.contentType};base64,${data.audioBase64}`;

      const newResult: AudioResult = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        audioUrl,
        type: "tts",
        prompt: ttsText.trim(),
        createdAt: Date.now(),
      };

      setResults((prev) => [newResult, ...prev]);
      toast({ title: "آماده شد", description: "صدای شما تولید شد" });
    } catch (error) {
      toast({
        title: "خطا در تولید",
        description: error instanceof Error ? error.message : "خطای ناشناخته",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSFX = async () => {
    if (!sfxPrompt.trim()) {
      toast({ title: "خطا", description: "لطفا صدای مورد نظر را توصیف کنید", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sfxPrompt.trim(), durationSeconds: sfxDuration }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "SFX generation failed");
      }

      const data = await res.json();
      const audioUrl = `data:${data.contentType};base64,${data.audioBase64}`;

      const newResult: AudioResult = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        audioUrl,
        type: "sfx",
        prompt: sfxPrompt.trim(),
        createdAt: Date.now(),
      };

      setResults((prev) => [newResult, ...prev]);
      toast({ title: "آماده شد", description: "افکت صوتی شما تولید شد" });
    } catch (error) {
      toast({
        title: "خطا در تولید",
        description: error instanceof Error ? error.message : "خطای ناشناخته",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim()) {
      toast({ title: "خطا", description: "لطفا توصیف موسیقی را وارد کنید", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/audio/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: musicPrompt.trim(),
          musicLengthMs: musicDuration * 1000,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Music generation failed");
      }

      const data = await res.json();
      const audioUrl = `data:${data.contentType};base64,${data.audioBase64}`;

      const newResult: AudioResult = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        audioUrl,
        type: "music",
        prompt: musicPrompt.trim(),
        createdAt: Date.now(),
      };

      setResults((prev) => [newResult, ...prev]);
      toast({ title: "آماده شد", description: "موسیقی شما تولید شد" });
    } catch (error) {
      toast({
        title: "خطا در تولید",
        description: error instanceof Error ? error.message : "خطای ناشناخته",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredResults = results.filter((r) => r.type === currentTab);

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <MegaNav />

      <div className="pt-14">
        <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">{"استودیو صدا"}</h1>
            <p className="text-muted-foreground">{"تولید گفتار، افکت صوتی و موسیقی با هوش مصنوعی"}</p>
          </div>

          <div className="flex items-center justify-center">
            <div className="glass-card rounded-full p-1 inline-flex gap-1">
              <Button
                variant={currentTab === "tts" ? "default" : "outline"}
                onClick={() => setTab("tts")}
                className="gap-2"
                data-testid="button-tab-tts"
              >
                <Mic className="w-4 h-4" />
                {"گفتار"}
              </Button>
              <Button
                variant={currentTab === "sfx" ? "default" : "outline"}
                onClick={() => setTab("sfx")}
                className="gap-2"
                data-testid="button-tab-sfx"
              >
                <Volume2 className="w-4 h-4" />
                {"افکت صوتی"}
              </Button>
              <Button
                variant={currentTab === "music" ? "default" : "outline"}
                onClick={() => setTab("music")}
                className="gap-2"
                data-testid="button-tab-music"
              >
                <Music className="w-4 h-4" />
                {"موسیقی"}
              </Button>
            </div>
          </div>

          {currentTab === "tts" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="glass-card rounded-xl p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm" data-testid="label-tts-text">{"متن گفتار"}</Label>
                  <Textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="متنی که می‌خواهید به صدا تبدیل شود..."
                    className="min-h-[120px] resize-none"
                    data-testid="textarea-tts-text"
                  />
                </div>

                <div className="flex items-end gap-4 flex-wrap">
                  <div className="space-y-2 flex-1 min-w-[180px]">
                    <Label className="text-sm">{"صدا"}</Label>
                    <Select value={ttsVoice} onValueChange={setTtsVoice}>
                      <SelectTrigger data-testid="select-tts-voice-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VOICES.map((v) => (
                          <SelectItem key={v.id} value={v.id} data-testid={`select-tts-voice-${v.id}`}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Badge variant="secondary" data-testid="badge-tts-language">{"فارسی"}</Badge>

                  <Button
                    onClick={handleGenerateTTS}
                    disabled={isGenerating || !ttsText.trim()}
                    className="gap-2"
                    data-testid="button-generate-tts"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isGenerating ? "در حال تولید..." : "تولید صدا"}
                  </Button>
                </div>
              </div>

              {filteredResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">{"نتایج"}</h3>
                  {filteredResults.map((result) => (
                    <div key={result.id} className="glass-surface rounded-xl p-4" data-testid={`tts-result-${result.id}`}>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" data-testid={`tts-result-text-${result.id}`}>{result.prompt}</p>
                        </div>
                        <audio controls src={result.audioUrl} className="max-w-[300px]" data-testid={`audio-player-tts-${result.id}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="tts-empty-state">
                  <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center mb-4">
                    <Mic className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">{"نتایج گفتار اینجا نمایش داده می‌شوند"}</p>
                </div>
              )}
            </motion.div>
          )}

          {currentTab === "sfx" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="glass-card rounded-xl p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm">{"توصیف افکت صوتی"}</Label>
                  <Textarea
                    value={sfxPrompt}
                    onChange={(e) => setSfxPrompt(e.target.value)}
                    placeholder="صدای مورد نظر خود را توصیف کنید..."
                    className="min-h-[100px] resize-none"
                    data-testid="textarea-sfx-prompt"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{"مدت زمان"}</Label>
                    <span className="text-sm text-muted-foreground" data-testid="text-sfx-duration-value">{sfxDuration} {"ثانیه"}</span>
                  </div>
                  <Slider
                    value={[sfxDuration]}
                    onValueChange={([v]) => setSfxDuration(v)}
                    min={1}
                    max={30}
                    step={1}
                    data-testid="slider-sfx-duration"
                  />
                </div>

                <Button
                  onClick={handleGenerateSFX}
                  disabled={isGenerating || !sfxPrompt.trim()}
                  className="gap-2"
                  data-testid="button-generate-sfx"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isGenerating ? "در حال تولید..." : "تولید افکت صوتی"}
                </Button>
              </div>

              {filteredResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">{"نتایج"}</h3>
                  {filteredResults.map((result) => (
                    <div key={result.id} className="glass-surface rounded-xl p-4" data-testid={`sfx-result-${result.id}`}>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{result.prompt}</p>
                        </div>
                        <audio controls src={result.audioUrl} className="max-w-[300px]" data-testid={`audio-player-sfx-${result.id}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="sfx-empty-state">
                  <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center mb-4">
                    <Volume2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">{"افکت‌های صوتی تولید شده اینجا نمایش داده می‌شوند"}</p>
                </div>
              )}
            </motion.div>
          )}

          {currentTab === "music" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="rounded-xl border border-border/50 bg-muted/20 p-6 space-y-5 max-w-2xl mx-auto">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">توصیف موسیقی</Label>
                  <Textarea
                    value={musicPrompt}
                    onChange={(e) => setMusicPrompt(e.target.value)}
                    placeholder="توصیف موسیقی به انگلیسی... (مثلاً: cinematic orchestral score with swelling strings and emotional piano)"
                    className="min-h-[100px] resize-none"
                    dir="ltr"
                    data-testid="textarea-music-prompt"
                  />
                </div>

                <div className="flex gap-4 flex-wrap">
                  <div className="space-y-2 flex-1 min-w-[160px]">
                    <Label className="text-sm text-muted-foreground">ژانر</Label>
                    <Select value={musicGenre} onValueChange={setMusicGenre}>
                      <SelectTrigger data-testid="select-music-genre-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cinematic">سینمایی</SelectItem>
                        <SelectItem value="electronic">الکترونیک</SelectItem>
                        <SelectItem value="orchestral">ارکسترال</SelectItem>
                        <SelectItem value="ambient">آمبیانتی</SelectItem>
                        <SelectItem value="pop">پاپ</SelectItem>
                        <SelectItem value="jazz">جاز</SelectItem>
                        <SelectItem value="rock">راک</SelectItem>
                        <SelectItem value="classical">کلاسیک</SelectItem>
                        <SelectItem value="lofi">Lo-Fi</SelectItem>
                        <SelectItem value="horror">ترسناک</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 flex-1 min-w-[160px]">
                    <Label className="text-sm text-muted-foreground">حال و هوا</Label>
                    <Select value={musicMood} onValueChange={setMusicMood}>
                      <SelectTrigger data-testid="select-music-mood-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dramatic">دراماتیک</SelectItem>
                        <SelectItem value="romantic">رمانتیک</SelectItem>
                        <SelectItem value="epic">حماسی</SelectItem>
                        <SelectItem value="sad">غمگین</SelectItem>
                        <SelectItem value="happy">شاد</SelectItem>
                        <SelectItem value="tense">تنش</SelectItem>
                        <SelectItem value="mysterious">مرموز</SelectItem>
                        <SelectItem value="calm">آرام</SelectItem>
                        <SelectItem value="energetic">پرانرژی</SelectItem>
                        <SelectItem value="melancholic">ملانکولیک</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">مدت زمان</Label>
                    <span className="text-sm text-muted-foreground">{musicDuration} ثانیه</span>
                  </div>
                  <Slider
                    value={[musicDuration]}
                    onValueChange={([v]) => setMusicDuration(v)}
                    min={5}
                    max={60}
                    step={5}
                    data-testid="slider-music-duration"
                  />
                </div>

                <Button
                  onClick={handleGenerateMusic}
                  disabled={isGenerating || !musicPrompt.trim()}
                  className="gap-2 w-full"
                  data-testid="button-generate-music"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      در حال تولید موسیقی...
                    </>
                  ) : (
                    <>
                      <Music className="w-4 h-4" />
                      تولید موسیقی با ElevenLabs
                    </>
                  )}
                </Button>
              </div>

              {filteredResults.length > 0 && (
                <div className="space-y-3 max-w-2xl mx-auto">
                  <h3 className="text-sm font-medium text-muted-foreground">{"نتایج"}</h3>
                  {filteredResults.map((result) => (
                    <div key={result.id} className="glass-surface rounded-xl p-4" data-testid={`music-result-${result.id}`}>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{result.prompt}</p>
                        </div>
                        <audio controls src={result.audioUrl} className="max-w-[300px]" data-testid={`audio-player-music-${result.id}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="music-empty-state">
                  <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center mb-4">
                    <Music className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">{"موسیقی تولید شده اینجا نمایش داده می‌شوند"}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SoundStudioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SoundStudioContent />
    </Suspense>
  );
}
