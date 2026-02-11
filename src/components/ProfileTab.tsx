import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Calendar, Clock, Mic, Zap, TrendingUp, BarChart3, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subDays, startOfWeek, startOfDay, isToday, isThisWeek } from 'date-fns';
import { pt } from 'date-fns/locale';
import jsPDF from 'jspdf';

interface CompletedReport {
  id: string;
  template_name: string;
  audio_duration: number | null;
  processing_time_ms: number | null;
  reprocess_count: number;
  used_verification: boolean;
  used_dark_mode: boolean;
  used_voice_commands: boolean;
  created_at: string;
}

export function ProfileTab() {
  const [reports, setReports] = useState<CompletedReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('completed_reports')
          .select('id, template_name, audio_duration, processing_time_ms, reprocess_count, used_verification, used_dark_mode, used_voice_commands, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReports(data || []);
      } catch (err) {
        console.error('Error fetching profile stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const stats = useMemo(() => {
    const total = reports.length;
    const thisWeek = reports.filter(r => isThisWeek(new Date(r.created_at), { weekStartsOn: 1 })).length;
    const today = reports.filter(r => isToday(new Date(r.created_at))).length;
    
    const totalAudioSec = reports.reduce((sum, r) => sum + (r.audio_duration || 0), 0);
    const totalAudioMin = Math.round(totalAudioSec / 60);
    const avgAudioMin = total > 0 ? (totalAudioSec / 60 / total).toFixed(1) : '0';
    
    const reportsWithProcessing = reports.filter(r => r.processing_time_ms != null);
    const avgProcessingSec = reportsWithProcessing.length > 0
      ? (reportsWithProcessing.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / reportsWithProcessing.length / 1000).toFixed(1)
      : '--';

    // Template ranking
    const templateCounts: Record<string, number> = {};
    reports.forEach(r => {
      templateCounts[r.template_name] = (templateCounts[r.template_name] || 0) + 1;
    });
    const topTemplates = Object.entries(templateCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const avgReprocess = total > 0
      ? (reports.reduce((sum, r) => sum + r.reprocess_count, 0) / total).toFixed(1)
      : '0';

    const verificationCount = reports.filter(r => r.used_verification).length;
    const verificationPct = total > 0 ? Math.round((verificationCount / total) * 100) : 0;

    const darkModePct = total > 0
      ? Math.round((reports.filter(r => r.used_dark_mode).length / total) * 100) : 0;

    const voiceCmdPct = total > 0
      ? Math.round((reports.filter(r => r.used_voice_commands).length / total) * 100) : 0;

    // Chart data: last 30 days
    const chartData: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStr = format(date, 'dd/MM');
      const dayStart = startOfDay(date).getTime();
      const dayEnd = dayStart + 86400000;
      const count = reports.filter(r => {
        const t = new Date(r.created_at).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      chartData.push({ day: dayStr, count });
    }

    // Last 7 days count for insights
    const last7 = reports.filter(r => new Date(r.created_at) >= subDays(new Date(), 7)).length;

    return {
      total, thisWeek, today, totalAudioMin, avgAudioMin, avgProcessingSec,
      topTemplates, avgReprocess, verificationCount, verificationPct,
      darkModePct, voiceCmdPct, chartData, last7,
    };
  }, [reports]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Mensal — MedReport', margin, y);
    y += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado a: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: pt })}`, margin, y);
    y += 14;

    const lines = [
      `Total de relatórios: ${stats.total}`,
      `Relatórios esta semana: ${stats.thisWeek}`,
      `Total de minutos de áudio: ${stats.totalAudioMin} min`,
      `Tempo médio de áudio por relatório: ${stats.avgAudioMin} min`,
      `Tempo médio de processamento: ${stats.avgProcessingSec}s`,
      `Nº médio de reprocessamentos: ${stats.avgReprocess}`,
      `Verificações de incoerência: ${stats.verificationPct}%`,
      '',
      'Templates mais utilizadas:',
      ...stats.topTemplates.map(([name, count], i) => `  ${i + 1}. ${name} (${count})`),
    ];

    doc.setFontSize(11);
    lines.forEach(line => {
      doc.text(line, margin, y);
      y += 7;
    });

    doc.save(`resumo-medreport-${format(new Date(), 'yyyy-MM')}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const overviewCards = [
    { label: 'Total de Relatórios', value: stats.total, icon: FileText },
    { label: 'Esta Semana', value: stats.thisWeek, icon: Calendar },
    { label: 'Hoje', value: stats.today, icon: Calendar },
    { label: 'Minutos de Áudio', value: `${stats.totalAudioMin}`, icon: Mic },
    { label: 'Média Áudio/Relatório', value: `${stats.avgAudioMin} min`, icon: Clock },
    { label: 'Tempo Processamento', value: `${stats.avgProcessingSec}s`, icon: Zap },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="max-w-5xl mx-auto p-6 space-y-8">

        {/* Section 1: Overview Cards */}
        <section>
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">Visão Geral</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {overviewCards.map((card) => (
              <Card key={card.label} className="p-4 border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className="w-4 h-4 text-primary/70" />
                  <span className="text-[11px] text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-2xl font-semibold text-foreground">{card.value}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 2: Activity Chart */}
        <section>
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">Atividade Recente</h2>
          <Card className="p-4 border-border bg-card">
            <p className="text-xs text-muted-foreground mb-3">Relatórios por dia — últimos 30 dias</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                    interval={4}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                    width={28}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: 'hsl(var(--foreground))',
                    }}
                    labelFormatter={(label) => `Dia: ${label}`}
                    formatter={(value: number) => [`${value} relatório(s)`, '']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Section 3: Detailed Stats */}
        <section>
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">Estatísticas Detalhadas</h2>
          <Card className="p-4 border-border bg-card">
            <div className="space-y-4">
              {/* Top Templates */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Templates mais utilizadas</p>
                {stats.topTemplates.length > 0 ? (
                  <div className="space-y-1.5">
                    {stats.topTemplates.map(([name, count], i) => (
                      <div key={name} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{i + 1}. {name}</span>
                        <span className="text-muted-foreground text-xs">{count} relatório(s)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/60">Sem dados disponíveis.</p>
                )}
              </div>

              <div className="h-px bg-border" />

              {/* Other stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatItem label="Média reprocessamentos" value={stats.avgReprocess} />
                <StatItem label="Verificações realizadas" value={`${stats.verificationCount} (${stats.verificationPct}%)`} />
                <StatItem label="Uso modo noturno" value={`${stats.darkModePct}%`} />
                <StatItem label="Uso comandos de voz" value={`${stats.voiceCmdPct}%`} />
              </div>
            </div>
          </Card>
        </section>

        {/* Section 4: Insights */}
        <section>
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">Resumo</h2>
          <Card className="p-4 border-border bg-card space-y-2">
            <InsightLine text={`Nos últimos 7 dias realizou ${stats.last7} relatório(s).`} />
            <InsightLine text={`O seu tempo médio de relato é de ${stats.avgAudioMin} minutos.`} />
            {stats.topTemplates.length > 0 && (
              <InsightLine text={`A template mais utilizada é: ${stats.topTemplates[0][0]}.`} />
            )}
            {stats.total > 0 && (
              <InsightLine text={`Utiliza verificação de incoerência em ${stats.verificationPct}% dos exames.`} />
            )}
          </Card>
        </section>

        {/* Export Button */}
        <div className="flex justify-end pb-4">
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            Exportar Resumo Mensal (PDF)
          </Button>
        </div>

      </div>
    </ScrollArea>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function InsightLine({ text }: { text: string }) {
  return (
    <p className="text-sm text-foreground/80 flex items-start gap-2">
      <TrendingUp className="w-3.5 h-3.5 text-primary/60 mt-0.5 shrink-0" />
      {text}
    </p>
  );
}

