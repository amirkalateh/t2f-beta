"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SafeImage from "@/components/ui/safe-image";
import {
  Users,
  Briefcase,
  MapPin,
  Plus,
  Search,
  X,
  Tag,
  Trash2,
  Edit2,
  MoreVertical,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useElements } from "@/hooks/use-elements";
import type { ElementType, Element } from "@/lib/types";

const TYPE_CONFIG: Record<ElementType, { icon: typeof Users; label: string; labelFa: string; color: string }> = {
  character: { icon: Users, label: "Character", labelFa: "شخصیت", color: "text-blue-500" },
  object: { icon: Briefcase, label: "Object", labelFa: "شیء", color: "text-amber-500" },
  place: { icon: MapPin, label: "Place", labelFa: "مکان", color: "text-emerald-500" },
};

interface ElementFormData {
  type: ElementType;
  name: string;
  description: string;
  tags: string;
  imageUrl: string;
}

const initialFormData: ElementFormData = {
  type: "character",
  name: "",
  description: "",
  tags: "",
  imageUrl: "",
};

export function ElementsLibrary() {
  const { elements, addElement, updateElement, deleteElement, getElementsByType } = useElements();
  const [activeFilter, setActiveFilter] = useState<ElementType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<Element | null>(null);
  const [formData, setFormData] = useState<ElementFormData>(initialFormData);

  const filteredElements = useMemo(() => {
    let result = activeFilter === "all" ? elements : getElementsByType(activeFilter);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (el) =>
          el.name.toLowerCase().includes(query) ||
          el.description.toLowerCase().includes(query) ||
          el.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [elements, activeFilter, searchQuery, getElementsByType]);

  const handleOpenCreate = (type?: ElementType) => {
    setEditingElement(null);
    setFormData({ ...initialFormData, type: type || "character" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (element: Element) => {
    setEditingElement(element);
    setFormData({
      type: element.type,
      name: element.name,
      description: element.description,
      tags: element.tags.join(", "),
      imageUrl: element.imageUrl || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingElement) {
      updateElement(editingElement.id, {
        type: formData.type,
        name: formData.name,
        description: formData.description,
        tags,
        imageUrl: formData.imageUrl || null,
      });
    } else {
      addElement({
        type: formData.type,
        name: formData.name,
        description: formData.description,
        tags,
        imageUrl: formData.imageUrl || null,
      });
    }
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingElement(null);
  };

  const handleDelete = (id: string) => {
    deleteElement(id);
  };

  const counts = useMemo(() => {
    return {
      all: elements.length,
      character: getElementsByType("character").length,
      object: getElementsByType("object").length,
      place: getElementsByType("place").length,
    };
  }, [elements, getElementsByType]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-border/30">
        <div>
          <h2 className="text-xl font-semibold">مجموعه عناصر</h2>
          <p className="text-sm text-muted-foreground mt-1">
            شخصیت‌ها، اشیا و مکان‌های پروژه را مدیریت کنید
          </p>
        </div>
        <Button onClick={() => handleOpenCreate()} className="gap-2" data-testid="button-create-element">
          <Plus className="w-4 h-4" />
          ایجاد عنصر
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 border-b border-border/30">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("all")}
            className="gap-1.5"
            data-testid="filter-all"
          >
            همه
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {counts.all}
            </Badge>
          </Button>
          {(Object.keys(TYPE_CONFIG) as ElementType[]).map((type) => {
            const config = TYPE_CONFIG[type];
            return (
              <Button
                key={type}
                variant={activeFilter === type ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(type)}
                className="gap-1.5"
                data-testid={`filter-${type}`}
              >
                <config.icon className={cn("w-3.5 h-3.5", config.color)} />
                {config.labelFa}
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {counts[type]}
                </Badge>
              </Button>
            );
          })}
        </div>
        <div className="relative flex-1 max-w-xs mr-auto">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="جستجو..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
            dir="rtl"
            data-testid="input-search-elements"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredElements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">هنوز عنصری وجود ندارد</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                شخصیت‌ها، اشیا یا مکان‌هایی که می‌خواهید در پروژه استفاده کنید را ایجاد کنید.
              </p>
              <div className="flex gap-3">
                {(Object.keys(TYPE_CONFIG) as ElementType[]).map((type) => {
                  const config = TYPE_CONFIG[type];
                  return (
                    <Button
                      key={type}
                      variant="outline"
                      onClick={() => handleOpenCreate(type)}
                      className="flex flex-col items-center gap-2 h-auto py-4 px-6"
                      data-testid={`button-create-${type}`}
                    >
                      <config.icon className={cn("w-5 h-5", config.color)} />
                      <span className="text-sm">{config.labelFa}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredElements.map((element) => {
                  const config = TYPE_CONFIG[element.type];
                  return (
                    <motion.div
                      key={element.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Card
                        className="overflow-hidden hover-elevate cursor-pointer"
                        data-testid={`card-element-${element.id}`}
                      >
                        {/* Image */}
                        <div className="relative aspect-square bg-muted/30">
                          {element.imageUrl ? (
                            <SafeImage
                              src={element.imageUrl}
                              alt={element.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <config.icon className={cn("w-12 h-12 opacity-20", config.color)} />
                            </div>
                          )}
                          {/* Type Badge */}
                          <Badge
                            variant="secondary"
                            className="absolute top-2 right-2 text-[10px]"
                          >
                            <config.icon className={cn("w-3 h-3 mr-1", config.color)} />
                            {config.labelFa}
                          </Badge>
                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 left-2 h-7 w-7 bg-background/80 backdrop-blur"
                                data-testid={`button-element-menu-${element.id}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEdit(element)}>
                                <Edit2 className="w-4 h-4 ml-2" />
                                ویرایش
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(element.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {/* Info */}
                        <div className="p-3">
                          <h4 className="font-medium truncate">{element.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2rem]">
                            {element.description || "بدون توضیحات"}
                          </p>
                          {element.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {element.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                              {element.tags.length > 3 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  +{element.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingElement ? "ویرایش عنصر" : "ایجاد عنصر جدید"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Type Selection */}
            <div className="flex gap-2">
              {(Object.keys(TYPE_CONFIG) as ElementType[]).map((type) => {
                const config = TYPE_CONFIG[type];
                return (
                  <Button
                    key={type}
                    variant={formData.type === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, type })}
                    className="flex-1 gap-1.5"
                    data-testid={`select-type-${type}`}
                  >
                    <config.icon className={cn("w-4 h-4", formData.type === type ? "" : config.color)} />
                    {config.labelFa}
                  </Button>
                );
              })}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">نام</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="نام عنصر..."
                data-testid="input-element-name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">توضیحات</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="توضیحات عنصر برای استفاده در پرامپت‌ها..."
                rows={3}
                data-testid="input-element-description"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">برچسب‌ها</label>
              <div className="relative">
                <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="برچسب‌ها را با کاما جدا کنید..."
                  className="pr-9"
                  data-testid="input-element-tags"
                />
              </div>
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">آدرس تصویر (اختیاری)</label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
                dir="ltr"
                data-testid="input-element-image"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
              data-testid="button-save-element"
            >
              {editingElement ? "ذخیره تغییرات" : "ایجاد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
