import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { KeyRound, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function MenteeLogin() {
  const [code, setCode] = useState("");
  const [, navigate] = useLocation();

  const login = trpc.mentee.login.useMutation({
    onSuccess: (data) => {
      toast.success(`Bem-vindo(a), ${data.nome}!`);
      // Cookie is set by server; just navigate
      navigate("/portal");
    },
    onError: (e) => toast.error(e.message || "Código inválido. Verifique com seu mentor."),
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-primary-foreground font-bold text-xl">ITC</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-primary">MedMentoring</h1>
            <p className="text-muted-foreground text-sm mt-1">Área do Mentorado</p>
          </div>

          {/* Card */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Acesso com código</h2>
                <p className="text-xs text-muted-foreground">Digite o código fornecido pelo seu mentor</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Ex: ANA2025"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && code && login.mutate({ code })}
                  className="text-center text-lg font-mono tracking-widest h-12"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  O código é fornecido pelo seu mentor no início da mentoria
                </p>
              </div>

              <Button
                className="w-full bg-primary text-primary-foreground h-11"
                onClick={() => code && login.mutate({ code })}
                disabled={!code || login.isPending}
              >
                {login.isPending ? "Verificando..." : "Acessar Plataforma"}
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Não tem um código?{" "}
            <Link href="/#dores" className="text-primary hover:underline">
              Conheça a mentoria
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
