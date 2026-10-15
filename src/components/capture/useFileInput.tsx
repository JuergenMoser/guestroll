"use client";

import { useCallback, useRef, type ChangeEvent } from "react";

/**
 * A hidden `<input type="file">` driven by any button. `capture="environment"`
 * makes mobile browsers open the rear camera directly instead of a file chooser.
 */
export function useFileInput(onFiles: (files: File[]) => void, options: { camera: boolean; multiple: boolean }) {
  const ref = useRef<HTMLInputElement>(null);

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      // Reset so picking the same file twice in a row still fires `change`.
      e.target.value = "";
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      multiple={options.multiple}
      {...(options.camera ? { capture: "environment" as const } : {})}
      onChange={onChange}
    />
  );

  return { input, open: () => ref.current?.click() };
}
