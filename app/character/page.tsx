"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Loader2, Trash2, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MegaNav } from "@/components/layout/mega-nav";
import { FXLogo } from "@/components/layout/fx-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import SafeImage from "@/components/ui/safe-image";
import { useToast } from "@/hooks/use-toast";

interface CharacterAsset {
  id: number;
  name: string;
  description: string | null;
  type: string;
  tags: string[] | null;
  imageUrl: string | null;
  createdAt: string;
}

const CHARACTER_TYPES = [
  { value: "human", label: "انسان" },
  { value: "animal", label: "حیوان" },
  { value: "fantasy", label: "فانتزی" },
  { value: "robot", label: "ربات" },
];

export default function CharacterStudioPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [characterType, setCharacterType] = useState("human");
  const [tags, setTags] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const { data: characters = [], isLoading } = useQuery<CharacterAsset[]>({
    queryKey: ["/api/assets", "character"],
    queryFn: async () => {
      const res = await fetch("/api/assets?type=character");
      if (!res.ok) throw new Error("Failed to fetch characters");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        type: "character",
        tags: tags.trim() ? tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
        imageUrl: imageUrl.trim() || null,
        projectId: null,
      };

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create character");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", "character"] });
      setName("");
      setDescription("");
      setCharacterType("human");
      setTags("");
      setImageUrl("");
      toast({ title: "ایجاد شد", description: "شخصیت جدید با موفقیت ایجاد شد" });
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در ایجاد شخصیت",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete character");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", "character"] });
      toast({ title: "حذف شد", description: "شخصیت حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف شخصیت", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast({ title: "خطا", description: "نام شخصیت را وارد کنید", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <MegaNav />

      <div className="pt-14">
        <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">شخصیت‌سازی</h1>
            <p className="text-muted-foreground">شخصیت‌های AI خود را بسازید و مدیریت کنید</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border/50 bg-muted/20 p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  <h2 className="text-lg font-semibold">ساخت شخصیت جدید</h2>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">نام شخصیت</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="نام شخصیت..."
                    data-testid="input-character-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">توضیحات</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="توصیف ظاهر و شخصیت..."
                    className="min-h-[80px] resize-none"
                    data-testid="textarea-character-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">نوع</Label>
                  <Select value={characterType} onValueChange={setCharacterType}>
                    <SelectTrigger data-testid="select-character-type-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHARACTER_TYPES.map((ct) => (
                        <SelectItem key={ct.value} value={ct.value} data-testid={`select-character-type-${ct.value}`}>
                          {ct.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">برچسب‌ها</Label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="برچسب‌ها با کاما جدا شوند..."
                    data-testid="input-character-tags"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">تصویر مرجع (اختیاری)</Label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="URL تصویر مرجع"
                    data-testid="input-character-image-url"
                  />
                  {imageUrl.trim() && (
                    <div className="relative aspect-square w-32 rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                      <SafeImage src={imageUrl} alt="Reference" fill className="object-cover" />
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !name.trim()}
                  className="w-full gap-2 btn-lift"
                  data-testid="button-create-character"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {createMutation.isPending ? "در حال ایجاد..." : "ایجاد شخصیت"}
                </Button>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">شخصیت‌های من</h2>
                <Badge variant="secondary" className="text-[10px]" data-testid="badge-character-count">
                  {characters.length}
                </Badge>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl border border-border/40 bg-muted/20 overflow-visible p-0">
                      <div className="aspect-square shimmer rounded-t-xl" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 w-24 shimmer rounded" />
                        <div className="h-3 w-full shimmer rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : characters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="characters-empty-state">
                  <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">هنوز شخصیتی نساخته‌اید</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">از فرم کنار یک شخصیت جدید بسازید</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {characters.map((char) => (
                    <motion.div
                      key={char.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="rounded-xl border border-border/40 bg-muted/20 overflow-visible p-0 group card-interactive" data-testid={`character-card-${char.id}`}>
                        {char.imageUrl ? (
                          <div className="relative aspect-square rounded-t-xl overflow-hidden">
                            <SafeImage src={char.imageUrl} alt={char.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="aspect-square rounded-t-xl bg-muted/20 flex items-center justify-center">
                            <Users className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-medium truncate" data-testid={`character-name-${char.id}`}>{char.name}</h3>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(char.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-character-${char.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                          {char.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`character-description-${char.id}`}>{char.description}</p>
                          )}
                          {char.tags && char.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {char.tags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
