import { useCallback, useState } from "react";

export type AccountNoticeTone = "error" | "success";

/** Message plus tone for one account section. Clearing keeps the last tone. */
export function useAccountNotice(initialTone: AccountNoticeTone) {
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<AccountNoticeTone>(initialTone);

  const show = useCallback((nextTone: AccountNoticeTone, nextMessage: string) => {
    setTone(nextTone);
    setMessage(nextMessage);
  }, []);
  const clear = useCallback(() => setMessage(null), []);

  return { message, tone, show, clear };
}

export type AccountNotice = ReturnType<typeof useAccountNotice>;
