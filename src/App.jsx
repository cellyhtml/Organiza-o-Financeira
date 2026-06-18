import React, { useState, useEffect } from 'react';

// Categoria das Dívidas
const CATEGORIAS = [
  'Cartão de Crédito',
  'Empréstimo',
  'Contas de Consumo (Luz/Água/Internet)',
  'Aluguel / Financiamento',
  'Saúde',
  'Outros'
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
    categoria: CATEGORIAS[0],
    observacao: ''
  });

  const [filtroStatus, setFiltroStatus] = useState('Todas');

  // Persistir dados
  useEffect(() => {
    try {
      localStorage.setItem('@financeiro:dividas', JSON.stringify(dividas));
    } catch (error) {
      console.error("Erro ao salvar no localStorage:", error);
    }
  }, [dividas]);

  // Verificar se a data já venceu
  const verificarAtraso = (vencimento, status) => {
    if (status === 'Pago') return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVencimento = new Date(vencimento + 'T00:00:00');
    return dataVencimento < hoje;
  };

  // Manipular input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Cadastrar nova dívida
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
      status: 'Pendente', // Inicializa pendente
      observacao: form.observacao
    };

    setDividas(prev => [...prev, novaDivida].sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento)));
    
    // Resetar formulário
    setForm({
      credor: '',
      valor: '',
      vencimento: '',
      categoria: CATEGORIAS[0],
      observacao: ''
    });
  };

  // Alterar Status da dívida (Pagar / Reabrir)
  const alternarStatus = (id) => {
    setDividas(prev => prev.map(divida => {
      if (divida.id === id) {
        return {
          ...divida,
          status: divida.status === 'Pago' ? 'Pendente' : 'Pago'
        };
      }
      return divida;
    }));
  };

  // Excluir Dívida
  const excluirDivida = (id) => {
    if (confirm("Tem certeza que deseja remover esta dívida?")) {
      setDividas(prev => prev.filter(d => d.id !== id));
    }
  };

  // Métricas financeiras
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

  // Função para formatar data com segurança
  const formatarData = (vencimento) => {
    if (!vencimento) return 'Sem data';
    try {
      const data = new Date(vencimento + 'T00:00:00');
      return isNaN(data.getTime()) ? 'Data inválida' : data.toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  // Filtrar lista
  const dividasFiltradas = Array.isArray(dividas) ? dividas.filter(d => {
    if (filtroStatus === 'Todas') return true;
    if (filtroStatus === 'Pagas') return d.status === 'Pago';
    if (filtroStatus === 'Pendentes') return d.status === 'Pendente' && !verificarAtraso(d.vencimento, d.status);
    if (filtroStatus === 'Atrasadas') return d.status === 'Pendente' && verificarAtraso(d.vencimento, d.status);
    return true;
  }) : [];

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#27272a] pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Organizador Financeiro</h1>
            <p className="text-zinc-400 text-sm mt-1">Gerencie, planeje e quite seus compromissos financeiros.</p>
          </div>
          <span className="bg-indigo-500/10 text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-indigo-500/20">
            Modo Local Ativo
          </span>
        </header>

        {/* Indicadores / Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a]">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total de Dívidas</p>
            <p className="text-2xl font-bold mt-2 text-zinc-100">R$ {totais.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] border-l-4 border-l-emerald-500">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Pago</p>
            <p className="text-2xl font-bold mt-2 text-emerald-400">R$ {totais.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] border-l-4 border-l-amber-500">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Pendente</p>
            <p className="text-2xl font-bold mt-2 text-amber-400">R$ {totais.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] border-l-4 border-l-rose-500">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Atrasadas / Vencidas</p>
            <p className="text-2xl font-bold mt-2 text-rose-500">R$ {totais.atrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </section>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulário (Col 1) */}
          <section className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] h-fit">
            <h2 className="text-xl font-semibold text-white mb-4">Adicionar Dívida</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Credor / Empresa *</label>
                <input
                  type="text"
                  name="credor"
                  value={form.credor}
                  onChange={handleChange}
                  placeholder="Ex: Nubank, Enel..."
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Vencimento *</label>
                  <input
                    type="date"
                    name="vencimento"
                    value={form.vencimento}
                    onChange={handleChange}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Categoria</label>
                <select
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
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
                  placeholder="Detalhes adicionais..."
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-sm transition-colors mt-2"
              >
                Cadastrar Dívida
              </button>
            </form>
          </section>

          {/* Listagem (Col 2 e 3) */}
          <section className="lg:col-span-2 space-y-4">
            
            {/* Filtros */}
            <div className="flex justify-between items-center bg-[#18181b] p-4 rounded-xl border border-[#27272a]">
              <span className="text-sm font-semibold text-zinc-300">Filtrar por:</span>
              <div className="flex gap-2">
                {['Todas', 'Pendentes', 'Pagas', 'Atrasadas'].map(filtro => (
                  <button
                    key={filtro}
                    onClick={() => setFiltroStatus(filtro)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      filtroStatus === filtro
                        ? 'bg-indigo-600 text-white'
                        : 'bg-[#09090b] text-zinc-400 hover:text-zinc-200 border border-[#27272a]'
                    }`}
                  >
                    {filtro}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista */}
            <div className="bg-[#18181b] rounded-xl border border-[#27272a] overflow-hidden">
              {dividasFiltradas.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  Nenhuma dívida encontrada para o filtro selecionado.
                </div>
              ) : (
                <div className="divide-y divide-[#27272a]">
                  {dividasFiltradas.map((divida) => {
                    const atrasada = verificarAtraso(divida.vencimento, divida.status);
                    
                    return (
                      <div key={divida.id} className="p-4 flex justify-between items-center hover:bg-zinc-900/40 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-zinc-100">{divida.credor}</h3>
                            <span className="bg-[#09090b] text-zinc-400 text-[10px] px-2 py-0.5 rounded border border-[#27272a]">
                              {divida.categoria}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">
                            Vence em: {formatarData(divida.vencimento)}
                          </p>
                          {divida.observacao && (
                            <p className="text-xs text-zinc-400 italic">"{divida.observacao}"</p>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-sm text-zinc-100">
                              R$ {divida.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded mt-1 ${
                              divida.status === 'Pago'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : atrasada
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {divida.status === 'Pago' ? 'Pago' : atrasada ? 'Atrasado' : 'Pendente'}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => alternarStatus(divida.id)}
                              className={`p-2 rounded-lg border text-xs font-semibold transition-colors ${
                                divida.status === 'Pago'
                                  ? 'bg-zinc-800 text-zinc-300 border-[#27272a] hover:bg-zinc-700'
                                  : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700'
                              }`}
                              title={divida.status === 'Pago' ? 'Marcar como Pendente' : 'Marcar como Pago'}
                            >
                              {divida.status === 'Pago' ? 'Reabrir' : 'Pagar'}
                            </button>
                            <button
                              onClick={() => excluirDivida(divida.id)}
                              className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg border border-rose-500/20 text-xs font-semibold transition-colors"
                              title="Excluir dívida"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
