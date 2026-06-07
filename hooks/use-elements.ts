"use client";

import { useState, useCallback } from "react";
import type { Element, ElementType } from "@/lib/types";

const STORAGE_KEY = "fx-studio-elements";

function loadElements(): Element[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((el: Element) => ({
        ...el,
        createdAt: new Date(el.createdAt),
      }));
    }
  } catch (e) {
    console.error("Failed to load elements:", e);
  }
  return [];
}

function saveElements(elements: Element[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
  } catch (e) {
    console.error("Failed to save elements:", e);
  }
}

export function useElements() {
  const [elements, setElements] = useState<Element[]>(() => loadElements());
  const [isLoading, setIsLoading] = useState(false);

  const addElement = useCallback((element: Omit<Element, "id" | "createdAt">) => {
    const newElement: Element = {
      ...element,
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    setElements((prev) => {
      const updated = [...prev, newElement];
      saveElements(updated);
      return updated;
    });
    return newElement;
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<Omit<Element, "id" | "createdAt">>) => {
    setElements((prev) => {
      const updated = prev.map((el) => (el.id === id ? { ...el, ...updates } : el));
      saveElements(updated);
      return updated;
    });
  }, []);

  const deleteElement = useCallback((id: string) => {
    setElements((prev) => {
      const updated = prev.filter((el) => el.id !== id);
      saveElements(updated);
      return updated;
    });
  }, []);

  const getElementsByType = useCallback((type: ElementType) => {
    return elements.filter((el) => el.type === type);
  }, [elements]);

  const getElementById = useCallback((id: string) => {
    return elements.find((el) => el.id === id) || null;
  }, [elements]);

  return {
    elements,
    isLoading,
    addElement,
    updateElement,
    deleteElement,
    getElementsByType,
    getElementById,
  };
}
