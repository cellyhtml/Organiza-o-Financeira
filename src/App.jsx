import React, { useState, useEffect } from 'react';

// Categoria das Dívidas com cores do Tailwind correspondentes para gráficos e badges
const CATEGORIAS = [
  { nome: 'Cartão de Crédito', cor: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  { nome: 'Empréstimo', cor: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  { nome: 'Contas de Consumo', bg: 'bg-sky-500/10', cor: '#0ea5e9', text: 'text-sky-400', border: 'border-sky-500/20' },
  { nome: 'Aluguel / Financiamento', cor: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  { nome: 'Saúde', cor: '#8b5cf6', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  { nome: 'Outros', cor: '#64748b', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' }
];

export default function App() {
  const [dividas, setDividas] = useState(() => {
    try {
      const salvas = localStorage.getItem('@financeiro:dividas');
      if (salvas) {
        const dados = JSON.parse(salvas);
        return Array.isArray(dados) ? dados : [];
      }
    } catch (error) {
      console.error("Erro ao ler dados do localStorage:", error);
    }
    return [];
  });

  const [form, setForm] = useState({
    credor: '',
    valor: '',
    vencimento: '',
    categoria: CATEGORIAS[0].nome,
    observacao: ''
  });

  const [filtroStatus, setFiltroStatus] = useState('Todas');
  const [ordenacao, setOrdenacao] = useState('vencimento'); // vencimento | valor | credor
  const [alertaVencimento, setAlertaVencimento] = useState([]);

  // Salvar no localStorage automaticamente ao mudar
  useEffect(() => {
    try {
      localStorage.setItem('@financeiro:dividas', JSON.stringify(dividas));
    } catch (error) {
      console.error("Erro ao salvar no localStorage:", error);
    }
    checarVencimentosProximos();
  }, [dividas]);

  // Verificar se há contas vencendo hoje ou nos próximos 3 dias
  const checarVencimentosProximos = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date();
    limite.setDate(hoje.getDate() + 3);
    limite.setHours(23, 59, 59, 999);

    const pendentesProximas = dividas.filter(d => {
      if (d.status === 'Pago') return false;
      const dataVenc = new Date(d.vencimento + 'T00:00:00');
      return dataVenc >= hoje && dataVenc <= limite;
    });

    setAlertaVencimento(pendentesProximas);
  };

  const verificarAtraso = (vencimento, status) => {
    if (status === 'Pago') return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVencimento = new Date(vencimento + 'T00:00:00');
    return dataVencimento < hoje;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.credor || !form.valor || !form.vencimento) {
      alert("Por favor, preencha Credor, Valor e Vencimento.");
      return;
    }

    const novaDivida = {
      id: Date.now().toString(),
      credor: form.credor,
      valor: parseFloat(form.valor),
      vencimento: form.vencimento,
      categoria: form.categoria,
      status: 'Pendente',
      observacao: form.observacao
    };

    setDividas(prev => [...prev, novaDivida]);
    setForm({
      credor: '',
      valor: '',
      vencimento: '',
      categoria: CATEGORIAS[0].nome,
      observacao: ''
    });
  };

  const alternarStatus = (id) => {
    setDividas(prev => prev.map(d => d.id === id ? { ...d, status: d.status === 'Pago' ? 'Pendente' : 'Pago' } : d));
  };

  const excluirDivida = (id) => {
    if (confirm("Deseja mesmo remover este compromisso financeiro?")) {
      setDividas(prev => prev.filter(d => d.id !== id));
    }
  };

  // Funções de Importação e Exportação de Backup (JSON)
  const exportarBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dividas, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_financeiro_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importarBackup = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const dadosImportados = JSON.parse(event.target.result);
        if (Array.isArray(dadosImportados)) {
          if (confirm(`Deseja importar ${dadosImportados.length} dívidas? Isso vai substituir os dados atuais.`)) {
            setDividas(dadosImportados);
          }
        } else {
          alert("Arquivo inválido. O backup deve ser um array JSON de dívidas.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo. Certifique-se de que é um JSON válido.");
      }
    };
  };

  const importarCSV = (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.readAsText(arquivo, "UTF-8");
    leitor.onload = (event) => {
      try {
        const texto = event.target.result;
        const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        
        if (linhas.length === 0) {
          alert("O arquivo CSV está vazio.");
          return;
        }

        const primeiraLinha = linhas[0];
        const delimitador = primeiraLinha.includes(';') ? ';' : ',';

        const novasDividas = [];
        const hojeFormatado = new Date().toISOString().split('T')[0];

        // 1. Procurar o índice do bloco "VISÃO GERAL DA DIVIDA"
        let indexVisaoGeral = -1;
        for (let i = 0; i < linhas.length; i++) {
          const linhaLower = linhas[i].toLowerCase();
          if (linhaLower.includes("visão geral da divida") || 
              linhaLower.includes("visao geral da divida") ||
              linhaLower.includes("visao geral da dívida") ||
              linhaLower.includes("visão geral da dívida")) {
            indexVisaoGeral = i;
            break;
          }
        }

        // ESTRATÉGIA A: Encontrou o bloco específico da planilha do usuário
        if (indexVisaoGeral !== -1) {
          for (let i = indexVisaoGeral + 1; i < linhas.length; i++) {
            const colunas = linhas[i].split(delimitador).map(c => c.trim());
            const credor = colunas[0];

            // Critério de parada: encontrou a linha de TOTAL do bloco ou linha em branco
            if (!credor || credor.toLowerCase() === 'total' || credor.toLowerCase().includes('total')) {
              break;
            }

            // Varre as colunas de trás para frente para achar o valor monetário da dívida
            let valor = 0;
            for (let j = colunas.length - 1; j > 0; j--) {
              const valorTratado = colunas[j].replace(/R\$\s?/i, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
              const num = parseFloat(valorTratado);
              if (!isNaN(num) && num > 0) {
                valor = num;
                break;
              }
            }

            if (credor && valor > 0) {
              // Mapeamento automático de categoria inteligente
              let categoria = 'Outros';
              const credorLower = credor.toLowerCase();
              if (credorLower.includes('nubank') || credorLower.includes('cartao') || credorLower.includes('xp')) {
                categoria = 'Cartão de Crédito';
              } else if (credorLower.includes('fixa') || credorLower.includes('luz') || credorLower.includes('agua') || credorLower.includes('internet')) {
                categoria = 'Contas de Consumo';
              } else if (credorLower.includes('aluguel') || credorLower.includes('financiamento')) {
                categoria = 'Aluguel / Financiamento';
              }

              novasDividas.push({
                id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
                credor,
                valor,
                vencimento: hojeFormatado,
                categoria,
                status: 'Pendente',
                observacao: 'Importado de resumo orçamentário'
              });
            }
          }
        } else {
          // ESTRATÉGIA B: Planilha convencional de linhas (Fallback)
          for (let i = 0; i < linhas.length; i++) {
            const colunas = linhas[i].split(delimitador).map(c => c.trim());
            if (colunas.length < 2) continue;

            const credor = colunas[0];
            if (!credor) continue;

            const credorLower = credor.toLowerCase();
            // Ignora totalizadores e metas de renda
            if (credorLower.includes('total') || 
                credorLower.includes('diferença') || 
                credorLower.includes('diferenca') || 
                credorLower.includes('renda') || 
                credorLower.includes('receber') || 
                credorLower.includes('saldo') || 
                credorLower.includes('visão geral') || 
                credorLower.includes('fatura atual')) {
              continue;
            }

            let valor = 0;
            for (let j = colunas.length - 1; j > 0; j--) {
              const valorTratado = colunas[j].replace(/R\$\s?/i, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
              const num = parseFloat(valorTratado);
              if (!isNaN(num) && num > 0) {
                valor = num;
                break;
              }
            }

            if (credor && valor > 0) {
              novasDividas.push({
                id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
                credor,
                valor,
                vencimento: hojeFormatado,
                categoria: 'Outros',
                status: 'Pendente',
                observacao: 'Importado via planilha'
              });
            }
          }
        }

        if (novasDividas.length === 0) {
          alert("Nenhuma dívida com valores válidos foi encontrada na sua planilha.");
          return;
        }

        if (confirm(`Identificamos ${novasDividas.length} dívidas na planilha. Deseja importá-las para sua lista?`)) {
          setDividas(prev => [...prev, ...novasDividas].sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento)));
        }

      } catch (err) {
        console.error(err);
        alert("Erro ao ler planilha. Certifique-se de que é um CSV válido.");
      }
    };
  };

  // Cálculos financeiros robustos
  const totais = Array.isArray(dividas) ? dividas.reduce((acc, d) => {
    const valorNum = parseFloat(d.valor) || 0;
    const atrasada = verificarAtraso(d.vencimento, d.status);
    acc.totalGeral += valorNum;
    if (d.status === 'Pago') {
      acc.pago += valorNum;
    } else if (atrasada) {
      acc.atrasado += valorNum;
      acc.pendente += valorNum;
    } else {
      acc.pendente += valorNum;
    }
    return acc;
  }, { totalGeral: 0, pago: 0, pendente: 0, atrasado: 0 }) : { totalGeral: 0, pago: 0, pendente: 0, atrasado: 0 };

  const formatarData = (vencimento) => {
    if (!vencimento) return 'Sem data';
    try {
      const data = new Date(vencimento + 'T00:00:00');
      return isNaN(data.getTime()) ? 'Data inválida' : data.toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  // Agrupamento de valores por categoria para gráfico SVG
  const distribuicaoCategorias = CATEGORIAS.map(cat => {
    const totalCat = dividas
      .filter(d => d.categoria === cat.nome && d.status !== 'Pago')
      .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);
    return { ...cat, total: totalCat };
  }).filter(c => c.total > 0);

  const totalPendentesCategoria = distribuicaoCategorias.reduce((sum, c) => sum + c.total, 0);

  // Geração de ângulos do gráfico SVG (Rosca)
  let acumuladoAngulo = 0;
  const fatiasGrafico = distribuicaoCategorias.map(c => {
    const percent = totalPendentesCategoria > 0 ? (c.total / totalPendentesCategoria) : 0;
    const angulo = percent * 360;
    const inicio = acumuladoAngulo;
    acumuladoAngulo += angulo;
    return { ...c, percent, inicio, angulo };
  });

  // Ordenação e Filtros combinados
  const dividasTratadas = Array.isArray(dividas) ? [...dividas]
    .filter(d => {
      if (filtroStatus === 'Todas') return true;
      if (filtroStatus === 'Pagas') return d.status === 'Pago';
      if (filtroStatus === 'Pendentes') return d.status === 'Pendente' && !verificarAtraso(d.vencimento, d.status);
      if (filtroStatus === 'Atrasadas') return d.status === 'Pendente' && verificarAtraso(d.vencimento, d.status);
      return true;
    })
    .sort((a, b) => {
      if (ordenacao === 'vencimento') return new Date(a.vencimento) - new Date(b.vencimento);
      if (ordenacao === 'valor') return b.valor - a.valor;
      if (ordenacao === 'credor') return a.credor.localeCompare(b.credor);
      return 0;
    }) : [];

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] p-4 sm:p-8 selection:bg-indigo-500/30 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#27272a] pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-500 bg-clip-text text-transparent">
              Organizador Financeiro
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Gerencie, planeje e planeje a quitação de seus compromissos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Botão CSV */}
            <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5">
              <span>📥 Importar Planilha (CSV)</span>
              <input type="file" accept=".csv" onChange={importarCSV} className="hidden" />
            </label>

            <button
              onClick={exportarBackup}
              className="bg-[#18181b] hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-lg border border-[#27272a] transition-all flex items-center gap-1.5"
              title="Salvar arquivo JSON no computador"
            >
              Exportar Backup
            </button>
            <label className="bg-[#18181b] hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-lg border border-[#27272a] transition-all cursor-pointer flex items-center gap-1.5">
              <span>Importar Backup</span>
              <input type="file" accept=".json" onChange={importarBackup} className="hidden" />
            </label>
          </div>
        </header>

        {/* Alerta de Contas Próximas */}
        {alertaVencimento.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-bold">Atenção! Vencimentos próximos detectados.</p>
                <p className="text-xs text-amber-400/80">Você tem {alertaVencimento.length} contas vencendo em breve ou hoje.</p>
              </div>
            </div>
            <div className="flex gap-2">
              {alertaVencimento.slice(0, 2).map(d => (
                <span key={d.id} className="bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-2.5 py-1 rounded-md border border-amber-500/30">
                  {d.credor} ({formatarData(d.vencimento)})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Indicadores / Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] relative overflow-hidden group hover:border-zinc-700 transition-all">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total de Dívidas</p>
            <p className="text-2xl font-bold mt-2 text-zinc-100">
              R$ {totais.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all"></div>
          </div>

          <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] border-l-4 border-l-emerald-500 relative overflow-hidden group hover:border-zinc-700 transition-all">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Pago</p>
            <p className="text-2xl font-bold mt-2 text-emerald-400">
              R$ {totais.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
          </div>

          <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] border-l-4 border-l-amber-500 relative overflow-hidden group hover:border-zinc-700 transition-all">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Pendente</p>
            <p className="text-2xl font-bold mt-2 text-amber-400">
              R$ {totais.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all"></div>
          </div>

          <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] border-l-4 border-l-rose-500 relative overflow-hidden group hover:border-zinc-700 transition-all">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Atrasadas / Vencidas</p>
            <p className="text-2xl font-bold mt-2 text-rose-500">
              R$ {totais.atrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition-all"></div>
          </div>
        </section>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulário e Gráfico (Col 1) */}
          <div className="space-y-6">
            
            {/* Formulário */}
            <section className="bg-[#18181b] p-6 rounded-xl border border-[#27272a]">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>➕</span> Adicionar Compromisso
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Credor / Empresa *</label>
                  <input
                    type="text"
                    name="credor"
                    value={form.credor}
                    onChange={handleChange}
                    placeholder="Ex: Nubank, Enel..."
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Valor (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valor"
                      value={form.valor}
                      onChange={handleChange}
                      placeholder="0,00"
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Vencimento *</label>
                    <input
                      type="date"
                      name="vencimento"
                      value={form.vencimento}
                      onChange={handleChange}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Categoria</label>
                  <select
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    {CATEGORIAS.map(cat => (
                      <option key={cat.nome} value={cat.nome}>{cat.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Observações (Opcional)</label>
                  <textarea
                    name="observacao"
                    value={form.observacao}
                    onChange={handleChange}
                    rows="2"
                    placeholder="Ex: parcelado em 3x..."
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  Cadastrar Dívida
                </button>
              </form>
            </section>

            {/* Gráfico SVG de Categorias */}
            {distribuicaoCategorias.length > 0 && (
              <section className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] flex flex-col items-center">
                <h3 className="text-sm font-bold text-white mb-4 self-start">Distribuição de Pendências</h3>
                
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="35" fill="none" stroke="#27272a" strokeWidth="10" />
                    {fatiasGrafico.map((fat, idx) => {
                      const circ = 2 * Math.PI * 35; // 219.9
                      const dashArray = `${(fat.percent * circ)} ${circ}`;
                      const dashOffset = `${-(fat.inicio / 360 * circ)}`;
                      return (
                        <circle
                          key={idx}
                          cx="50"
                          cy="50"
                          r="35"
                          fill="none"
                          stroke={fat.cor}
                          strokeWidth="10"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                          className="transition-all duration-500 hover:stroke-[12px] cursor-pointer"
                          title={`${fat.nome}: R$ ${fat.total}`}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold">Restante</span>
                    <span className="text-sm font-bold text-white">R$ {totalPendentesCategoria.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* Legendas do Gráfico */}
                <div className="w-full mt-6 space-y-2 text-xs">
                  {distribuicaoCategorias.map((cat, idx) => (
                    <div key={idx} className="flex justify-between items-center text-zinc-300">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.cor }}></span>
                        <span>{cat.nome}</span>
                      </div>
                      <span className="font-semibold text-zinc-100">
                        R$ {cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Listagem (Col 2 e 3) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filtros e Ordenação */}
            <div className="bg-[#18181b] p-4 rounded-xl border border-[#27272a] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              {/* Filtros Status */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {['Todas', 'Pendentes', 'Pagas', 'Atrasadas'].map(filtro => (
                  <button
                    key={filtro}
                    onClick={() => setFiltroStatus(filtro)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border cursor-pointer whitespace-nowrap ${
                      filtroStatus === filtro
                        ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30'
                        : 'bg-[#09090b] text-zinc-400 border-[#27272a] hover:text-zinc-200'
                    }`}
                  >
                    {filtro}
                  </button>
                ))}
              </div>

              {/* Ordenar por */}
              <div className="flex items-center gap-2 justify-between">
                <span className="text-xs text-zinc-400 font-semibold">Ordenar por:</span>
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value)}
                  className="bg-[#09090b] border border-[#27272a] rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="vencimento">Vencimento</option>
                  <option value="valor">Maior Valor</option>
                  <option value="credor">Ordem Alfabética</option>
                </select>
              </div>
            </div>

            {/* Lista Principal */}
            <section className="bg-[#18181b] rounded-xl border border-[#27272a] overflow-hidden">
              {dividasTratadas.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 text-sm">
                  📭 Nenhuma conta cadastrada ou encontrada para o filtro.
                </div>
              ) : (
                <div className="divide-y divide-[#27272a]">
                  {dividasTratadas.map((divida) => {
                    const atrasada = verificarAtraso(divida.vencimento, divida.status);
                    const configCategoria = CATEGORIAS.find(c => c.nome === divida.categoria) || CATEGORIAS[CATEGORIAS.length - 1];
                    
                    return (
                      <div 
                        key={divida.id} 
                        className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-900/40 transition-colors ${
                          atrasada ? 'bg-rose-950/5' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-sm text-zinc-100">{divida.credor}</h3>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${configCategoria.bg} ${configCategoria.text} ${configCategoria.border}`}>
                              {divida.categoria}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <span>📅 Vence em: {formatarData(divida.vencimento)}</span>
                            {atrasada && (
                              <span className="text-rose-500 font-bold animate-pulse text-[10px]">
                                (VENCIDA)
                              </span>
                            )}
                          </div>
                          {divida.observacao && (
                            <p className="text-xs text-zinc-500 bg-[#09090b]/50 px-2 py-1 rounded inline-block border border-zinc-800/40 mt-1 max-w-xs truncate" title={divida.observacao}>
                              💡 {divida.observacao}
                            </p>
                          )}
                        </div>

                        {/* Ações e Preço */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t border-zinc-800/60 sm:border-t-0 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <p className="font-extrabold text-sm text-zinc-100">
                              R$ {divida.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                              divida.status === 'Pago'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : atrasada
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {divida.status === 'Pago' ? 'Concluída' : atrasada ? 'Atrasada' : 'Aguardando'}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => alternarStatus(divida.id)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                divida.status === 'Pago'
                                  ? 'bg-[#09090b] hover:bg-zinc-800 text-zinc-300 border-[#27272a]'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-600/10'
                              }`}
                            >
                              {divida.status === 'Pago' ? 'Reabrir' : 'Quitar'}
                            </button>
                            <button
                              onClick={() => excluirDivida(divida.id)}
                              className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg border border-rose-500/20 text-xs font-bold transition-colors cursor-pointer"
                              title="Excluir dívida"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            
            {/* Método Bola de Neve (Estratégia de quitação de dívidas) */}
            {dividas.filter(d => d.status !== 'Pago').length > 1 && (
              <section className="bg-[#18181b] p-4 rounded-xl border border-[#27272a] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏔️</span>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Estratégia Bola de Neve para Quitação</h4>
                </div>
                <p className="text-xs text-zinc-400">
                  Foque em liquidar primeiro a dívida de menor valor. Pague o mínimo das outras e direcione todo o recurso extra para zerar a menor. Isso gera motivação rápida e elimina credores da lista!
                </p>
                <div className="bg-[#09090b] p-3 rounded-lg border border-indigo-500/10 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-indigo-400 font-bold block uppercase">Alvo Prioritário:</span>
                    <span className="text-xs font-semibold text-zinc-200">
                      {dividas
                        .filter(d => d.status !== 'Pago')
                        .sort((a, b) => a.valor - b.valor)[0]?.credor}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-zinc-100 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded">
                    R$ {dividas
                      .filter(d => d.status !== 'Pago')
                      .sort((a, b) => a.valor - b.valor)[0]?.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </section>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
