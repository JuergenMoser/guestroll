/** Result of a form action, announced to screen readers. */
export function StatusMessage({ message }: { message?: { ok: boolean; text: string } }) {
  if (!message) return null;
  return (
    <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm font-medium text-ok" : "text-sm font-medium text-danger"}>
      {message.text}
    </p>
  );
}
