/**
 * MentorAIChat — Chat de IA contínuo para o mentor por pilar
 *
 * Permite ao mentor conversar com a IA sobre as respostas do mentorado,
 * criar conclusões, identificar padrões e salvar sugestões em checklist.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles, Send, Loader2, Trash2, Plus, CheckSquare, Square,
  X, ChevronDown, ChevronUp, MessageSquare, ListChecks, RefreshCw,
  Bookmark, BookmarkCheck
} from "lucide-react";

// Streamdown for markdown rendering
let Streamdown: React.ComponentType<{ children: string }> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Streamdown = require("streamdown").default;
} catch {
  // fallback: plain text
}

interface Props {
  menteeId: number;
  pillarId: number;
  pillarTitle: string;
  /** Called when the chat is first opened to trigger an initial analysis */
  autoStart?: boolean;
}

const QUICK_PROMPTS = [
  "Analise as respostas do mentorado e me dê um diagnóstico geral",
  "Quais são os pontos fortes que você identificou?",
  "Quais são as lacunas ou pontos de atenção?",
  "Sugira próximos passos concretos para este pilar",
  "Ajude-me a construir a Missão do mentorado com base nas respostas",
  "Ajude-me a construir a Visão do mentorado com base nas respostas",
  "Gere um Ikigai sintetizado a partir das respostas",
];

export function MentorAIChat({ menteeId, pillarId, pillarTitle, autoStart = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "checklist">("chat");
  const [message, setMessage] = useState("");
  const [newSuggestion, setNewSuggestion] = useState("");
  const [addingSuggestion, setAddingSuggestion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: chatHistory, isLoading: loadingHistory } = trpc.mentorAI.getChatHistory.useQuery(
    { menteeId, pillarId },
    { enabled: isOpen }
  );

  const { data: suggestions, isLoading: loadingSuggestions } = trpc.mentorAI.getSuggestions.useQuery(
    { menteeId, pillarId },
    { enabled: isOpen }
  );

  const sendMessage = trpc.mentorAI.sendMessage.useMutation({
    onSuccess: () => {
      utils.mentorAI.getChatHistory.invalidate({ menteeId, pillarId });
      setMessage("");
    },
    onError: (e) => toast.error(e.message || "Erro ao enviar mensagem"),
  });

  const clearChat = trpc.mentorAI.clearChat.useMutation({
    onSuccess: () => {
      utils.mentorAI.getChatHistory.invalidate({ menteeId, pillarId });
      toast.success("Histórico limpo");
    },
  });

  const addSuggestion = trpc.mentorAI.addSuggestion.useMutation({
    onSuccess: () => {
      utils.mentorAI.getSuggestions.invalidate({ menteeId, pillarId });
      setNewSuggestion("");
      setAddingSuggestion(false);
      toast.success("Sugestão adicionada ao checklist");
    },
  });

  const toggleSuggestion = trpc.mentorAI.toggleSuggestion.useMutation({
    onSuccess: () => utils.mentorAI.getSuggestions.invalidate({ menteeId, pillarId }),
  });

  const deleteSuggestion = trpc.mentorAI.deleteSuggestion.useMutation({
    onSuccess: () => utils.mentorAI.getSuggestions.invalidate({ menteeId, pillarId }),
  });

  const conclusionsQuery = trpc.mentorAI.getChatConclusions.useQuery(
    { menteeId, pillarId },
    { enabled: isOpen }
  );
  const addConclusionMutation = trpc.mentorAI.addChatConclusion.useMutation({
    onSuccess: () => conclusionsQuery.refetch(),
  });

  const savedMessageIds = useMemo(() => {
    const ids = new Set<number>();
    conclusionsQuery.data?.forEach((c) => {
      if (c.chatMessageId) ids.add(c.chatMessageId);
    });
    return ids;
  }, [conclusionsQuery.data]);

  const [markingId, setMarkingId] = useState<number | null>(null);

  const handleMarkAsConclusion = async (msg: { id: number; content: string }) => {
    setMarkingId(msg.id);
    try {
      const firstLine = msg.content.split('\n')[0].replace(/^[#*\-\s]+/, '').trim();
      const titulo = firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;

      await addConclusionMutation.mutateAsync({
        menteeId,
        pillarId,
        content: msg.content,
        chatMessageId: msg.id,
        titulo,
        categoria: 'orientacao',
      });
      toast.success('Orientação salva para o relatório');
    } catch {
      toast.error('Erro ao salvar orientação');
    } finally {
      setMarkingId(null);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isOpen]);

  // Auto-start: send initial analysis when first opened with no history
  useEffect(() => {
    if (autoStart && isOpen && chatHistory && chatHistory.length === 0 && !sendMessage.isPending) {
      sendMessage.mutate({
        menteeId,
        pillarId,
        message: "Analise as respostas do mentorado neste pilar e me dê um diagnóstico inicial completo, identificando pontos fortes, lacunas e sugestões de próximos passos.",
      });
    }
  }, [autoStart, isOpen, chatHistory]);

  const handleSend = () => {
    if (!message.trim() || sendMessage.isPending) return;
    sendMessage.mutate({ menteeId, pillarId, message: message.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage.mutate({ menteeId, pillarId, message: prompt });
  };

  const pendingSuggestions = (suggestions ?? []).filter(s => !s.concluida);
  const doneSuggestions = (suggestions ?? []).filter(s => s.concluida);

  return (
    <div className="border border-violet-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header — toggle */}
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-violet-50/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-foreground">Assistente de IA — {pillarTitle}</p>
            <p className="text-xs text-muted-foreground">Chat contínuo + checklist de sugestões</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingSuggestions.length > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
              {pendingSuggestions.length} pendente{pendingSuggestions.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {chatHistory && chatHistory.length > 0 && (
            <Badge variant="secondary" className="bg-violet-100 text-violet-700 text-xs">
              {chatHistory.length} msgs
            </Badge>
          )}
          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-violet-100">
          {/* Tabs */}
          <div className="flex border-b border-violet-100 bg-violet-50/30">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "chat"
                  ? "text-violet-700 border-b-2 border-violet-500 bg-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat com IA
              {chatHistory && chatHistory.length > 0 && (
                <span className="ml-1 text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">
                  {chatHistory.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("checklist")}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "checklist"
                  ? "text-violet-700 border-b-2 border-violet-500 bg-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              Checklist
              {pendingSuggestions.length > 0 && (
                <span className="ml-1 text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                  {pendingSuggestions.length}
                </span>
              )}
            </button>
          </div>

          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <div className="flex flex-col">
              {/* Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {loadingHistory && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                  </div>
                )}

                {!loadingHistory && (!chatHistory || chatHistory.length === 0) && (
                  <div className="text-center py-8 space-y-3">
                    <Sparkles className="w-8 h-8 text-violet-300 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Inicie uma conversa com a IA sobre as respostas do mentorado neste pilar.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Use os atalhos abaixo ou escreva sua própria pergunta.
                    </p>
                  </div>
                )}

                {chatHistory?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-violet-600 text-white rounded-br-sm"
                          : "bg-white border border-violet-100 text-foreground rounded-bl-sm shadow-sm"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        Streamdown ? (
                          <Streamdown>{msg.content}</Streamdown>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        )
                      ) : (
                        <p className="leading-relaxed">{msg.content}</p>
                      )}
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                          {savedMessageIds.has(msg.id) ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <BookmarkCheck className="w-3.5 h-3.5" />
                              Incluída no relatório
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMarkAsConclusion(msg)}
                              disabled={markingId === msg.id}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600 transition-colors disabled:opacity-50"
                            >
                              {markingId === msg.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Bookmark className="w-3.5 h-3.5" />
                              )}
                              Usar como orientação
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {sendMessage.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-violet-100 rounded-xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                        <span className="text-xs text-muted-foreground">Analisando respostas...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick prompts */}
              {(!chatHistory || chatHistory.length === 0) && (
                <div className="px-4 py-3 border-t border-violet-100 bg-white">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Atalhos rápidos:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.slice(0, 4).map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickPrompt(prompt)}
                        disabled={sendMessage.isPending}
                        className="text-xs px-2.5 py-1 rounded-full border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-50"
                      >
                        {prompt.length > 40 ? prompt.slice(0, 40) + "…" : prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-violet-100 bg-white">
                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pergunte sobre o mentorado, peça análises, sugestões..."
                    rows={2}
                    className="resize-none text-sm flex-1 border-violet-200 focus:border-violet-400"
                    disabled={sendMessage.isPending}
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      onClick={handleSend}
                      disabled={!message.trim() || sendMessage.isPending}
                      className="bg-violet-600 hover:bg-violet-700 text-white h-full px-3"
                    >
                      {sendMessage.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">Enter para enviar, Shift+Enter para nova linha</p>
                  {chatHistory && chatHistory.length > 0 && (
                    <button
                      onClick={() => clearChat.mutate({ menteeId, pillarId })}
                      disabled={clearChat.isPending}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Limpar histórico
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CHECKLIST TAB */}
          {activeTab === "checklist" && (
            <div className="p-4 space-y-4">
              {/* Add suggestion */}
              {addingSuggestion ? (
                <div className="space-y-2">
                  <Textarea
                    value={newSuggestion}
                    onChange={(e) => setNewSuggestion(e.target.value)}
                    placeholder="Descreva a sugestão ou ação a ser acompanhada..."
                    rows={2}
                    className="resize-none text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => addSuggestion.mutate({
                        menteeId,
                        pillarId,
                        texto: newSuggestion.trim(),
                        categoria: "ação",
                      })}
                      disabled={!newSuggestion.trim() || addSuggestion.isPending}
                      className="flex-1"
                    >
                      {addSuggestion.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                      Adicionar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setAddingSuggestion(false); setNewSuggestion(""); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-dashed border-violet-300 text-violet-600 hover:bg-violet-50"
                  onClick={() => setAddingSuggestion(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar sugestão manualmente
                </Button>
              )}

              {loadingSuggestions && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                </div>
              )}

              {/* Pending suggestions */}
              {pendingSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Pendentes ({pendingSuggestions.length})
                  </p>
                  {pendingSuggestions.map((s) => (
                    <div key={s.id} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                      <button
                        onClick={() => toggleSuggestion.mutate({ id: s.id, concluida: true })}
                        className="mt-0.5 text-muted-foreground hover:text-emerald-600 transition-colors shrink-0"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                      <p className="text-sm text-foreground flex-1 leading-relaxed">{s.texto}</p>
                      {s.categoria && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                          {s.categoria}
                        </span>
                      )}
                      <button
                        onClick={() => deleteSuggestion.mutate({ id: s.id })}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Done suggestions */}
              {doneSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Concluídas ({doneSuggestions.length})
                  </p>
                  {doneSuggestions.map((s) => (
                    <div key={s.id} className="flex items-start gap-2 p-3 rounded-lg border border-emerald-100 bg-emerald-50/30">
                      <button
                        onClick={() => toggleSuggestion.mutate({ id: s.id, concluida: false })}
                        className="mt-0.5 text-emerald-600 hover:text-muted-foreground transition-colors shrink-0"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <p className="text-sm text-muted-foreground flex-1 leading-relaxed line-through">{s.texto}</p>
                      <button
                        onClick={() => deleteSuggestion.mutate({ id: s.id })}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!loadingSuggestions && pendingSuggestions.length === 0 && doneSuggestions.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma sugestão ainda.</p>
                  <p className="text-xs mt-1">Adicione sugestões manualmente ou peça à IA para gerar.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
