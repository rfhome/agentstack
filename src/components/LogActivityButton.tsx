"use client";

import { useRouter } from "next/navigation";
import { LogActivityModal } from "./LogActivityModal";

export function LogActivityButton() {
  const router = useRouter();
  return (
    <LogActivityModal
      onSaved={() => router.refresh()}
    />
  );
}
