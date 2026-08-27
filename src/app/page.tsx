export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 760, margin: "64px auto", padding: 24 }}>
      <h1>Faculdade Ibrate · RD Station → Kommo</h1>
      <p>Integração privada do Formulário de Pré-matrícula.</p>
      <ul>
        <li><strong>Curitiba:</strong> Funil Curitiba</li>
        <li><strong>Chapecó, Balneário Camboriú e Joinville:</strong> Funil Santa Catarina</li>
        <li><strong>Cascavel e Londrina:</strong> Funil Interior do PR</li>
        <li><strong>Equilibra (CWB):</strong> aguardando configuração</li>
      </ul>
      <p>Campos personalizados: Curso, Unidade, Data do Curso e Formação.</p>
      <p>Agendas de cursos: a unidade é identificada automaticamente pelo nome da Landing Page.</p>
    </main>
  );
}
