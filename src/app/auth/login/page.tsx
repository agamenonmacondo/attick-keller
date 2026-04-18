import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Iniciar sesión — Attick & Keller",
  description: "Inicia sesión para gestionar tus reservas.",
};

export default function AuthLoginPage() {
  return <LoginClient />
}