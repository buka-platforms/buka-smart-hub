"use client";

import { requestHeadersStateAtom } from "@/data/store";
import type { RequestHeaders } from "@/data/type";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

export default function RequestHeadersProvider({
  requestHeaders,
}: {
  requestHeaders: RequestHeaders;
}) {
  const setRequestHeaders = useSetAtom(requestHeadersStateAtom);
  useEffect(() => {
    setRequestHeaders(requestHeaders);
  }, [requestHeaders, setRequestHeaders]);
  return null;
}
