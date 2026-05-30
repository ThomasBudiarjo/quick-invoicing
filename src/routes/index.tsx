import { createFileRoute } from "@tanstack/react-router";
import QuickInvoice from "@/components/QuickInvoice";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickInvoice — Free WYSIWYG Invoice Creator" },
      { name: "description", content: "Create, edit, and export beautiful invoices directly in your browser. No login, no sign-up — free forever." },
      { property: "og:title", content: "QuickInvoice — Free WYSIWYG Invoice Creator" },
      { property: "og:description", content: "Create, edit, and export beautiful invoices directly in your browser. No login required." },
    ],
  }),
  component: QuickInvoice,
});
