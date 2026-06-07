"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { User, MapPin, Package, AtSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Asset, AssetType } from "@/lib/types";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  elements: Asset[];
  placeholder?: string;
  className?: string;
  dir?: string;
  "data-testid"?: string;
}

const TYPE_CONFIG: Record<AssetType, { icon: typeof User; label: string; color: string }> = {
  character: { icon: User, label: "شخصیت", color: "text-blue-400" },
  location: { icon: MapPin, label: "لوکیشن", color: "text-emerald-400" },
  property: { icon: Package, label: "آیتم/پراپ", color: "text-amber-400" },
};

export function MentionTextarea({
  value,
  onChange,
  elements,
  placeholder,
  className,
  dir = "rtl",
  "data-testid": testId,
}: MentionTextareaProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredElements = useMemo(() => {
    if (!mentionQuery) return elements;
    const query = mentionQuery.toLowerCase();
    return elements.filter(
      (el) =>
        el.name.toLowerCase().includes(query) ||
        (el.description && el.description.toLowerCase().includes(query))
    );
  }, [elements, mentionQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredElements]);

  const closeMention = useCallback(() => {
    setShowDropdown(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
    setSelectedIndex(0);
  }, []);

  const insertMention = useCallback((element: Asset) => {
    const before = value.substring(0, mentionStartIndex);
    const after = value.substring(
      mentionStartIndex + mentionQuery.length + 1
    );
    const newValue = `${before}@${element.name}${after}`;
    onChange(newValue);
    closeMention();
    setTimeout(() => {
      if (textareaRef.current) {
        const cursorPos = mentionStartIndex + element.name.length + 1;
        textareaRef.current.setSelectionRange(cursorPos, cursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, mentionStartIndex, mentionQuery, onChange, closeMention]);

  const updateDropdownPosition = useCallback(() => {
    const textarea = textareaRef.current;
    const container = containerRef.current;
    if (!textarea || !container) return;
    const containerRect = container.getBoundingClientRect();
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const textBeforeCursor = value.substring(0, textarea.selectionStart);
    const lines = textBeforeCursor.split("\n");
    const currentLineIndex = lines.length - 1;
    const top = textarea.offsetTop + (currentLineIndex + 1) * lineHeight + 4;
    setDropdownPosition({ top, right: 8 });
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
      if (charBeforeAt === " " || charBeforeAt === "\n" || lastAtIndex === 0) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        if (!query.includes(" ") && !query.includes("\n")) {
          setMentionStartIndex(lastAtIndex);
          setMentionQuery(query);
          setShowDropdown(true);
          updateDropdownPosition();
          return;
        }
      }
    }
    closeMention();
  }, [onChange, closeMention, updateDropdownPosition]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || filteredElements.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredElements.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredElements.length) % filteredElements.length);
    } else if (e.key === "Enter" && showDropdown) {
      e.preventDefault();
      insertMention(filteredElements[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMention();
    }
  }, [showDropdown, filteredElements, selectedIndex, insertMention, closeMention]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        closeMention();
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown, closeMention]);

  return (
    <div ref={containerRef} className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("min-h-[80px] resize-none", className)}
        dir={dir}
        data-testid={testId}
      />
      {showDropdown && filteredElements.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            left: `${dropdownPosition.right}px`,
          }}
        >
          <Card className="shadow-xl border-border">
            <CardContent className="p-1">
              <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border mb-1">
                <AtSign className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">انتخاب عنصر</span>
              </div>
              <ScrollArea className="max-h-48">
                {filteredElements.map((element, index) => {
                  const config = TYPE_CONFIG[element.type] || TYPE_CONFIG.property;
                  const Icon = config.icon;
                  return (
                    <button
                      key={element.id}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-right transition-colors",
                        index === selectedIndex
                          ? "bg-primary/10"
                          : "hover-elevate"
                      )}
                      onClick={() => insertMention(element)}
                      data-testid={`mention-option-${element.id}`}
                    >
                      <div className={cn("w-6 h-6 rounded flex items-center justify-center bg-muted flex-shrink-0")}>
                        <Icon className={cn("w-3.5 h-3.5", config.color)} />
                      </div>
                      <span className="text-sm font-medium truncate flex-1">{element.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 flex-shrink-0">
                        {config.label}
                      </Badge>
                    </button>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
