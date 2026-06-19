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
  const [mostrarModalColar, setMostrarModalColar] = useState(false);
  const [textoColado, setTextoColado] = useState('');

  // Estados do PWA, Edição e Navegação
  const [abaPrincipal, setAbaPrincipal] = useState('painel'); // painel | graficos
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    credor: '',
    valor: '',
    vencimento: '',
    categoria: CATEGORIAS[0].nome,
    observacao: '',
    status: 'Pendente'
  });
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);

  // Estados do PWA e Responsividade Móvel
  const [abaAtiva, setAbaAtiva] = useState('dividas'); // dividas | orcamento | adicionar
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mostrarBotaoInstalar, setMostrarBotaoInstalar] = useState(false);
  const [mostrarModalAjudaInstalacao, setMostrarModalAjudaInstalacao] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMostrarBotaoInstalar(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setMostrarBotaoInstalar(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const instalarApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Escolha de instalação: ${outcome}`);
    setDeferredPrompt(null);
    setMostrarBotaoInstalar(false);
  };

  const [salario, setSalario] = useState(() => {
    const salvo = localStorage.getItem('@financeiro:salario');
    return salvo ? parseFloat(salvo) : 0;
  });
  const [rendaExtra, setRendaExtra] = useState(() => {
    const salvo = localStorage.getItem('@financeiro:rendaExtra');
    return salvo ? parseFloat(salvo) : 0;
  });

  useEffect(() => {
    localStorage.setItem('@financeiro:salario', salario.toString());
    localStorage.setItem('@financeiro:rendaExtra', rendaExtra.toString());
  }, [salario, rendaExtra]);

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

  const iniciarEdicao = (divida) => {
    setEditId(divida.id);
    setEditForm({
      credor: divida.credor,
      valor: divida.valor.toString(),
      vencimento: divida.vencimento,
      categoria: divida.categoria,
      observacao: divida.observacao || '',
      status: divida.status || 'Pendente'
    });
    setMostrarModalEditar(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editForm.credor || !editForm.valor || !editForm.vencimento) {
      alert("Por favor, preencha Credor, Valor e Vencimento.");
      return;
    }

    setDividas(prev => prev.map(d => d.id === editId ? {
      ...d,
      credor: editForm.credor,
      valor: parseFloat(editForm.valor),
      vencimento: editForm.vencimento,
      categoria: editForm.categoria,
      observacao: editForm.observacao,
      status: editForm.status
    } : d));

    setMostrarModalEditar(false);
    setEditId(null);
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
    // Lemos como ISO-8859-1 para dar suporte perfeito ao padrão Windows/Excel nacional (ANSI)
    leitor.readAsText(arquivo, "ISO-8859-1");
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

        // 1. Procurar o índice do bloco "VISÃO GERAL DA DIVIDA" de forma extremamente tolerante
        let indexVisaoGeral = -1;
        for (let i = 0; i < linhas.length; i++) {
          const linhaNormalizada = linhas[i].toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""); // Remove acentos temporariamente para busca
          
          if (linhaNormalizada.includes("visao geral da divida") || 
              linhaNormalizada.includes("visao geral da devida") ||
              (linhas[i].toLowerCase().includes("vis") && linhas[i].toLowerCase().includes("geral") && linhas[i].toLowerCase().includes("divid"))) {
            indexVisaoGeral = i;
            break;
          }
        }

        // ESTRATÉGIA A: Bloco específico do seu Excel
        if (indexVisaoGeral !== -1) {
          for (let i = indexVisaoGeral + 1; i < linhas.length; i++) {
            const colunas = linhas[i].split(delimitador).map(c => c.trim());
            const credor = colunas[0];

            // Condição de parada (Fim do bloco de visão geral)
            if (!credor || credor.toLowerCase() === 'total' || credor.toLowerCase().includes('total')) {
              break;
            }

            let valor = 0;
            for (let j = colunas.length - 1; j > 0; j--) {
              // Limpeza Ultra-Segura: Remove tudo que não for número, vírgula, ponto ou sinal de menos
              let valorTratado = colunas[j].replace(/[^0-9,-]/g, '');
              valorTratado = valorTratado.replace(/\./g, '').replace(',', '.');
              const num = parseFloat(valorTratado);
              if (!isNaN(num) && num > 0) {
                valor = num;
                break;
              }
            }

            if (credor && valor > 0) {
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
                observacao: 'Importado de visão geral'
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
              let valorTratado = colunas[j].replace(/[^0-9,-]/g, '');
              valorTratado = valorTratado.replace(/\./g, '').replace(',', '.');
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

  const processarDadosColados = (texto) => {
    try {
      const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      
      if (linhas.length === 0) {
        alert("O texto colado está vazio.");
        return false;
      }

      const delimitador = '\t';
      const novasDividas = [];
      const hojeFormatado = new Date().toISOString().split('T')[0];

      let indexVisaoGeral = -1;
      for (let i = 0; i < linhas.length; i++) {
        const linhaNormalizada = linhas[i].toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        
        if (linhaNormalizada.includes("visao geral da divida") || 
            linhaNormalizada.includes("visao geral da devida") ||
            (linhas[i].toLowerCase().includes("vis") && linhas[i].toLowerCase().includes("geral") && linhas[i].toLowerCase().includes("divid"))) {
          indexVisaoGeral = i;
          break;
        }
      }

      if (indexVisaoGeral !== -1) {
        for (let i = indexVisaoGeral + 1; i < linhas.length; i++) {
          const colunas = linhas[i].split(delimitador).map(c => c.trim());
          const credor = colunas[0];

          if (!credor || credor.toLowerCase() === 'total' || credor.toLowerCase().includes('total')) {
            break;
          }

          let valor = 0;
          for (let j = colunas.length - 1; j > 0; j--) {
            let valorTratado = colunas[j].replace(/[^0-9,-]/g, '');
            valorTratado = valorTratado.replace(/\./g, '').replace(',', '.');
            const num = parseFloat(valorTratado);
            if (!isNaN(num) && num > 0) {
              valor = num;
              break;
            }
          }

          if (credor && valor > 0) {
            let categoria = 'Outros';
            const credorLower = credor.toLowerCase();
            if (credorLower.includes('nubank') || credorLower.includes('cartao') || credorLower.includes('xp')) {
              categoria = 'Cartão de Crédito';
            } else if (credorLower.includes('fixa') || credorLower.includes('luz') || credorLower.includes('agua') || credorLower.includes('internet')) {
              categoria = 'Contas de Consumo';
            }

            novasDividas.push({
              id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
              credor,
              valor,
              vencimento: hojeFormatado,
              categoria,
              status: 'Pendente',
              observacao: 'Importado de visão geral (Ctrl+V)'
            });
          }
        }
      } else {
        for (let i = 0; i < linhas.length; i++) {
          const colunas = linhas[i].split(delimitador).map(c => c.trim());
          if (colunas.length < 2) continue;

          const credor = colunas[0];
          if (!credor) continue;

          const credorLower = credor.toLowerCase();
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
            let valorTratado = colunas[j].replace(/[^0-9,-]/g, '');
            valorTratado = valorTratado.replace(/\./g, '').replace(',', '.');
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
              observacao: 'Importado via Ctrl+V'
            });
          }
        }
      }

      if (novasDividas.length === 0) {
        alert("Nenhuma dívida com valores válidos foi identificada no texto colado.");
        return false;
      }

      if (confirm(`Deseja importar ${novasDividas.length} dívidas copiadas do Excel?`)) {
        setDividas(prev => [...prev, ...novasDividas].sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento)));
        return true;
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao ler dados colados.");
    }
    return false;
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
            {/* Botões do PWA (Instalar) */}
            {mostrarBotaoInstalar ? (
              <button
                onClick={instalarApp}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg border border-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-550/20"
              >
                <span>📲 Instalar Aplicativo</span>
              </button>
            ) : (
              <button
                onClick={() => setMostrarModalAjudaInstalacao(true)}
                className="bg-[#18181b] hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-lg border border-[#27272a] transition-all flex items-center gap-1.5 cursor-pointer"
                title="Aprenda a instalar como aplicativo no seu celular"
              >
                <span>📲 Instalar no Celular</span>
              </button>
            )}

            {/* Botão de Colar do Excel */}
            <button
              onClick={() => setMostrarModalColar(true)}
              className="bg-[#18181b] hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-lg border border-[#27272a] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>📋 Colar do Excel (Ctrl+V)</span>
            </button>

            {/* Botão CSV */}
            <label className="bg-[#18181b] hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-lg border border-[#27272a] transition-all cursor-pointer flex items-center gap-1.5">
              <span>Planilha (CSV)</span>
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

        {/* Seletor de Aba Principal */}
        <div className="flex border-b border-zinc-800 gap-6">
          <button
            onClick={() => setAbaPrincipal('painel')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              abaPrincipal === 'painel' 
                ? 'text-indigo-400 font-bold' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Painel Geral
            {abaPrincipal === 'painel' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setAbaPrincipal('graficos')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              abaPrincipal === 'graficos' 
                ? 'text-indigo-400 font-bold' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Gráficos & Análises
            {abaPrincipal === 'graficos' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            )}
          </button>
        </div>

        {abaPrincipal === 'painel' ? (
          <>
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

        {/* Tabs Mobile para melhor visualização responsiva */}
        <div className="flex border-b border-zinc-800 lg:hidden mb-4 bg-[#18181b]/50 rounded-xl p-1 gap-1">
          <button 
            type="button"
            onClick={() => setAbaAtiva('dividas')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              abaAtiva === 'dividas' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📋 Dívidas ({dividasTratadas.length})
          </button>
          <button 
            type="button"
            onClick={() => setAbaAtiva('orcamento')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              abaAtiva === 'orcamento' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            💰 Orçamento
          </button>
          <button 
            type="button"
            onClick={() => setAbaAtiva('adicionar')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              abaAtiva === 'adicionar' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ➕ Adicionar
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulário e Gráfico (Col 1) */}
          <div className={`space-y-6 ${abaAtiva === 'dividas' ? 'hidden lg:block' : ''}`}>
            
            {/* Card de Renda e Saldo Liberado */}
            <section className={`bg-[#18181b] p-6 rounded-xl border border-[#27272a] space-y-4 ${abaAtiva === 'orcamento' ? 'block' : 'hidden lg:block'}`}>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>💰</span> Renda & Orçamento
              </h2>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Salário Principal</label>
                    <input
                      type="number"
                      step="0.01"
                      value={salario || ''}
                      onChange={(e) => setSalario(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Renda Extra</label>
                    <input
                      type="number"
                      step="0.01"
                      value={rendaExtra || ''}
                      onChange={(e) => setRendaExtra(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="bg-[#09090b] p-4 rounded-lg border border-zinc-800 space-y-2 mt-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Renda Total:</span>
                    <span className="font-semibold text-zinc-200">
                      R$ {(salario + rendaExtra).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs text-zinc-400 border-b border-zinc-800/60 pb-2">
                    <span>Contas Pendentes:</span>
                    <span className="font-semibold text-amber-400">
                      - R$ {totais.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Saldo Liberado (Sobrar após pagar as contas pendentes) */}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-bold text-zinc-300">Saldo Disponível:</span>
                    <span className={`text-sm font-extrabold ${
                      (salario + rendaExtra) - totais.pendente >= 0 ? 'text-emerald-400' : 'text-rose-500 animate-pulse'
                    }`}>
                      R$ {((salario + rendaExtra) - totais.pendente).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Diferença geral (Renda Total - Dívidas Totais) */}
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1 border-t border-zinc-900 mt-1">
                    <span>Diferença Geral:</span>
                    <span className={`font-semibold ${
                      (salario + rendaExtra) - totais.totalGeral >= 0 ? 'text-zinc-400' : 'text-rose-500/80'
                    }`}>
                      R$ {((salario + rendaExtra) - totais.totalGeral).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Formulário */}
            <section className={`bg-[#18181b] p-6 rounded-xl border border-[#27272a] ${abaAtiva === 'adicionar' ? 'block' : 'hidden lg:block'}`}>
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
              <section className={`bg-[#18181b] p-6 rounded-xl border border-[#27272a] flex flex-col items-center ${abaAtiva === 'orcamento' ? 'block' : 'hidden lg:block'}`}>
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
                          onMouseEnter={() => setHoveredSlice({ tipo: 'sidebar', label: fat.nome, valor: fat.total, percent: fat.percent })}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col justify-center items-center text-center pointer-events-none px-4">
                    <span className="text-[9px] text-zinc-400 uppercase font-semibold truncate max-w-[90px]">
                      {hoveredSlice && hoveredSlice.tipo === 'sidebar' ? hoveredSlice.label : 'Restante'}
                    </span>
                    <span className="text-sm font-bold text-white">
                      R$ {(hoveredSlice && hoveredSlice.tipo === 'sidebar' ? hoveredSlice.valor : totalPendentesCategoria).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </span>
                    {hoveredSlice && hoveredSlice.tipo === 'sidebar' && (
                      <span className="text-[9px] text-indigo-400 font-bold">
                        {(hoveredSlice.percent * 100).toFixed(0)}%
                      </span>
                    )}
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
          <div className={`lg:col-span-2 space-y-4 ${abaAtiva === 'dividas' ? 'block' : 'hidden lg:block'}`}>
            
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
                              onClick={() => iniciarEdicao(divida)}
                              className="p-2.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                              title="Editar compromisso"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => excluirDivida(divida.id)}
                              className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg border border-rose-500/20 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
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
        </>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Linha de Indicadores Avançados */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Comprometimento de Renda Card */}
              <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] flex flex-col justify-between h-full relative overflow-hidden group hover:border-zinc-700 transition-all">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400">Comprometimento de Renda</h3>
                  <p className="text-xs text-zinc-500">Qual fração do seu orçamento total está comprometido.</p>
                </div>
                
                <div className="my-4 flex justify-center">
                  {(() => {
                    const rendaTotal = salario + rendaExtra;
                    const pctComprometido = rendaTotal > 0 ? (totais.totalGeral / rendaTotal) * 100 : 0;
                    
                    let corGauge = '#10b981';
                    let textoStatus = 'Saudável';
                    let corTexto = 'text-emerald-400';
                    if (pctComprometido > 35 && pctComprometido <= 60) {
                      corGauge = '#f59e0b';
                      textoStatus = 'Atenção';
                      corTexto = 'text-amber-400';
                    } else if (pctComprometido > 60) {
                      corGauge = '#ef4444';
                      textoStatus = 'Crítico';
                      corTexto = 'text-rose-500';
                    }

                    const circGauge = Math.PI * 35;
                    const dashArrayGauge = `${Math.min(pctComprometido, 100) / 100 * circGauge} ${circGauge}`;

                    return (
                      <div className="relative w-40 h-24">
                        <svg className="w-full h-full" viewBox="0 0 100 60">
                          <path 
                            d="M 15 50 A 35 35 0 0 1 85 50" 
                            fill="none" 
                            stroke="#27272a" 
                            strokeWidth="8" 
                            strokeLinecap="round" 
                          />
                          {rendaTotal > 0 && (
                            <path 
                              d="M 15 50 A 35 35 0 0 1 85 50" 
                              fill="none" 
                              stroke={corGauge} 
                              strokeWidth="8" 
                              strokeLinecap="round" 
                              strokeDasharray={dashArrayGauge}
                              className="transition-all duration-500"
                            />
                          )}
                        </svg>
                        <div className="absolute bottom-1 inset-x-0 flex flex-col items-center justify-center text-center pointer-events-none">
                          <span className="text-xl font-black text-white">{pctComprometido.toFixed(1)}%</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${corTexto}`}>{textoStatus}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="text-xs text-zinc-400 bg-[#09090b] p-3 rounded-lg border border-zinc-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Renda Mensal:</span>
                    <span className="font-semibold text-zinc-100">R$ {(salario + rendaExtra).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comprometido:</span>
                    <span className="font-semibold text-rose-400">R$ {totais.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Status de Pagamentos Card */}
              <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] flex flex-col justify-between h-full relative overflow-hidden group hover:border-zinc-700 transition-all">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400">Status Geral de Contas</h3>
                  <p className="text-xs text-zinc-500">Progresso de quitação e contas atrasadas.</p>
                </div>

                <div className="my-2">
                  {(() => {
                    const totalPago = totais.pago;
                    const totalPendentePrazo = totais.pendente - totais.atrasado;
                    const totalAtrasado = totais.atrasado;
                    const totalDívidas = totais.totalGeral;

                    const statusFatias = [
                      { nome: 'Pagas', valor: totalPago, cor: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
                      { nome: 'No Prazo', valor: totalPendentePrazo, cor: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-400' },
                      { nome: 'Atrasadas', valor: totalAtrasado, cor: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-400' }
                    ].filter(f => f.valor > 0);

                    const totalStatusVal = statusFatias.reduce((sum, f) => sum + f.valor, 0);
                    
                    let acumuladoStatusAngulo = 0;
                    const statusFatiasGrafico = statusFatias.map(f => {
                      const percent = totalStatusVal > 0 ? (f.valor / totalStatusVal) : 0;
                      const angulo = percent * 360;
                      const inicio = acumuladoStatusAngulo;
                      acumuladoStatusAngulo += angulo;
                      return { ...f, percent, inicio, angulo };
                    });

                    if (totalDívidas === 0) {
                      return <p className="text-center text-zinc-500 text-xs py-8">Nenhuma conta cadastrada.</p>;
                    }

                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-28 h-28 shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="35" fill="none" stroke="#27272a" strokeWidth="10" />
                            {statusFatiasGrafico.map((fat, idx) => {
                              const circ = 2 * Math.PI * 35;
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
                                  onMouseEnter={() => setHoveredSlice({ tipo: 'status', label: fat.nome, valor: fat.valor, percent: fat.percent })}
                                  onMouseLeave={() => setHoveredSlice(null)}
                                />
                              );
                            })}
                          </svg>
                          <div className="absolute inset-0 flex flex-col justify-center items-center text-center pointer-events-none">
                            <span className="text-[8px] text-zinc-400 uppercase font-semibold">
                              {hoveredSlice && hoveredSlice.tipo === 'status' ? hoveredSlice.label : 'Quitação'}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {hoveredSlice && hoveredSlice.tipo === 'status' 
                                ? `${(hoveredSlice.percent * 100).toFixed(0)}%` 
                                : `${(totalDívidas > 0 ? (totalPago / totalDívidas) * 100 : 0).toFixed(0)}%`
                              }
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-1.5 w-full text-xs">
                          {statusFatias.map((sf, idx) => (
                            <div key={idx} className="flex justify-between items-center text-zinc-300">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sf.cor }}></span>
                                <span>{sf.nome}</span>
                              </div>
                              <span className="font-semibold text-zinc-100">
                                R$ {sf.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="text-xs text-zinc-500 text-center border-t border-zinc-800/40 pt-2.5 mt-2">
                  💡 Passe o mouse nas fatias do gráfico para detalhes.
                </div>
              </div>

              {/* Card de Insights Rápidos */}
              <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] flex flex-col justify-between h-full relative overflow-hidden group hover:border-zinc-700 transition-all">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400">Insights Rápidos</h3>
                  <p className="text-xs text-zinc-500">Destaques automáticos baseados nos seus dados.</p>
                </div>
                
                <div className="my-3 space-y-3 text-xs">
                  {(() => {
                    const rendaTotal = salario + rendaExtra;
                    const pendentes = dividas.filter(d => d.status !== 'Pago');
                    const atrasadas = dividas.filter(d => d.status === 'Pendente' && verificarAtraso(d.vencimento, d.status));
                    const totalDívidas = totais.totalGeral;

                    if (dividas.length === 0) {
                      return <p className="text-zinc-500 italic">Cadastre compromissos para obter insights.</p>;
                    }

                    const maiorDivida = [...dividas].sort((a, b) => b.valor - a.valor)[0];
                    const catMap = dividas.reduce((acc, d) => {
                      acc[d.categoria] = (acc[d.categoria] || 0) + d.valor;
                      return acc;
                    }, {});
                    const maiorCat = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a])[0];

                    return (
                      <div className="space-y-2">
                        {maiorDivida && (
                          <div className="bg-[#09090b] p-2.5 rounded-lg border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Maior Compromisso:</span>
                            <span className="text-zinc-200 font-semibold">{maiorDivida.credor}</span> — <span className="text-indigo-400 font-semibold">R$ {maiorDivida.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {maiorCat && (
                          <div className="bg-[#09090b] p-2.5 rounded-lg border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Categoria com Mais Gastos:</span>
                            <span className="text-zinc-200 font-semibold">{maiorCat}</span> — <span className="text-amber-400 font-semibold">R$ {catMap[maiorCat].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {atrasadas.length > 0 && (
                          <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-rose-300">
                            <strong>Atenção:</strong> Você tem {atrasadas.length} contas em atraso somando R$ {atrasadas.reduce((s, d) => s + d.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                
                <div className="text-[10px] text-zinc-500 text-center">
                  Atualizado em tempo real
                </div>
              </div>

            </div>

            {/* Linha dos Gráficos de Detalhamento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Gráfico 1: Evolução Mensal / Contas por Mês */}
              <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Cronograma de Vencimentos</h3>
                  <p className="text-xs text-zinc-400">Total de compromissos agrupados por mês de vencimento.</p>
                </div>

                <div className="relative h-64 flex items-end justify-center w-full">
                  {(() => {
                    const contasPorMes = dividas.reduce((acc, d) => {
                      if (!d.vencimento) return acc;
                      const partes = d.vencimento.split('-');
                      if (partes.length < 2) return acc;
                      const chave = `${partes[0]}-${partes[1]}`;
                      if (!acc[chave]) {
                        acc[chave] = { pago: 0, pendente: 0, total: 0 };
                      }
                      const val = parseFloat(d.valor) || 0;
                      if (d.status === 'Pago') {
                        acc[chave].pago += val;
                      } else {
                        acc[chave].pendente += val;
                      }
                      acc[chave].total += val;
                      return acc;
                    }, {});

                    const mesesOrdenados = Object.keys(contasPorMes).sort().map(chave => {
                      const [ano, mes] = chave.split('-');
                      const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                      const label = `${nomesMeses[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
                      return {
                        chave,
                        label,
                        pago: contasPorMes[chave].pago,
                        pendente: contasPorMes[chave].pendente,
                        total: contasPorMes[chave].total
                      };
                    });

                    if (mesesOrdenados.length === 0) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
                          Nenhum vencimento registrado.
                        </div>
                      );
                    }

                    const maxVal = Math.max(...mesesOrdenados.map(m => m.total), 100);
                    const paddingLeft = 50;
                    const paddingRight = 20;
                    const paddingTop = 20;
                    const paddingBottom = 40;
                    const graphWidth = 500 - paddingLeft - paddingRight;
                    const graphHeight = 220 - paddingTop - paddingBottom;
                    const columnSpace = graphWidth / mesesOrdenados.length;
                    const barWidth = Math.min(28, columnSpace * 0.55);

                    const gridValores = [0, 0.25, 0.5, 0.75, 1];

                    return (
                      <div className="w-full h-full flex flex-col justify-between">
                        <svg className="w-full h-56" viewBox="0 0 500 220">
                          {/* Grid Lines */}
                          {gridValores.map((gv, idx) => {
                            const y = paddingTop + graphHeight - gv * graphHeight;
                            const valorGrid = gv * maxVal;
                            return (
                              <g key={idx} className="opacity-40">
                                <line 
                                  x1={paddingLeft} 
                                  y1={y} 
                                  x2={500 - paddingRight} 
                                  y2={y} 
                                  stroke="#27272a" 
                                  strokeWidth="1" 
                                  strokeDasharray="3 3" 
                                />
                                <text 
                                  x={paddingLeft - 8} 
                                  y={y + 4} 
                                  fill="#a1a1aa" 
                                  fontSize="9" 
                                  textAnchor="end"
                                >
                                  R$ {valorGrid.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                </text>
                              </g>
                            );
                          })}

                          {/* Barras */}
                          {mesesOrdenados.map((m, idx) => {
                            const x = paddingLeft + idx * columnSpace + (columnSpace - barWidth) / 2;
                            const pagoHeight = (m.pago / maxVal) * graphHeight;
                            const pendenteHeight = (m.pendente / maxVal) * graphHeight;

                            const yPago = paddingTop + graphHeight - pagoHeight;
                            const yPendente = yPago - pendenteHeight;

                            return (
                              <g key={idx}>
                                {m.pago > 0 && (
                                  <rect
                                    x={x}
                                    y={yPago}
                                    width={barWidth}
                                    height={pagoHeight}
                                    fill="#10b981"
                                    rx="2"
                                    className="transition-all duration-300 opacity-85 hover:opacity-100"
                                  />
                                )}
                                {m.pendente > 0 && (
                                  <rect
                                    x={x}
                                    y={yPendente}
                                    width={barWidth}
                                    height={pendenteHeight}
                                    fill="#f59e0b"
                                    rx="2"
                                    className="transition-all duration-300 opacity-85 hover:opacity-100"
                                  />
                                )}
                                <text
                                  x={x + barWidth / 2}
                                  y={220 - paddingBottom + 18}
                                  fill="#d4d4d8"
                                  fontSize="10"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {m.label}
                                </text>

                                <rect
                                  x={x - (columnSpace - barWidth) / 2}
                                  y={paddingTop}
                                  width={columnSpace}
                                  height={graphHeight}
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredBar(m)}
                                  onMouseLeave={() => setHoveredBar(null)}
                                />
                              </g>
                            );
                          })}

                          <line 
                            x1={paddingLeft} 
                            y1={paddingTop + graphHeight} 
                            x2={500 - paddingRight} 
                            y2={paddingTop + graphHeight} 
                            stroke="#3f3f46" 
                            strokeWidth="1.5" 
                          />
                        </svg>

                        <div className="h-10 text-center flex justify-center items-center bg-[#09090b] rounded-lg border border-zinc-800 mx-2 text-xs">
                          {hoveredBar ? (
                            <div className="flex gap-4">
                              <span className="font-semibold text-zinc-300">{hoveredBar.label}:</span>
                              <span className="text-emerald-400 font-semibold">Pago: R$ {hoveredBar.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              <span className="text-amber-400 font-semibold">Pendente: R$ {hoveredBar.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              <span className="text-zinc-100 font-bold border-l border-zinc-800 pl-3">Total: R$ {hoveredBar.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-500 italic">Passe o mouse nas colunas para detalhar os valores</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Gráfico 2: Distribuição Geral por Categorias */}
              <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-white">Despesas por Categoria</h3>
                    <p className="text-xs text-zinc-400">Distribuição geral de todas as dívidas por categoria.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                  {(() => {
                    const distribuicaoCategoriasTodas = CATEGORIAS.map(cat => {
                      const totalCat = dividas
                        .filter(d => d.categoria === cat.nome)
                        .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);
                      return { ...cat, total: totalCat };
                    }).filter(c => c.total > 0);

                    const totalGeralCategoria = distribuicaoCategoriasTodas.reduce((sum, c) => sum + c.total, 0);
                    const totalDívidas = totais.totalGeral;

                    let acumuladoCatGeralAngulo = 0;
                    const fatiasCatGeralGrafico = distribuicaoCategoriasTodas.map(c => {
                      const percent = totalGeralCategoria > 0 ? (c.total / totalGeralCategoria) : 0;
                      const angulo = percent * 360;
                      const inicio = acumuladoCatGeralAngulo;
                      acumuladoCatGeralAngulo += angulo;
                      return { ...c, percent, inicio, angulo };
                    });

                    if (fatiasCatGeralGrafico.length === 0) {
                      return <div className="text-zinc-500 text-sm py-12">Nenhuma categoria registrada.</div>;
                    }

                    return (
                      <>
                        <div className="relative w-44 h-44 shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="35" fill="none" stroke="#27272a" strokeWidth="10" />
                            {fatiasCatGeralGrafico.map((fat, idx) => {
                              const circ = 2 * Math.PI * 35;
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
                                  onMouseEnter={() => setHoveredSlice({ tipo: 'categoria', label: fat.nome, valor: fat.total, percent: fat.percent })}
                                  onMouseLeave={() => setHoveredSlice(null)}
                                />
                              );
                            })}
                          </svg>
                          <div className="absolute inset-0 flex flex-col justify-center items-center text-center pointer-events-none px-4">
                            <span className="text-[9px] text-zinc-400 uppercase font-semibold truncate max-w-[110px]">
                              {hoveredSlice && hoveredSlice.tipo === 'categoria' ? hoveredSlice.label : 'Dívidas'}
                            </span>
                            <span className="text-sm font-bold text-white">
                              R$ {(hoveredSlice && hoveredSlice.tipo === 'categoria' ? hoveredSlice.valor : totalDívidas).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-[9px] text-indigo-400 font-bold">
                              {hoveredSlice && hoveredSlice.tipo === 'categoria' ? `${(hoveredSlice.percent * 100).toFixed(1)}%` : '100%'}
                            </span>
                          </div>
                        </div>

                        <div className="w-full space-y-2 text-xs">
                          {fatiasCatGeralGrafico.map((cat, idx) => (
                            <div key={idx} className="flex justify-between items-center text-zinc-300">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.cor }}></span>
                                <span>{cat.nome}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-zinc-100">
                                  R$ {cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-zinc-500 block">
                                  {(cat.percent * 100).toFixed(0)}% do total
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* Método Bola de Neve no Painel de Análise */}
            {(() => {
              const pendentes = dividas.filter(d => d.status !== 'Pago');
              if (pendentes.length > 1) {
                const pendentesOrdenadas = [...pendentes].sort((a, b) => a.valor - b.valor);
                const alvo = pendentesOrdenadas[0];
                return (
                  <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏔️</span>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Estratégia Recomendada: Método Bola de Neve</h4>
                        <p className="text-xs text-zinc-400">Elimine credores rapidamente focando no menor saldo devedor primeiro.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div className="bg-[#09090b] p-4 rounded-xl border border-indigo-500/20 space-y-1">
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Alvo de Quitação Imediata</span>
                        <div className="flex justify-between items-baseline">
                          <span className="text-base font-bold text-zinc-200">{alvo.credor}</span>
                          <span className="text-lg font-black text-indigo-400">R$ {alvo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <span className="text-xs text-zinc-500 block">Vencimento original: {formatarData(alvo.vencimento)}</span>
                      </div>

                      <div className="text-xs text-zinc-400 space-y-2">
                        <p>1. 💰 Pague o valor mínimo de todas as outras contas pendentes.</p>
                        <p>2. ⚡ Aplique qualquer renda extra ou sobra disponível no alvo acima até zerar.</p>
                        <p>3. 🔄 Depois de quitar, passe para o próximo menor alvo: <strong className="text-zinc-200">{pendentesOrdenadas[1]?.credor}</strong> (R$ {pendentesOrdenadas[1]?.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).</p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

      </div>

      {/* Modal para Colar Células do Excel */}
      {mostrarModalColar && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Importação Rápida (Copiar e Colar)</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Abra sua planilha no Excel, selecione as linhas do bloco que deseja importar, copie (**Ctrl+C**), e cole na caixa abaixo (**Ctrl+V**).
              </p>
            </div>

            <textarea
              value={textoColado}
              onChange={(e) => setTextoColado(e.target.value)}
              rows="8"
              placeholder="Cole os dados aqui (Ctrl+V)..."
              className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            ></textarea>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setMostrarModalColar(false);
                  setTextoColado('');
                }}
                className="px-4 py-2 bg-[#09090b] hover:bg-zinc-800 border border-[#27272a] rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const sucesso = processarDadosColados(textoColado);
                  if (sucesso) {
                    setMostrarModalColar(false);
                    setTextoColado('');
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Confirmar Importação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Dívida */}
      {mostrarModalEditar && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>✏️</span> Editar Compromisso
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Altere as informações da dívida selecionada abaixo.
              </p>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Credor / Empresa *</label>
                <input
                  type="text"
                  name="credor"
                  value={editForm.credor}
                  onChange={handleEditChange}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="valor"
                    value={editForm.valor}
                    onChange={handleEditChange}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Vencimento *</label>
                  <input
                    type="date"
                    name="vencimento"
                    value={editForm.vencimento}
                    onChange={handleEditChange}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Categoria</label>
                  <select
                    name="categoria"
                    value={editForm.categoria}
                    onChange={handleEditChange}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    {CATEGORIAS.map(cat => (
                      <option key={cat.nome} value={cat.nome}>{cat.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Status</label>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleEditChange}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Observações (Opcional)</label>
                <textarea
                  name="observacao"
                  value={editForm.observacao}
                  onChange={handleEditChange}
                  rows="2"
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalEditar(false);
                    setEditId(null);
                  }}
                  className="px-4 py-2 bg-[#09090b] hover:bg-zinc-800 border border-[#27272a] rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Ajuda de Instalação (PWA) */}
      {mostrarModalAjudaInstalacao && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📲</span> Como baixar o aplicativo
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Você pode salvar este Organizador Financeiro como um aplicativo em seu celular ou computador para acesso rápido, sem gastar memória de abas e com funcionamento offline.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#09090b] p-3 rounded-lg border border-[#27272a]">
                <p className="font-bold text-indigo-400 mb-1">No Android (Chrome / Edge):</p>
                <p className="text-zinc-300">1. Toque no ícone de 3 pontinhos no canto superior do navegador.</p>
                <p className="text-zinc-300">2. Selecione <strong className="text-zinc-100">"Instalar aplicativo"</strong> ou <strong className="text-zinc-100">"Adicionar à tela de início"</strong>.</p>
              </div>

              <div className="bg-[#09090b] p-3 rounded-lg border border-[#27272a]">
                <p className="font-bold text-indigo-400 mb-1">No iPhone / iPad (Safari):</p>
                <p className="text-zinc-300">1. Toque no botão de <strong className="text-zinc-100">Compartilhar</strong> (quadrado com seta para cima).</p>
                <p className="text-zinc-300">2. Role o menu para baixo e selecione <strong className="text-zinc-100">"Adicionar à Tela de Início"</strong>.</p>
              </div>

              <div className="bg-[#09090b] p-3 rounded-lg border border-[#27272a]">
                <p className="font-bold text-indigo-400 mb-1">No Computador (Chrome / Edge / Opera):</p>
                <p className="text-zinc-300">1. Clique no ícone de instalação (monitor com seta para baixo ou "+") na barra de endereços do seu navegador.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalAjudaInstalacao(false)}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
