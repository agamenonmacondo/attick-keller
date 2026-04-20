import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Iniciar sesión — Attick & Keller",
  description: "Inicia sesión para gestionar tus reservas.",
};

export default function AuthLoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}