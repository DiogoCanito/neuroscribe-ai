import { useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEditorStore } from '@/stores/editorStore';
import { useReportVerification, VerificationIssue } from '@/hooks/useReportVerification';
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

function SeverityBadge({ severity }: { severity: VerificationIssue['severity'] }) {
  const variants: Record<string, { label: string; className: string }> = {
    alta: { label: 'Alta', className: 'bg-destructive/15 text-destructive border-destructive/30' },
    média: { label: 'Média', className: 'bg-orange-500/15 text-orange-600 border-orange-500/30' },
    baixa: { label: 'Baixa', className: 'bg-muted text-muted-foreground border-border' },
  };
  const v = variants[severity] || variants.baixa;
  return <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${v.className}`}>{v.label}</Badge>;
}

export function ReportVerification() {
  const { reportContent, selectedTemplate } = useEditorStore();
  const { verify, isVerifying, verificationResult, error, clearVerification } = useReportVerification();

  const handleVerify = useCallback(() => {
    if (!reportContent.trim() || !selectedTemplate) return;
    verify(reportContent, selectedTemplate.name);
  }, [reportContent, selectedTemplate, verify]);

  return (
    <div className="w-56 h-full bg-muted/20 flex flex-col border-l border-border">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-border flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Verificação</span>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {/* Explanation */}
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Verifica automaticamente incoerências clínicas, laterais, anatómicas ou de consistência interna.
          </p>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={isVerifying || !reportContent.trim() || !selectedTemplate}
            size="sm"
            className="w-full gap-1.5 h-7 text-xs"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                A verificar...
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                Verificar
              </>
            )}
          </Button>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
              <div className="flex items-start gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                <p className="text-[10px] text-destructive leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {verificationResult && !error && (
            <div className="space-y-2">
              {verificationResult.issues_found && verificationResult.issues.length > 0 ? (
                <>
                  <div className="flex items-center gap-1.5 px-1">
                    <AlertTriangle className="w-3 h-3 text-destructive" />
                    <span className="text-[10px] font-medium text-destructive">
                      {verificationResult.issues.length} problema{verificationResult.issues.length > 1 ? 's' : ''} encontrado{verificationResult.issues.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {verificationResult.issues.map((issue, index) => (
                      <div
                        key={index}
                        className="rounded-md border border-border bg-background p-2 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-semibold text-foreground">{issue.type}</span>
                          <SeverityBadge severity={issue.severity} />
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {issue.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-border bg-background p-3 text-center space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-primary mx-auto" />
                  <p className="text-[10px] font-medium text-foreground">Sem incoerências</p>
                  <p className="text-[9px] text-muted-foreground">
                    Não foram encontrados problemas no relatório.
                  </p>
                </div>
              )}

              {/* Clear button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearVerification}
                className="w-full h-6 text-[10px] text-muted-foreground"
              >
                Limpar resultados
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
