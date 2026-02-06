import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// n8n Webhook URL for report verification (separate from generation)
const N8N_VERIFICATION_WEBHOOK_URL = 'https://teamm8.app.n8n.cloud/webhook/verificacao-relatorio';

export interface VerificationIssue {
  type: string;
  description: string;
  severity: 'baixa' | 'média' | 'alta';
}

interface VerificationResult {
  issues_found: boolean;
  issues: VerificationIssue[];
}

export function useReportVerification() {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (reportText: string, templateType: string) => {
    setIsVerifying(true);
    setError(null);
    setVerificationResult(null);

    try {
      console.log('[Verification] Sending report for verification...');

      const response = await fetch(N8N_VERIFICATION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          final_report_text: reportText,
          template_type: templateType,
          language: 'pt-PT',
        }),
      });

      const responseText = await response.text();
      console.log('[Verification] Response status:', response.status);
      console.log('[Verification] Response body:', responseText);

      if (!response.ok) {
        throw new Error(`Erro na verificação (${response.status}): ${responseText}`);
      }

      let result: VerificationResult;

      try {
        const data = JSON.parse(responseText);

        if (data.issues_found !== undefined) {
          result = data as VerificationResult;
        } else if (Array.isArray(data.issues)) {
          result = { issues_found: data.issues.length > 0, issues: data.issues };
        } else if (Array.isArray(data)) {
          result = { issues_found: data.length > 0, issues: data };
        } else {
          result = { issues_found: false, issues: [] };
        }
      } catch {
        console.log('[Verification] Response is not JSON');
        result = { issues_found: false, issues: [] };
      }

      console.log('[Verification] Result:', result);
      setVerificationResult(result);

      toast({
        title: result.issues_found ? "Verificação concluída" : "Sem incoerências",
        description: result.issues_found
          ? `Foram encontrados ${result.issues.length} problema(s) para revisão.`
          : "Não foram encontradas incoerências no relatório.",
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[Verification] Error:', errorMessage);
      setError(errorMessage);

      toast({
        variant: "destructive",
        title: "Erro na verificação",
        description: errorMessage,
      });

      return null;
    } finally {
      setIsVerifying(false);
    }
  }, [toast]);

  const clearVerification = useCallback(() => {
    setVerificationResult(null);
    setError(null);
  }, []);

  return {
    verify,
    isVerifying,
    verificationResult,
    error,
    clearVerification,
  };
}
