"use client";

import {
  useLayoutEffect,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  enterKeyHintForField,
  isEnterChainField,
  resolveEnterInField,
} from "@/lib/form-enter-key";

function chainFields(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("input, select")).filter((element) => {
    if (element.closest("[aria-hidden='true']")) {
      return false;
    }
    if (element.getClientRects().length === 0) {
      return false;
    }
    if (element instanceof HTMLSelectElement) {
      return isEnterChainField({ tagName: element.tagName, disabled: element.disabled });
    }
    if (!(element instanceof HTMLInputElement)) {
      return false;
    }
    return isEnterChainField({
      tagName: element.tagName,
      type: element.type,
      disabled: element.disabled,
      readOnly: element.readOnly,
    });
  });
}

/** Sets the Android keyboard action from the field's place in the chain. */
export function syncEnterKeyHints(root: ParentNode) {
  const fields = chainFields(root);
  fields.forEach((field, index) => {
    field.setAttribute("enterkeyhint", enterKeyHintForField(index, fields.length));
  });
}

/**
 * Enter walks single-line fields inside `root` and submits on the last one.
 * A search field does not submit the surrounding form.
 */
export function applyEnterInRoot(
  root: HTMLElement,
  event: {
    key: string;
    shiftKey: boolean;
    isComposing?: boolean;
    nativeEvent?: { isComposing?: boolean };
    preventDefault: () => void;
    target: EventTarget | null;
  },
  submit: () => void,
) {
  if (event.isComposing || event.nativeEvent?.isComposing) {
    return;
  }
  const target = event.target;
  if (!(target instanceof HTMLElement) || !root.contains(target)) {
    return;
  }
  if (target instanceof HTMLInputElement && target.type === "search" && event.key === "Enter") {
    event.preventDefault();
    return;
  }
  const fields = chainFields(root);
  const action = resolveEnterInField({
    key: event.key,
    shiftKey: event.shiftKey,
    fieldCount: fields.length,
    activeIndex: fields.indexOf(target),
  });
  if (action.type === "ignore") {
    return;
  }
  event.preventDefault();
  if (action.type === "next") {
    fields[action.index]?.focus();
    return;
  }
  submit();
}

/** Spread onto a row that cannot be a form element, such as a table row. */
export function enterNextHandlers(onSubmit: () => void) {
  return {
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      applyEnterInRoot(event.currentTarget, event, onSubmit);
    },
    onFocus(event: FocusEvent<HTMLElement>) {
      syncEnterKeyHints(event.currentTarget);
    },
  };
}

type EnterNextFormProps = {
  onSubmit: () => void;
  children: ReactNode;
  className?: string;
  id?: string;
};

/**
 * Form whose Enter key moves to the next single-line field and submits on the last.
 * The Android keyboard uses that same order for its action button.
 */
export function EnterNextForm({ onSubmit, children, className, id }: EnterNextFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitGuard = useRef(false);

  const submitOnce = () => {
    if (submitGuard.current) {
      return;
    }
    submitGuard.current = true;
    onSubmit();
    queueMicrotask(() => {
      submitGuard.current = false;
    });
  };

  useLayoutEffect(() => {
    if (formRef.current) {
      syncEnterKeyHints(formRef.current);
    }
  });

  return (
    <form
      ref={formRef}
      id={id}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        submitOnce();
      }}
      onKeyDown={(event) => {
        applyEnterInRoot(event.currentTarget, event, () => {
          try {
            event.currentTarget.requestSubmit();
          } catch {
            submitOnce();
          }
        });
      }}
      onFocus={(event) => {
        syncEnterKeyHints(event.currentTarget);
      }}
    >
      {children}
    </form>
  );
}
