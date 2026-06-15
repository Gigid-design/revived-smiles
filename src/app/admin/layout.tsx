import type { Metadata } from "next";
import styles from "./layout.module.css";
import { AdminShell } from "./AdminShell";

export const metadata: Metadata = {
  title: "Admin Portal — Revived Smiles",
  description: "Inpatient Representative Dashboard for managing submissions and approvals.",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${styles.adminLayout} adminRoot`}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
