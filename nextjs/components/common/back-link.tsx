"use client";

export function BackLink() {
  return (
    <a
      href="#"
      className="underline underline-offset-4"
      onClick={(e) => {
        e.preventDefault();
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = "/";
        }
      }}
    >
      Back to previous page
    </a>
  );
}
