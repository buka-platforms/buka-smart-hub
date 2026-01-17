"use client";

import { jotaiStore } from "@/data/store";
import { Provider } from "jotai";
import React from "react";

export default function JotaiProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Provider store={jotaiStore}>{children}</Provider>;
}
