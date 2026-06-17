/**
 * Script de seed pra DEMO publica.
 *
 * Popula o banco com:
 *   - 5 contadores parceiros fake (com foto, especialidade, cidade, etc)
 *   - 2 clientes fake com dados completos:
 *       a) Bruna Manicure (MEI, profissao manicure)
 *       b) Carlos Motorista (Simples Nacional Anexo III, motorista de app)
 *     Cada um com:
 *       - perfil completo (nome, profissao, regime, contador)
 *       - 3 meses de transacoes (receitas, despesas, pessoais, retiradas)
 *       - DAS pago + DAS proximo
 *       - recorrentes detectadas
 *
 * Execute: npx tsx scripts/seed-demo.ts
 *
 * Ao final imprime os IDs e URLs do relatorio publico (com QR) pra demo.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// CONTADORES FAKE
// =============================================================================

const CONTADORES = [
  {
    nome: 'Renata Almeida',
    foto: 'https://api.dicebear.com/7.x/avataaars/png?seed=renata-almeida&backgroundColor=ffd5dc',
    especialidade: 'MEI e Simples Nacional',
    cidade: 'Sao Paulo, SP',
    whatsapp: '11987654321',
    email: 'renata@contabilfacil.com.br',
    preco: 'R$ 89/mes',
    bio: 'Contadora ha 12 anos atendendo prestadores de servico. Especialista em MEI, salao de beleza e estetica. Resposta em ate 1 hora no whatsapp.',
    notaMedia: 4.9,
    notaCount: 47,
    ordem: 1,
  },
  {
    nome: 'Marcos Tanaka',
    foto: 'https://api.dicebear.com/7.x/avataaars/png?seed=marcos-tanaka&backgroundColor=c0e8f9',
    especialidade: 'Motoristas e entregadores',
    cidade: 'Rio de Janeiro, RJ',
    whatsapp: '21976543210',
    email: 'marcos@contadorapp.com.br',
    preco: 'R$ 99/mes',
    bio: 'Foco em motoristas Uber, 99, iFood e Rappi. Faco abertura de MEI gratuita pra clientes mensais. Atendo 100% online por video chamada.',
    notaMedia: 4.8,
    notaCount: 63,
    ordem: 2,
  },
  {
    nome: 'Juliana Ferreira',
    foto: 'https://api.dicebear.com/7.x/avataaars/png?seed=juliana-ferreira&backgroundColor=d1f4d3',
    especialidade: 'Profissionais autonomos',
    cidade: 'Belo Horizonte, MG',
    whatsapp: '31965432109',
    email: 'juliana@graoacontabil.com.br',
    preco: 'R$ 75/mes',
    bio: 'Atendo manicures, cabeleireiros, professores particulares e personal trainers. Faco DAS, declaracao anual e desenquadramento sem dor de cabeca.',
    notaMedia: 4.7,
    notaCount: 38,
    ordem: 3,
  },
  {
    nome: 'Pedro Vasconcelos',
    foto: 'https://api.dicebear.com/7.x/avataaars/png?seed=pedro-vasconcelos&backgroundColor=fde2a8',
    especialidade: 'Designers e devs freelancers',
    cidade: 'Florianopolis, SC',
    whatsapp: '48954321098',
    email: 'pedro@devcontador.com.br',
    preco: 'R$ 120/mes',
    bio: 'Especialista em PJ de TI: dev, designer, redator. Anexo III, V, fator R, lucro presumido. Te ajudo a escolher o regime mais barato pro seu caso.',
    notaMedia: 4.9,
    notaCount: 52,
    ordem: 4,
  },
  {
    nome: 'Camila Rodrigues',
    foto: 'https://api.dicebear.com/7.x/avataaars/png?seed=camila-rodrigues&backgroundColor=e8d5fa',
    especialidade: 'Criadores de conteudo',
    cidade: 'Curitiba, PR',
    whatsapp: '41943210987',
    email: 'camila@creatorcontabil.com.br',
    preco: 'R$ 109/mes',
    bio: 'Atendo influenciadores, youtubers, streamers e fotografos. Cuido do recolhimento de imposto sobre receita do exterior (Adsense, Twitch, etc).',
    notaMedia: 4.8,
    notaCount: 29,
    ordem: 5,
  },
];

// =============================================================================
// CLIENTES FAKE
// =============================================================================

type TxSeed = {
  diasAtras: number;
  amount: number;
  desc: string;
  contraparte?: string;
  contraparteDoc?: string;
  type: string;
  category: string;
  isDeductible?: boolean;
  isPersonal?: boolean;
  isRecurring?: boolean;
};

// ----------- Bruna Manicure - MEI -----------
const BRUNA: { user: any; transactions: TxSeed[]; das: any[] } = {
  user: {
    name: 'Bruna Salgado',
    email: 'bruna.demo@grana.app',
    profissao: 'manicure',
    regime: 'mei',
    meiAtividade: 'Manicure e pedicure (CNAE 9602-5/02)',
    meiInicio: new Date(new Date().getFullYear() - 2, 2, 15),
    contadorNome: 'Renata Almeida',
    contadorWhatsapp: '11987654321',
    contadorEmail: 'renata@contabilfacil.com.br',
  },
  transactions: [
    // Mes atual - receitas
    { diasAtras: 1, amount: 80, desc: 'Pix recebido', contraparte: 'Maria Silva Santos', type: 'receita', category: 'cliente' },
    { diasAtras: 2, amount: 120, desc: 'Pix recebido', contraparte: 'Ana Carolina Souza', type: 'receita', category: 'cliente' },
    { diasAtras: 4, amount: 80, desc: 'Pix recebido', contraparte: 'Maria Silva Santos', type: 'receita', category: 'cliente' },
    { diasAtras: 6, amount: 150, desc: 'Pix recebido', contraparte: 'Juliana Costa', type: 'receita', category: 'cliente' },
    { diasAtras: 7, amount: 80, desc: 'Pix recebido', contraparte: 'Patricia Lima', type: 'receita', category: 'cliente' },
    { diasAtras: 9, amount: 200, desc: 'Pix recebido (manicure + pedicure)', contraparte: 'Ana Carolina Souza', type: 'receita', category: 'cliente' },
    { diasAtras: 11, amount: 80, desc: 'Pix recebido', contraparte: 'Carla Mendes', type: 'receita', category: 'cliente' },
    { diasAtras: 13, amount: 120, desc: 'Pix recebido', contraparte: 'Maria Silva Santos', type: 'receita', category: 'cliente' },
    { diasAtras: 14, amount: 100, desc: 'Pix recebido', contraparte: 'Patricia Lima', type: 'receita', category: 'cliente' },
    { diasAtras: 16, amount: 150, desc: 'Pix recebido', contraparte: 'Juliana Costa', type: 'receita', category: 'cliente' },
    { diasAtras: 18, amount: 80, desc: 'Pix recebido', contraparte: 'Carla Mendes', type: 'receita', category: 'cliente' },
    { diasAtras: 20, amount: 200, desc: 'Pix recebido', contraparte: 'Maria Silva Santos', type: 'receita', category: 'cliente' },
    { diasAtras: 22, amount: 120, desc: 'Pix recebido', contraparte: 'Ana Carolina Souza', type: 'receita', category: 'cliente' },
    { diasAtras: 25, amount: 80, desc: 'Pix recebido', contraparte: 'Patricia Lima', type: 'receita', category: 'cliente' },
    { diasAtras: 27, amount: 150, desc: 'Pix recebido', contraparte: 'Juliana Costa', type: 'receita', category: 'cliente' },
    // Despesas trabalho - mes atual
    { diasAtras: 5, amount: -300, desc: 'Compra de esmaltes', contraparte: 'Beauty Color Distribuidora', type: 'despesa', category: 'produto', isDeductible: true },
    { diasAtras: 12, amount: -150, desc: 'Algodao e acetona', contraparte: 'Distribuidora ABC', type: 'despesa', category: 'produto', isDeductible: true },
    { diasAtras: 18, amount: -89, desc: 'Internet do salao', contraparte: 'Vivo Fibra', type: 'despesa', category: 'servicos', isDeductible: true, isRecurring: true },
    { diasAtras: 23, amount: -400, desc: 'Aluguel cadeira no salao', contraparte: 'Salao Tropical', type: 'despesa', category: 'aluguel', isDeductible: true, isRecurring: true },
    { diasAtras: 26, amount: -50, desc: 'Impulsionamento Instagram', contraparte: 'Meta Plataforms', type: 'despesa', category: 'marketing', isDeductible: true },
    // Pessoais - mes atual
    { diasAtras: 3, amount: -350, desc: 'Compra do mes', contraparte: 'Mercado Pao de Acucar', type: 'pessoal', category: 'alimentacao', isPersonal: true },
    { diasAtras: 8, amount: -45, desc: 'Almoco', contraparte: 'iFood', type: 'pessoal', category: 'alimentacao', isPersonal: true },
    { diasAtras: 15, amount: -120, desc: 'Remedios', contraparte: 'Drogaria Sao Paulo', type: 'pessoal', category: 'saude', isPersonal: true },
    { diasAtras: 21, amount: -200, desc: 'Conta de luz', contraparte: 'Enel SP', type: 'pessoal', category: 'casa', isPersonal: true, isRecurring: true },
    // Retirada
    { diasAtras: 28, amount: -800, desc: 'Transferencia para conta pessoal', contraparte: 'Bruna Salgado', type: 'retirada', category: 'retirada' },

    // Mes -1 (similar volume, ~3500 receita)
    { diasAtras: 31, amount: 80, desc: 'Pix recebido', contraparte: 'Maria Silva Santos', type: 'receita', category: 'cliente' },
    { diasAtras: 33, amount: 120, desc: 'Pix recebido', contraparte: 'Ana Carolina Souza', type: 'receita', category: 'cliente' },
    { diasAtras: 35, amount: 150, desc: 'Pix recebido', contraparte: 'Juliana Costa', type: 'receita', category: 'cliente' },
    { diasAtras: 37, amount: 80, desc: 'Pix recebido', contraparte: 'Patricia Lima', type: 'receita', category: 'cliente' },
    { diasAtras: 39, amount: 200, desc: 'Pix recebido', contraparte: 'Carla Mendes', type: 'receita', category: 'cliente' },
    { diasAtras: 41, amount: 80, desc: 'Pix recebido', contraparte: 'Maria Silva Santos', type: 'receita', category: 'cliente' },
    { diasAtras: 44, amount: 150, desc: 'Pix recebido', contraparte: 'Ana Carolina Souza', type: 'receita', category: 'cliente' },
    { diasAtras: 46, amount: 100, desc: 'Pix recebido', contraparte: 'Patricia Lima', type: 'receita', category: 'cliente' },
    { diasAtras: 48, amount: 80, desc: 'Pix recebido', contraparte: 'Carla Mendes', type: 'receita', category: 'cliente' },
    { diasAtras: 50, amount: 120, desc: 'Pix recebido', contraparte: 'Juliana Costa', type: 'receita', category: 'cliente' },
    { diasAtras: 53, amount: 200, desc: 'Pix recebido', contraparte: 'Maria Silva Santos', type: 'receita', category: 'cliente' },
    { diasAtras: 55, amount: 80, desc: 'Pix recebido', contraparte: 'Patricia Lima', type: 'receita', category: 'cliente' },
    { diasAtras: 57, amount: 150, desc: 'Pix recebido', contraparte: 'Ana Carolina Souza', type: 'receita', category: 'cliente' },
    // Despesas mes -1
    { diasAtras: 36, amount: -250, desc: 'Esmaltes e bases', contraparte: 'Beauty Color Distribuidora', type: 'despesa', category: 'produto', isDeductible: true },
    { diasAtras: 42, amount: -89, desc: 'Internet do salao', contraparte: 'Vivo Fibra', type: 'despesa', category: 'servicos', isDeductible: true, isRecurring: true },
    { diasAtras: 49, amount: -400, desc: 'Aluguel cadeira no salao', contraparte: 'Salao Tropical', type: 'despesa', category: 'aluguel', isDeductible: true, isRecurring: true },
    { diasAtras: 51, amount: -200, desc: 'Conta de luz', contraparte: 'Enel SP', type: 'pessoal', category: 'casa', isPersonal: true, isRecurring: true },
    { diasAtras: 58, amount: -700, desc: 'Transferencia para conta pessoal', contraparte: 'Bruna Salgado', type: 'retirada', category: 'retirada' },

    // Mes -2
    { diasAtras: 62, amount: 80, desc: 'Pix recebido', contraparte: 'Maria Silva Santos', type: 'receita', category: 'cliente' },
    { diasAtras: 64, amount: 120, desc: 'Pix recebido', contraparte: 'Ana Carolina Souza', type: 'receita', category: 'cliente' },
    { diasAtras: 66, amount: 150, desc: 'Pix recebido', contraparte: 'Juliana Costa', type: 'receita', category: 'cliente' },
    { diasAtras: 68, amount: 80, desc: 'Pix recebido', contraparte: 'Patricia Lima', type: 'receita', category: 'cliente' },
    { diasAtras: 70, amount: 100, desc: 'Pix recebido', contraparte: 'Carla Mendes', type: 'receita', category: 'cliente' },
    { diasAtras: 72, amount: 80, desc: 'Pix recebido', contraparte: 'Maria Silva Santos', type: 'receita', category: 'cliente' },
    { diasAtras: 75, amount: 200, desc: 'Pix recebido', contraparte: 'Ana Carolina Souza', type: 'receita', category: 'cliente' },
    { diasAtras: 77, amount: 80, desc: 'Pix recebido', contraparte: 'Patricia Lima', type: 'receita', category: 'cliente' },
    { diasAtras: 80, amount: 150, desc: 'Pix recebido', contraparte: 'Juliana Costa', type: 'receita', category: 'cliente' },
    { diasAtras: 83, amount: 120, desc: 'Pix recebido', contraparte: 'Carla Mendes', type: 'receita', category: 'cliente' },
    { diasAtras: 85, amount: 80, desc: 'Pix recebido', contraparte: 'Maria Silva Santos', type: 'receita', category: 'cliente' },
    { diasAtras: 88, amount: 200, desc: 'Pix recebido', contraparte: 'Ana Carolina Souza', type: 'receita', category: 'cliente' },
    // Despesas mes -2
    { diasAtras: 67, amount: -180, desc: 'Esmaltes', contraparte: 'Beauty Color Distribuidora', type: 'despesa', category: 'produto', isDeductible: true },
    { diasAtras: 73, amount: -89, desc: 'Internet do salao', contraparte: 'Vivo Fibra', type: 'despesa', category: 'servicos', isDeductible: true, isRecurring: true },
    { diasAtras: 79, amount: -400, desc: 'Aluguel cadeira no salao', contraparte: 'Salao Tropical', type: 'despesa', category: 'aluguel', isDeductible: true, isRecurring: true },
    { diasAtras: 84, amount: -200, desc: 'Conta de luz', contraparte: 'Enel SP', type: 'pessoal', category: 'casa', isPersonal: true, isRecurring: true },
  ],
  das: [
    // DAS pago do mes anterior
    { mesesAtras: 1, value: 71.6, paid: true },
    // DAS proximo (deste mes)
    { mesesAtras: 0, value: 71.6, paid: false },
  ],
};

// ----------- Carlos Motorista de App - Simples Nacional Anexo III -----------
const CARLOS: { user: any; transactions: TxSeed[]; das: any[] } = {
  user: {
    name: 'Carlos Eduardo Pereira',
    email: 'carlos.demo@grana.app',
    profissao: 'motorista',
    regime: 'simples',
    simplesAnexo: 'III',
    simplesInicio: new Date(new Date().getFullYear() - 1, 5, 1),
    contadorNome: 'Marcos Tanaka',
    contadorWhatsapp: '21976543210',
    contadorEmail: 'marcos@contadorapp.com.br',
  },
  transactions: [
    // Mes atual - receitas (uber, 99, ifood)
    { diasAtras: 1, amount: 220, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 2, amount: 180, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 3, amount: 145, desc: 'Repasse iFood entregas', contraparte: 'iFood Servicos', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 6, amount: 280, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 8, amount: 165, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 9, amount: 130, desc: 'Repasse iFood entregas', contraparte: 'iFood Servicos', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 13, amount: 310, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 15, amount: 195, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 16, amount: 155, desc: 'Repasse iFood entregas', contraparte: 'iFood Servicos', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 20, amount: 290, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 22, amount: 175, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 23, amount: 140, desc: 'Repasse iFood entregas', contraparte: 'iFood Servicos', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 27, amount: 305, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    // Despesas trabalho
    { diasAtras: 4, amount: -180, desc: 'Combustivel', contraparte: 'Posto Shell', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 7, amount: -200, desc: 'Combustivel', contraparte: 'Posto Ipiranga', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 11, amount: -190, desc: 'Combustivel', contraparte: 'Posto Shell', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 14, amount: -150, desc: 'Lavagem do carro', contraparte: 'Lava Rapido Express', type: 'despesa', category: 'manutencao', isDeductible: true },
    { diasAtras: 17, amount: -210, desc: 'Combustivel', contraparte: 'Posto BR', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 21, amount: -180, desc: 'Combustivel', contraparte: 'Posto Shell', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 24, amount: -350, desc: 'Manutencao - troca de oleo', contraparte: 'Mecanica Sao Jorge', type: 'despesa', category: 'manutencao', isDeductible: true },
    { diasAtras: 26, amount: -195, desc: 'Combustivel', contraparte: 'Posto Ipiranga', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 28, amount: -89, desc: 'Plano de celular', contraparte: 'Vivo Pos', type: 'despesa', category: 'servicos', isDeductible: true, isRecurring: true },
    // Pessoais
    { diasAtras: 5, amount: -420, desc: 'Compra do mes', contraparte: 'Atacadao', type: 'pessoal', category: 'alimentacao', isPersonal: true },
    { diasAtras: 10, amount: -130, desc: 'Farmacia', contraparte: 'Pague Menos', type: 'pessoal', category: 'saude', isPersonal: true },
    { diasAtras: 18, amount: -250, desc: 'Conta de luz', contraparte: 'Light', type: 'pessoal', category: 'casa', isPersonal: true, isRecurring: true },
    { diasAtras: 25, amount: -80, desc: 'Conta de agua', contraparte: 'Cedae', type: 'pessoal', category: 'casa', isPersonal: true, isRecurring: true },

    // Mes -1
    { diasAtras: 31, amount: 240, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 33, amount: 170, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 34, amount: 150, desc: 'Repasse iFood entregas', contraparte: 'iFood Servicos', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 38, amount: 295, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 41, amount: 185, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 45, amount: 320, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 47, amount: 200, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 48, amount: 160, desc: 'Repasse iFood entregas', contraparte: 'iFood Servicos', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 52, amount: 285, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 54, amount: 175, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 59, amount: 305, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    // Despesas mes -1
    { diasAtras: 36, amount: -190, desc: 'Combustivel', contraparte: 'Posto Shell', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 40, amount: -210, desc: 'Combustivel', contraparte: 'Posto Ipiranga', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 43, amount: -180, desc: 'Combustivel', contraparte: 'Posto BR', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 46, amount: -89, desc: 'Plano de celular', contraparte: 'Vivo Pos', type: 'despesa', category: 'servicos', isDeductible: true, isRecurring: true },
    { diasAtras: 50, amount: -200, desc: 'Combustivel', contraparte: 'Posto Shell', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 56, amount: -250, desc: 'Conta de luz', contraparte: 'Light', type: 'pessoal', category: 'casa', isPersonal: true, isRecurring: true },

    // Mes -2
    { diasAtras: 63, amount: 235, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 65, amount: 180, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 67, amount: 290, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 70, amount: 195, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 73, amount: 145, desc: 'Repasse iFood entregas', contraparte: 'iFood Servicos', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 76, amount: 305, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 79, amount: 175, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 82, amount: 280, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 85, amount: 165, desc: 'Repasse 99 - semana', contraparte: '99 Tecnologia', type: 'receita', category: 'cliente', isRecurring: true },
    { diasAtras: 88, amount: 295, desc: 'Repasse Uber - semana', contraparte: 'Uber do Brasil', type: 'receita', category: 'cliente', isRecurring: true },
    // Despesas mes -2
    { diasAtras: 64, amount: -195, desc: 'Combustivel', contraparte: 'Posto Shell', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 71, amount: -185, desc: 'Combustivel', contraparte: 'Posto Ipiranga', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 77, amount: -220, desc: 'Combustivel', contraparte: 'Posto BR', type: 'despesa', category: 'combustivel', isDeductible: true },
    { diasAtras: 80, amount: -89, desc: 'Plano de celular', contraparte: 'Vivo Pos', type: 'despesa', category: 'servicos', isDeductible: true, isRecurring: true },
    { diasAtras: 86, amount: -250, desc: 'Conta de luz', contraparte: 'Light', type: 'pessoal', category: 'casa', isPersonal: true, isRecurring: true },
  ],
  das: [
    // Simples Nacional - DAS pago mes -1, proximo deste mes
    { mesesAtras: 1, value: 245.30, paid: true, regime: 'simples', aliquota: 6 },
    { mesesAtras: 0, value: 268.50, paid: false, regime: 'simples', aliquota: 6 },
  ],
};

// =============================================================================
// EXECUCAO
// =============================================================================

async function main() {
  console.log('=== SEED DEMO ===\n');

  // 1) Limpa users demo antigos (cascade derruba transacoes, das, etc)
  console.log('Limpando demos anteriores...');
  await prisma.user.deleteMany({
    where: { email: { in: ['bruna.demo@grana.app', 'carlos.demo@grana.app'] } },
  });

  // 2) Limpa contadores fake antigos pra evitar duplicar
  console.log('Limpando contadores demo anteriores...');
  await prisma.contadorParceiro.deleteMany({
    where: { email: { in: CONTADORES.map((c) => c.email) } },
  });

  // 3) Cria contadores
  console.log('\nCriando 5 contadores fake...');
  for (const c of CONTADORES) {
    const created = await prisma.contadorParceiro.create({ data: c });
    console.log(`  - ${created.nome} (${created.cidade}) - id: ${created.id}`);
  }

  // 4) Cria clientes fake
  for (const seed of [BRUNA, CARLOS]) {
    const u = await prisma.user.create({ data: seed.user });
    console.log(`\nCriando cliente: ${u.name} (${u.profissao}) - id: ${u.id}`);

    // Transacoes
    for (const tx of seed.transactions) {
      const date = new Date();
      date.setDate(date.getDate() - tx.diasAtras);
      date.setHours(10 + (tx.diasAtras % 8), 30, 0, 0);

      await prisma.transaction.create({
        data: {
          userId: u.id,
          date,
          amount: tx.amount,
          description: tx.desc,
          contraparte: tx.contraparte ?? null,
          contraparteDoc: tx.contraparteDoc ?? null,
          type: tx.type,
          category: tx.category,
          isDeductible: tx.isDeductible ?? false,
          isPersonal: tx.isPersonal ?? false,
          isRecurring: tx.isRecurring ?? false,
          source: 'manual_demo',
          userConfirmed: true,
          aiSuggested: false,
        },
      });
    }
    console.log(`  - ${seed.transactions.length} transacoes inseridas`);

    // DAS
    for (const d of seed.das) {
      const due = new Date();
      due.setMonth(due.getMonth() - d.mesesAtras);
      due.setDate(20);
      const month = due.getMonth() + 1;
      const year = due.getFullYear();
      const paidAt = d.paid ? new Date(due.getTime() - 2 * 24 * 60 * 60 * 1000) : null;

      await prisma.dASPayment.create({
        data: {
          userId: u.id,
          month,
          year,
          value: d.value,
          dueDate: due,
          paidAt,
          regime: d.regime ?? 'mei',
          aliquota: d.aliquota ?? null,
        },
      });
    }
    console.log(`  - ${seed.das.length} DAS criados`);
  }

  // 5) Imprime resumo + URLs
  const bruna = await prisma.user.findUnique({ where: { email: 'bruna.demo@grana.app' } });
  const carlos = await prisma.user.findUnique({ where: { email: 'carlos.demo@grana.app' } });

  const baseUrl = process.env.NEXTAUTH_URL || 'https://grana-app.netlify.app';

  console.log('\n=== PRONTO ===\n');
  console.log('Acessar como cliente (cole no devtools > cookies > grana_uid):');
  if (bruna) console.log(`  Bruna (manicure MEI):     ${bruna.id}`);
  if (carlos) console.log(`  Carlos (motorista PJ):    ${carlos.id}`);
  console.log('\nLink publico do relatorio (compartilhavel via QR):');
  if (bruna) console.log(`  ${baseUrl}/relatorio-publico/${bruna.id}`);
  if (carlos) console.log(`  ${baseUrl}/relatorio-publico/${carlos.id}`);
  console.log('\nContadores criados sao listados em /app/parceiros');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
